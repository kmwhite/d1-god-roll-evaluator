/**
 * server.js — D1 God Roll Evaluator web server
 *
 * Routes:
 *   GET  /                → serve public/index.html
 *   GET  /auth/login      → redirect to Bungie OAuth
 *   GET  /callback        → exchange code for token, store in session
 *   GET  /auth/status     → { authenticated: bool, platform?, displayName? }
 *   POST /auth/logout     → clear session
 *   GET  /api/inventory   → run full evaluation pipeline, return JSON
 *
 * Required env vars:
 *   D1_GOD_ROLL_EVALUATOR_PLATFORM      — xbox | psn | pc
 *   D1_GOD_ROLL_EVALUATOR_CLIENT_ID     — Bungie.net OAuth client ID
 *   D1_GOD_ROLL_EVALUATOR_CLIENT_SECRET — Bungie.net OAuth client secret
 *   D1_GOD_ROLL_EVALUATOR_API_KEY       — Bungie.net API key
 *
 * Optional:
 *   D1_GOD_ROLL_EVALUATOR_PORT          — port to listen on (default 3000)
 *   D1_GOD_ROLL_EVALUATOR_SESSION_SECRET — session signing secret (default random)
 *   D1_GOD_ROLL_EVALUATOR_DIM_API_KEY   — DIM Sync API key
 */

import express        from 'express';
import session        from 'express-session';
import FileStore      from 'session-file-store';
import { fileURLToPath } from 'url';
import path           from 'path';
import { mkdirSync, existsSync, readFileSync } from 'fs';

// Load .env file if present (Gandi deployment or local dev)
const __dirname_env = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname_env, '..', '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = val;
  }
  console.log('[server] Loaded .env');
}

import {
  resolveMembershipType,
  getMembershipId,
  buildManifestData,
  getCharacters,
  getCharacterWeapons,
  getVaultWeapons,
  getCharacterArmor,
  getVaultArmor,
  extractPerkNames,
} from './bungie.js';

import { evaluateWeapon } from './evaluate.js';
import { PVP, PVE }                           from './god-rolls.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PLATFORM       = process.env.D1_GOD_ROLL_EVALUATOR_PLATFORM;
const CLIENT_ID      = process.env.D1_GOD_ROLL_EVALUATOR_CLIENT_ID;
const CLIENT_SECRET  = process.env.D1_GOD_ROLL_EVALUATOR_CLIENT_SECRET;
const API_KEY        = process.env.D1_GOD_ROLL_EVALUATOR_API_KEY;
// Gandi injects PORT; our custom var is a local dev fallback
const PORT = parseInt(process.env.PORT ?? process.env.D1_GOD_ROLL_EVALUATOR_PORT ?? '3000', 10);
const SESSION_SECRET = process.env.D1_GOD_ROLL_EVALUATOR_SESSION_SECRET;
if (!SESSION_SECRET) {
  console.error('[server] Missing required env var: D1_GOD_ROLL_EVALUATOR_SESSION_SECRET');
  console.error('         Generate one with: openssl rand -hex 32');
  process.exit(1);
}
const REDIRECT_URI   = process.env.D1_GOD_ROLL_EVALUATOR_REDIRECT_URI ?? 'https://d1armory.net/callback';

const REQUIRED = { PLATFORM, CLIENT_ID, CLIENT_SECRET, API_KEY };
for (const [k, v] of Object.entries(REQUIRED)) {
  if (!v) {
    console.error(`[server] Missing required env var: D1_GOD_ROLL_EVALUATOR_${k}`);
    process.exit(1);
  }
}

const membershipType = resolveMembershipType(PLATFORM);

// ---------------------------------------------------------------------------
// Evaluation helpers (identical logic to old index.js)
// ---------------------------------------------------------------------------

const TIER_NAMES   = { 5: 'Legendary', 6: 'Exotic', 4: 'Rare', 3: 'Uncommon', 2: 'Common' };
const DAMAGE_NAMES = { 0: 'Kinetic', 1: 'Kinetic', 2: 'Arc', 3: 'Solar', 4: 'Void' };
const RESULT_RANK  = { 'GOD ROLL': 0, 'Close': 1, 'No': 2, 'Curated Roll': 3, 'Error': 4, '-': 5 };

const ARMOR_SLOT_NAMES = {
  3448274439: 'Helmet',
  3551918588: 'Gloves',
  14239492:   'Chest',
  20886954:   'Legs',
  1585787867: 'Class Item',
  434908299:  'Artifact',
  4023194814: 'Ghost',
};
const ARMOR_CLASS_NAMES = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
const ARMOR_BUCKET_SET = new Set(Object.keys(ARMOR_SLOT_NAMES).map(Number));

// Observed maximum sum-of-two-stats per armor slot (reference only — not used in quality calc).
// Source: https://l0r3.dev/page/Destiny-1-Maximum-Possible-Armor-Stats
const ARMOR_MAX = {
  'Helmet': 111, 'Gloves': 99, 'Chest': 147, 'Legs': 135,
  'Class Item': 60, 'Ghost': 60, 'Artifact': 131,
};

// Per-stat maximum at 335 light (split point for quality calculation).
// Helmet/Gauntlets: bungie reports 48/43, but 46/41 observed in practice.
// Source: https://github.com/DestinyItemManager/DIM/blob/b58d4f1a/src/app/inventory/store/armor-quality.ts
const ARMOR_SPLIT = {
  'Helmet': 46, 'Gloves': 41, 'Chest': 61, 'Legs': 56,
  'Class Item': 25, 'Ghost': 25, 'Artifact': 38,
};

// Scaling curve: maps a light level to its upgrade multiplier value.
function fitValue(light) {
  if (light > 300) return 0.2546 * light - 23.825;
  if (light > 200) return 0.1801 * light - 1.4612;
  return -1;
}

// Scale a base stat to its equivalent value on a 335-light item.
function scaleStat(base, light) {
  const clamped = Math.min(light, 335);
  const ratio   = fitValue(335) / fitValue(clamped);
  return {
    min: Math.floor(base * ratio),
    max: Math.floor((base + 1) * ratio),
  };
}

// Quality as a percentage of the theoretical best roll for the slot at 335 light.
// Mirrors the DIM getQualityRating algorithm.
// light: item defense/light level (primaryStat.value); defaults to 335 if absent.
function calcArmorQuality(intellect, discipline, strength, light, slot) {
  const split = ARMOR_SPLIT[slot];
  if (!split) return null;
  const effectiveLight = light ?? 335;
  if (effectiveLight < 280) return null;

  const slotMax = split * 2;
  let totalMin  = 0;
  let pure      = 0;

  for (const base of [intellect, discipline, strength]) {
    if (!base) continue;
    const scaled = scaleStat(base, effectiveLight);
    pure      = scaled.min;
    totalMin += scaled.min;
  }

  // When only one stat is non-zero, halve (item not yet spec'd into a second stat).
  if (pure === totalMin) totalMin = Math.floor(totalMin / 2);

  const quality = Math.round((totalMin / slotMax) * 100);
  // Cap at 100 for non-Artifact slots; Artifacts can legitimately exceed 100.
  return slot === 'Artifact' ? quality : Math.min(100, quality);
}

function armorRank(quality) {
  if (quality === null || quality === undefined) return '—';
  if (quality >= 100) return 'S';
  if (quality >= 95)  return 'A';
  if (quality >= 90)  return 'B';
  if (quality >= 80)  return 'C';
  if (quality >= 70)  return 'D';
  return 'F';
}

function extractStats(stub, { intellect: ih, discipline: dh, strength: sh }) {
  const arr  = Array.isArray(stub.stats) ? stub.stats : Object.values(stub.stats ?? {});
  const find = hash => arr.find(s => s.statHash === hash);
  return {
    intellect:  find(ih)?.value ?? 0,
    discipline: find(dh)?.value ?? 0,
    strength:   find(sh)?.value ?? 0,
  };
}

function makeArmorRow(stub, itemData, location, characterId, armorStatHashes) {
  const slot = ARMOR_SLOT_NAMES[itemData.bucketTypeHash] ?? 'Unknown';
  const { intellect, discipline, strength } = extractStats(stub, armorStatHashes);
  const light   = stub.primaryStat?.value ?? null;
  const quality = calcArmorQuality(intellect, discipline, strength, light, slot);
  const rank    = armorRank(quality);
  const statsList = [
    { name: 'Intellect',  value: intellect,  max: intellect  },
    { name: 'Discipline', value: discipline, max: discipline },
    { name: 'Strength',   value: strength,   max: strength   },
  ].filter(s => s.value > 0);
  return {
    itemType:    'armor',
    instanceId:  stub.itemInstanceId,
    characterId: characterId ?? null,
    locked:      stub.locked ?? false,
    className:   ARMOR_CLASS_NAMES[itemData.classType] ?? null,
    icon:        itemData.icon ? `https://www.bungie.net${itemData.icon}` : null,
    name:        itemData.name,
    type:        slot,
    rarity:      TIER_NAMES[itemData.tierType] ?? `Tier${itemData.tierType}`,
    light:       stub.primaryStat?.value ?? null,
    intellect, discipline, strength,
    evaluation:  { rank, quality },
    stats:       statsList,
    perks:       [],
    location,
  };
}

function mapGodRollToGridColumns(rollDef, byColumn) {
  const mapping = {};
  for (const colKey of ['col1', 'col2', 'col3', 'col4']) {
    const want = (rollDef?.[colKey] ?? []).map((w) => w.toLowerCase().trim());
    let found = null;
    for (const [gridCol, colPerks] of Object.entries(byColumn)) {
      if (want.some((w) => colPerks.map(p => p.toLowerCase().trim()).includes(w))) {
        found = parseInt(gridCol, 10);
        break;
      }
    }
    mapping[colKey] = found;
  }
  return mapping;
}

function colCell(want, byColumn, all, gridColIndex, allPossible) {
  if (!want || want.length === 0) return '—';
  const normAll = (all ?? []).map(p => p.toLowerCase().trim());
  const hit = want.find(w => normAll.includes(w.toLowerCase().trim()));
  if (hit) return `✓ ${hit}`;

  const wantStr = '[' + want.map(w => `'${w}'`).join(', ') + ']';
  if (gridColIndex === null) {
    const isRollable = want.some(w =>
      [...(allPossible ?? [])].map(p => p.toLowerCase().trim()).includes(w.toLowerCase().trim())
    );
    return `✗ want: ${wantStr}; has: ${isRollable ? '(not rolled)' : '(not rollable on this weapon)'}`;
  }
  const hasPerks = byColumn[gridColIndex] ?? [];
  const hasStr = hasPerks.length > 0
    ? '[' + hasPerks.map(p => `'${p}'`).join(', ') + ']'
    : '(not rolled)';
  return `✗ want: ${wantStr}; has: ${hasStr}`;
}

function buildAllPossiblePerks(stub, talentGridMap) {
  const gridNodes = talentGridMap.get(stub.talentGridHash) ?? [];
  const all = new Set();
  for (const node of gridNodes) {
    for (const step of node.steps ?? []) {
      const name = step.nodeStepName?.trim();
      if (name && name !== 'undefined') all.add(name);
    }
  }
  return all;
}

function hasDefinitionError(rollDef, allPossiblePerks) {
  if (!rollDef) return false;
  for (const colKey of ['col1', 'col2', 'col3', 'col4']) {
    const want = rollDef[colKey] ?? [];
    if (!want.length) continue;
    const normAll = [...allPossiblePerks].map(p => p.toLowerCase().trim());
    if (!want.some(w => normAll.includes(w.toLowerCase().trim()))) return true;
  }
  return false;
}

function modeResult(status, isError) {
  if (isError)                    return '⚠ Error';
  if (status === 'god_roll')      return '★ GOD ROLL';
  if (status === 'close')         return '~ Close';
  if (status === 'not_god_roll')  return '✗ No';
  return '? —';
}

function buildModeEval(rollEntry, evalResult, byColumn, all, allPossible, curated) {
  const rollDef = Array.isArray(rollEntry)
    ? (rollEntry.find(d => d.source === evalResult?.source) ?? rollEntry[0])
    : rollEntry;
  const gridMap    = mapGodRollToGridColumns(rollDef, byColumn);
  const w          = col => rollDef ? (rollDef[col] ?? []) : null;
  const isError    = hasDefinitionError(rollDef, allPossible);
  const result     = curated ? '⚙ Curated Roll' : modeResult(evalResult?.status, isError);
  const resultRank = curated ? 4 : (RESULT_RANK[result] ?? 99);
  return {
    result,
    source:     curated ? null : (evalResult?.source ?? null),
    col1:       curated ? '—' : colCell(w('col1'), byColumn, all, gridMap['col1'], allPossible),
    col2:       curated ? '—' : colCell(w('col2'), byColumn, all, gridMap['col2'], allPossible),
    col3:       curated ? '—' : colCell(w('col3'), byColumn, all, gridMap['col3'], allPossible),
    col4:       curated ? '—' : colCell(w('col4'), byColumn, all, gridMap['col4'], allPossible),
    resultRank,
  };
}

function buildModalData(stub, itemData, talentGridMap) {
  const BUNGIE_ROOT  = 'https://www.bungie.net';
  const MISSING_ICON = '/img/misc/missing_icon.png';

  const STAT_NAMES = {
    4284893193: 'Rate of Fire', 4043523819: 'Impact',    1240592695: 'Range',
    155624089:  'Stability',    4188031367: 'Reload',     3871231066: 'Magazine',
    2715839340: 'Recoil',       1345609583: 'Aim Assist', 943549884:  'Equip Speed',
    2837207746: 'Speed',        2762071195: 'Efficiency', 209426660:  'Defense',
    925767036:  'Energy',       2961396640: 'Charge Rate',2523465841: 'Velocity',
  };
  const STAT_ORDER = [
    'Rate of Fire','Impact','Range','Stability','Reload','Magazine',
    'Aim Assist','Recoil','Equip Speed','Speed','Efficiency','Defense',
    'Energy','Charge Rate','Velocity',
  ];

  const stats = Object.values(stub.stats ?? {})
    .filter(s => STAT_NAMES[s.statHash])
    .map(s => ({ name: STAT_NAMES[s.statHash], value: s.value, max: s.maximumValue ?? 100 }))
    .sort((a, b) => STAT_ORDER.indexOf(a.name) - STAT_ORDER.indexOf(b.name));

  const gridNodes = talentGridMap.get(stub.talentGridHash) ?? [];
  const stubNodes = stub.nodes ?? [];
  const colMap = new Map();

  for (let i = 0; i < gridNodes.length; i++) {
    const gn = gridNodes[i];
    const sn = stubNodes[i] ?? {};
    const col = gn.column ?? -1;
    if (col <= 0) continue;
    if (!colMap.has(col)) colMap.set(col, []);

    const rolledStepIdx = sn.stepIndex ?? 0;
    const steps = (gn.steps ?? []).map((step, si) => ({
      name:     step.nodeStepName?.trim() ?? '',
      icon:     (step.icon && step.icon !== MISSING_ICON) ? `${BUNGIE_ROOT}${step.icon}` : null,
      isRolled: si === rolledStepIdx,
      isActive: si === rolledStepIdx && (sn.isActivated ?? false),
      desc:     step.nodeStepDescription?.trim() ?? '',
    })).filter(s => s.name && s.name !== 'undefined');

    if (steps.length === 0) continue;
    colMap.get(col).push({
      nodeIndex: i, exclusiveWith: gn.exlusiveWithNodes ?? [],
      rolledName: (gn.steps ?? [])[rolledStepIdx]?.nodeStepName?.trim() ?? '', steps,
    });
  }

  const columns = [];
  for (const [colIdx, nodes] of [...colMap.entries()].sort(([a], [b]) => a - b)) {
    const assigned = new Set();
    const slotGroups = [];
    for (const node of nodes) {
      if (assigned.has(node.nodeIndex)) continue;
      const group = [node];
      assigned.add(node.nodeIndex);
      for (const peerId of node.exclusiveWith) {
        const peer = nodes.find(n => n.nodeIndex === peerId);
        if (peer && !assigned.has(peer.nodeIndex)) { group.push(peer); assigned.add(peer.nodeIndex); }
      }
      slotGroups.push(group);
    }
    for (const group of slotGroups) {
      const seen = new Set();
      const allOptions = [];
      for (const opt of group.flatMap(n => n.steps)) {
        if (!seen.has(opt.name)) { seen.add(opt.name); allOptions.push(opt); }
      }
      if (!allOptions.length) continue;
      columns.push({ colIndex: colIdx, options: allOptions, rolledName: allOptions.find(s => s.isRolled)?.name ?? '' });
    }
  }

  return { stats, perks: columns };
}

/**
 * Run the full evaluation pipeline for the given Bungie token.
 * Returns the htmlRows array ready for the browser to render.
 */
async function runEvaluation(bungieToken, bungieNetMembershipId, membershipTypeOverride) {
  const mt = membershipTypeOverride ?? membershipType;
  const { weaponHashes, itemDataMap, talentGridMap } = await buildManifestData(API_KEY);
  const platformMembershipId = await getMembershipId(mt, API_KEY, bungieToken, bungieNetMembershipId);
  const characters    = await getCharacters(mt, platformMembershipId, API_KEY, bungieToken);
  const characterIds  = characters.map(c => c.characterId);

  const weaponStubs = [];
  for (const charId of characterIds) {
    const weapons = await getCharacterWeapons(mt, platformMembershipId, charId, API_KEY, bungieToken);
    weaponStubs.push(...weapons);
  }
  const vaultWeapons = await getVaultWeapons(mt, platformMembershipId, weaponHashes, API_KEY, bungieToken);
  weaponStubs.push(...vaultWeapons);

  const instanced = weaponStubs.filter(s => s.itemInstanceId && weaponHashes.has(s.itemHash));
  const results = [];

  for (const stub of instanced) {
    const itemData     = itemDataMap.get(stub.itemHash);
    const name         = itemData?.name ?? `Unknown (hash:${stub.itemHash})`;
    const itemTypeName = itemData?.itemTypeName ?? '';
    const perks        = extractPerkNames(stub, null, talentGridMap);
    const { byColumn, all } = perks;
    const allPossible  = buildAllPossiblePerks(stub, talentGridMap);
    const evaluation   = evaluateWeapon(name, all);
    const tierType     = itemData?.tierType ?? 0;
    const icon         = itemData?.icon ?? null;
    const isCurated    = itemData?.isCurated ?? false;
    const damageType   = stub.damageType ?? 0;
    const light        = stub.primaryStat?.value ?? stub.itemLevel ?? null;
    const modalData    = buildModalData(stub, itemData, talentGridMap);

    const SLOT_NAMES = { 1498876634: 'Primary', 2465295065: 'Special', 953998645: 'Heavy' };
    const slot         = SLOT_NAMES[stub.bucketHash] ?? 'Unknown';

    results.push({
      instanceId:     stub.itemInstanceId,
      itemHash:       stub.itemHash,
      characterId:    stub.characterId ?? null,
      transferStatus: stub.transferStatus ?? 0,
      locked:         stub.locked ?? false,
      location:       stub.location ?? 1,
      slot,
      name, itemTypeName, tierType, damageType, icon, isCurated, light,
      byColumn, all, allPossible, evaluation, modalData,
    });
  }

  // Sort: best result first, then alpha
  const bestOrder = r => {
    const s = [r.evaluation.pvp.status, r.evaluation.pve.status];
    if (s.includes('god_roll'))     return 0;
    if (s.includes('close'))        return 1;
    if (s.includes('not_god_roll')) return 2;
    return 3;
  };
  results.sort((a, b) => bestOrder(a) - bestOrder(b) || a.name.localeCompare(b.name));

  // Build one normalized item per weapon with embedded per-mode evaluation
  const items = [];
  for (const r of results) {
    const { stats, perks } = r.modalData;
    items.push({
      itemType:       'weapon',
      instanceId:     r.instanceId,
      itemHash:       r.itemHash,
      characterId:    r.characterId,
      transferStatus: r.transferStatus,
      locked:         r.locked,
      location:       r.location,
      name:           r.name,
      type:           r.itemTypeName,
      slot:           r.slot,
      icon:           r.icon ? `https://www.bungie.net${r.icon}` : null,
      rarity:         TIER_NAMES[r.tierType]    ?? `Tier${r.tierType}`,
      damage:         DAMAGE_NAMES[r.damageType] ?? '—',
      damageRaw:      r.damageType,
      light:          r.light ?? null,
      evaluation: {
        pvp: buildModeEval(PVP[r.name], r.evaluation.pvp, r.byColumn, r.all, r.allPossible, r.isCurated),
        pve: buildModeEval(PVE[r.name], r.evaluation.pve, r.byColumn, r.all, r.allPossible, r.isCurated),
      },
      stats,
      perks,
    });
  }

  return { items, characters, characterIds, platformMembershipId };
}

async function runArmorEvaluation(bungieToken, bungieNetMembershipId, membershipTypeOverride) {
  const mt = membershipTypeOverride ?? membershipType;
  const { armorHashes, armorDataMap, armorStatHashes } = await buildManifestData(API_KEY);
  const platformMembershipId = await getMembershipId(mt, API_KEY, bungieToken, bungieNetMembershipId);
  const characters = await getCharacters(mt, platformMembershipId, API_KEY, bungieToken);

  const armorRows = [];

  for (const char of characters) {
    const stubs = await getCharacterArmor(mt, platformMembershipId, char.characterId, API_KEY, bungieToken);
    for (const stub of stubs) {
      const itemData = armorDataMap.get(stub.itemHash);
      if (!itemData) continue;
      armorRows.push(makeArmorRow(stub, itemData, 'character', char.characterId, armorStatHashes));
    }
  }

  const vaultStubs = await getVaultArmor(mt, platformMembershipId, armorHashes, API_KEY, bungieToken);
  for (const stub of vaultStubs) {
    const itemData = armorDataMap.get(stub.itemHash);
    if (!itemData) continue;
    armorRows.push(makeArmorRow(stub, itemData, 'vault', null, armorStatHashes));
  }

  const rankOrder = { S: 0, A: 1, B: 2, C: 3, D: 4, F: 5, '—': 6 };
  armorRows.sort((a, b) =>
    (rankOrder[a.rank] ?? 9) - (rankOrder[b.rank] ?? 9) ||
    (b.quality ?? 0) - (a.quality ?? 0) ||
    a.name.localeCompare(b.name)
  );

  return armorRows; // normalized armor items
}

// ---------------------------------------------------------------------------
// Vendor pipeline
// ---------------------------------------------------------------------------

// Confirmed D1 vendor hashes from DestinyVendorDefinition manifest table
const VENDORS = [
  { hash: 570929315,  name: 'Banshee-44',        location: 'Tower',  social: true  },
  { hash: 3746647075, name: 'Lord Shaxx',         location: 'Tower',  social: true  },
  { hash: 3658200622, name: 'Arcite 99-40',       location: 'Tower',  social: true  },
  { hash: 1990950,    name: 'Commander Zavala',   location: 'Tower',  social: true,  classType: 0 },
  { hash: 3003633346, name: 'Cayde-6',            location: 'Tower',  social: true,  classType: 1 },
  { hash: 1575820975, name: 'Ikora Rey',          location: 'Tower',  social: true,  classType: 2 },
  { hash: 174528503,  name: 'Eris Morn',          location: 'Tower',  social: true  },
  { hash: 2668878854, name: 'Roni 55-30',         location: 'Tower',  social: true  },
  { hash: 1998812735, name: 'Variks',             location: 'Reef',   social: true  },
  { hash: 1808244981, name: 'Executor Hideo',     location: 'Tower',  social: true  },
  { hash: 1821699360, name: 'Lakshmi-2',          location: 'Tower',  social: true  },
  { hash: 3611686524, name: 'Arach Jalaal',       location: 'Tower',  social: true  },
  { hash: 2796397637, name: 'Xûr',               location: 'Varies', social: false },
  { hash: 1410745145, name: 'Petra Venj',         location: 'Reef',   social: true  },
];

const WEAPON_BUCKET_HASHES_ARRAY = [1498876634, 2465295065, 953998645];
const WEAPON_BUCKET_SET = new Set(WEAPON_BUCKET_HASHES_ARRAY);
const SLOT_NAMES_V = { 1498876634: 'Primary', 2465295065: 'Special', 953998645: 'Heavy' };

async function buildVendorRows(bungieToken, bungieNetMembershipId, talentGridMap, itemDataMap, armorDataMap, armorStatHashes, membershipTypeOverride) {
  const mt = membershipTypeOverride ?? membershipType;
  const platformMembershipId = await getMembershipId(mt, API_KEY, bungieToken, bungieNetMembershipId);

  const characters = await getCharacters(mt, platformMembershipId, API_KEY, bungieToken);
  if (!characters.length) throw new Error('No characters found');
  const defaultCharId = characters[0].characterId;

  // Fetch all vendors in parallel; vanguard reps use their class-specific character
  const vendorResults = await Promise.all(VENDORS.map(async vendor => {
    const charId = vendor.classType != null
      ? (characters.find(c => c.classType === vendor.classType)?.characterId ?? defaultCharId)
      : defaultCharId;
    try {
      const res = await fetch(
        `https://www.bungie.net/Platform/Destiny/${mt}/MyAccount/Character/${charId}/Vendor/${vendor.hash}/`,
        { headers: { 'X-API-Key': API_KEY, 'Authorization': `Bearer ${bungieToken}` } }
      );
      const data = await res.json();
      return { vendor, data };
    } catch {
      return { vendor, data: null };
    }
  }));

  const vendorSections = [];

  for (const { vendor, data } of vendorResults) {
    if (!data || data.ErrorCode !== 1) {
      // Vendor not available (e.g. Xûr not present) — include with empty weapons
      if (data?.ErrorCode !== 1627 || vendor.hash !== 2796397637) {
        // Only skip Xûr when not found; show all others even on error
        vendorSections.push({ vendor, rows: [], available: false, error: data?.Message ?? 'Unavailable' });
      }
      // Xûr specifically: skip entirely when not available
      if (vendor.hash === 2796397637) continue;
      vendorSections.push({ vendor, rows: [], available: false, error: data?.Message ?? 'Unavailable' });
      continue;
    }

    const vd = data.Response?.data;
    const available = vd?.enabled !== false;
    const rows = [];

    // Collect weapon sale items
    for (const cat of vd?.saleItemCategories ?? []) {
      for (const si of cat.saleItems ?? []) {
        const stub = si.item;
        if (!stub) continue;
        const itemData = itemDataMap.get(stub.itemHash);
        if (!itemData) continue;
        if (!WEAPON_BUCKET_SET.has(itemData.bucketTypeHash ?? 0)) continue;

        // Use itemData.talentGridHash as authoritative fallback —
        // vendor stubs often have talentGridHash: 0 even for valid weapons
        const gridHash = stub.talentGridHash || itemData.talentGridHash;
        if (!gridHash) continue; // genuinely no talent grid (consumables, materials)
        const patchedStub = gridHash !== stub.talentGridHash
          ? { ...stub, talentGridHash: gridHash }
          : stub;

        // Vendor items all have itemInstanceId: 0 — generate a unique stable ID
        // using itemHash + vendorHash so pairs group correctly in the UI
        const instanceId   = `vendor-${vendor.hash}-${stub.itemHash}`;
        const name         = itemData.name;
        const itemTypeName = itemData.itemTypeName ?? '';
        const tierType     = itemData.tierType ?? 0;
        const icon         = itemData.icon ?? null;
        const isCurated    = itemData.isCurated ?? false;
        const damageType   = patchedStub.damageType ?? 0;
        const slot         = SLOT_NAMES_V[itemData.bucketTypeHash] ?? 'Unknown';
        const perkData     = extractPerkNames(patchedStub, null, talentGridMap);
        const allPossible  = buildAllPossiblePerks(patchedStub, talentGridMap);
        const evaluation   = evaluateWeapon(name, perkData.all);
        const modalData    = buildModalData(patchedStub, itemData, talentGridMap);

        rows.push({
          itemType:     'weapon',
          isVendorItem: true,
          instanceId,
          name,
          type:     itemTypeName,
          slot,
          icon:     icon ? `https://www.bungie.net${icon}` : null,
          rarity:   TIER_NAMES[tierType]    ?? `Tier${tierType}`,
          damage:   DAMAGE_NAMES[damageType] ?? '—',
          damageRaw: damageType,
          light:    null,
          evaluation: {
            pvp: buildModeEval(PVP[name], evaluation.pvp, perkData.byColumn, perkData.all, allPossible, isCurated),
            pve: buildModeEval(PVE[name], evaluation.pve, perkData.byColumn, perkData.all, allPossible, isCurated),
          },
          stats: modalData.stats,
          perks: modalData.perks,
        });
      }
    }

    // Collect armor sale items
    if (available) {
      for (const cat of vd?.saleItemCategories ?? []) {
        for (const si of cat.saleItems ?? []) {
          const stub = si.item;
          if (!stub) continue;
          const itemData = armorDataMap.get(stub.itemHash);
          if (!itemData || !ARMOR_BUCKET_SET.has(itemData.bucketTypeHash ?? 0)) continue;
          const slot = ARMOR_SLOT_NAMES[itemData.bucketTypeHash] ?? 'Unknown';
          const { intellect, discipline, strength } = extractStats(stub, armorStatHashes);
          const light   = stub.primaryStat?.value ?? null;
          const quality = calcArmorQuality(intellect, discipline, strength, light, slot);
          const rank    = armorRank(quality);
          rows.push({
            itemType:     'armor',
            isVendorItem: true,
            instanceId:   `vendor-armor-${vendor.hash}-${stub.itemHash}`,
            icon:         itemData.icon ? `https://www.bungie.net${itemData.icon}` : null,
            name:         itemData.name,
            type:         slot,
            rarity:       TIER_NAMES[itemData.tierType] ?? `Tier${itemData.tierType}`,
            intellect, discipline, strength,
            evaluation:   { rank, quality },
            stats: [
              { name: 'Intellect',  value: intellect,  max: intellect  },
              { name: 'Discipline', value: discipline, max: discipline },
              { name: 'Strength',   value: strength,   max: strength   },
            ].filter(s => s.value > 0),
            perks: [],
          });
        }
      }
    }

    vendorSections.push({ vendor, items: rows, available });
  }

  return vendorSections;
}

async function refreshToken(refreshTokenValue) {
  const body = new URLSearchParams({
    grant_type:    'refresh_token',
    refresh_token: refreshTokenValue,
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });
  const res = await fetch('https://www.bungie.net/platform/app/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-API-Key': API_KEY },
    body: body.toString(),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  return {
    access_token:       data.access_token,
    refresh_token:      data.refresh_token ?? refreshTokenValue,
    membership_id:      data.membership_id,
    expires_at:         Date.now() + (data.expires_in ?? 3600) * 1000,
    refresh_expires_at: data.refresh_expires_in
                          ? Date.now() + data.refresh_expires_in * 1000 : null,
  };
}

/**
 * Middleware: ensure session has a valid, non-expired access token.
 * Attempts a refresh if the access token is expired but the refresh token is still valid.
 * Calls next() with req.token set, or responds 401 if not authenticated.
 */
async function requireAuth(req, res, next) {
  const t = req.session.token;
  if (!t) return res.status(401).json({ error: 'Not authenticated' });

  if (Date.now() > t.expires_at) {
    if (!t.refresh_token || (t.refresh_expires_at && Date.now() > t.refresh_expires_at)) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'Session expired — please log in again' });
    }
    try {
      req.session.token = await refreshToken(t.refresh_token);
      await new Promise((resolve, reject) =>
        req.session.save(err => err ? reject(err) : resolve())
      );
    } catch (err) {
      console.error('[auth] Refresh failed:', err.message);
      return res.status(401).json({ error: 'Token refresh failed — please log in again' });
    }
  }

  req.token = req.session.token;
  // Use per-session platform if set, otherwise fall back to env var default
  req.membershipType = req.session.membershipType ?? membershipType;
  next();
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();
const SessionFileStore = FileStore(session);
const SESSIONS_DIR = path.join(__dirname, '..', '.sessions');
mkdirSync(SESSIONS_DIR, { recursive: true });

// Trust the first proxy (nginx) so Express sees the correct protocol,
// IP, and can set secure cookies even though it runs on plain HTTP.
app.set('trust proxy', 1);

app.use(session({
  store: new SessionFileStore({
    path:        SESSIONS_DIR,
    ttl:         90 * 24 * 60 * 60, // 90 days in seconds — matches Bungie refresh token
    retries:     1,
    logFn:       () => {},           // suppress noisy file store logs
  }),
  secret:            SESSION_SECRET,
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure:   true,
    httpOnly: true,
    maxAge:   90 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  },
}));

// Serve static files from public/
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------------

app.get('/auth/login', (_req, res) => {
  const url = `https://www.bungie.net/en/OAuth/Authorize?client_id=${CLIENT_ID}&response_type=code`;
  res.redirect(url);
});

app.get('/callback', async (req, res) => {
  const { code } = req.query;
  console.log(`[callback] Received — code present: ${!!code}, protocol: ${req.protocol}, secure: ${req.secure}`);
  if (!code) return res.status(400).send('Missing code parameter');
  try {
    const body = new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  REDIRECT_URI,
    });

    const tokenRes = await fetch('https://www.bungie.net/platform/app/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-API-Key': API_KEY },
      body: body.toString(),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error('[callback] Token exchange failed:', tokenData);
      return res.status(500).send('Token exchange failed — check server logs');
    }

    req.session.token = {
      access_token:       tokenData.access_token,
      refresh_token:      tokenData.refresh_token ?? null,
      membership_id:      tokenData.membership_id,
      expires_at:         Date.now() + (tokenData.expires_in ?? 3600) * 1000,
      refresh_expires_at: tokenData.refresh_expires_in
                            ? Date.now() + tokenData.refresh_expires_in * 1000 : null,
    };

    console.log(`[callback] Token stored in session for membership ${tokenData.membership_id}`);
    res.redirect('/');
  } catch (err) {
    console.error('[callback] Error:', err);
    res.status(500).send('Authentication error');
  }
});

app.get('/auth/status', async (req, res) => {
  const t = req.session.token;
  const mt = req.session.membershipType ?? membershipType;
  console.log(`[auth/status] session token present: ${!!t}`);
  if (!t) return res.json({ authenticated: false });

  // If expired but refreshable, report as authenticated (the next API call will refresh)
  const accessExpired = Date.now() > t.expires_at;
  const refreshExpired = t.refresh_expires_at && Date.now() > t.refresh_expires_at;
  if (accessExpired && refreshExpired) {
    return res.json({ authenticated: false });
  }

  // Fetch the user's display name from Bungie
  try {
    const headers = { 'X-API-Key': API_KEY, 'Authorization': `Bearer ${t.access_token}` };
    const profileRes = await fetch(
      `https://www.bungie.net/Platform/User/GetMembershipsById/${t.membership_id}/254/`,
      { headers }
    );
    const profileData = await profileRes.json();
    const memberships = profileData.Response?.destinyMemberships ?? [];
    const match = memberships.find(m => m.membershipType === mt) ?? memberships[0];
    res.json({
      authenticated: true,
      displayName:   match?.displayName ?? 'Guardian',
      platform:      PLATFORM_NAMES[req.membershipType] ?? PLATFORM,
      membershipType: req.membershipType,
    });
  } catch {
    res.json({ authenticated: true, displayName: 'Guardian', platform: PLATFORM });
  }
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ---------------------------------------------------------------------------
// Inventory / evaluation API
// ---------------------------------------------------------------------------

app.get('/api/inventory', requireAuth, async (req, res) => {
  try {
    const { items, characters, characterIds, platformMembershipId } = await runEvaluation(
      req.token.access_token, req.token.membership_id, req.membershipType
    );
    res.json({ ok: true, items, characters, characterIds, platformMembershipId });
  } catch (err) {
    console.error('[api/inventory] Error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/vendors', requireAuth, async (req, res) => {
  try {
    const { itemDataMap, talentGridMap, armorDataMap, armorStatHashes } = await buildManifestData(API_KEY);
    const sections = await buildVendorRows(
      req.token.access_token, req.token.membership_id,
      talentGridMap, itemDataMap, armorDataMap, armorStatHashes, req.membershipType
    );
    res.json({ ok: true, sections });
  } catch (err) {
    console.error('[api/vendors] Error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/armor', requireAuth, async (req, res) => {
  try {
    const items = await runArmorEvaluation(
      req.token.access_token, req.token.membership_id, req.membershipType
    );
    res.json({ ok: true, items });
  } catch (err) {
    console.error('[api/armor] Error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.use(express.json());

// ---------------------------------------------------------------------------
// Platform switching
// ---------------------------------------------------------------------------

const PLATFORM_NAMES = { 1: 'Xbox', 2: 'PSN', 4: 'PC' };

app.get('/api/platforms', requireAuth, async (req, res) => {
  try {
    const bRes = await fetch(
      `https://www.bungie.net/Platform/User/GetMembershipsById/${req.token.membership_id}/254/`,
      { headers: { 'X-API-Key': API_KEY, 'Authorization': `Bearer ${req.token.access_token}` } }
    );
    const data = await bRes.json();
    const memberships = (data.Response?.destinyMemberships ?? []).map(m => ({
      membershipType: m.membershipType,
      membershipId:   m.membershipId,
      displayName:    m.displayName,
      platform:       PLATFORM_NAMES[m.membershipType] ?? `Type${m.membershipType}`,
      current:        m.membershipType === req.membershipType,
    }));
    res.json({ ok: true, memberships, current: req.membershipType });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/platform', requireAuth, async (req, res) => {
  const { membershipType: newType } = req.body ?? {};
  if (![1, 2, 4].includes(newType)) {
    return res.status(400).json({ ok: false, error: 'Invalid membershipType' });
  }
  req.session.membershipType = newType;
  await new Promise((resolve, reject) =>
    req.session.save(err => err ? reject(err) : resolve())
  );
  res.json({ ok: true, membershipType: newType, platform: PLATFORM_NAMES[newType] });
});

/**
 * POST /api/transfer
 * Body: { itemId, itemHash, characterId, transferToVault }
 *
 * Proxies to /Platform/Destiny/TransferItem/ using the session token.
 * transferToVault=true  → move item to vault   (characterId = source character)
 * transferToVault=false → pull from vault       (characterId = destination character)
 *
 * To move between characters, two calls are needed:
 *   1. character → vault  (transferToVault: true,  characterId: sourceCharId)
 *   2. vault → character  (transferToVault: false, characterId: destCharId)
 * The client handles this sequencing.
 */
app.post('/api/transfer', requireAuth, async (req, res) => {
  const { itemId, itemHash, characterId, transferToVault } = req.body ?? {};
  if (!itemId || !itemHash || !characterId || transferToVault === undefined) {
    return res.status(400).json({ ok: false, error: 'Missing required fields: itemId, itemHash, characterId, transferToVault' });
  }

  try {
    const body = {
      membershipType:    req.membershipType,
      itemReferenceHash: itemHash,
      itemId:            itemId,
      stackSize:         1,
      characterId:       characterId,
      transferToVault:   transferToVault,
    };

    const bungieRes = await fetch('https://www.bungie.net/Platform/Destiny/TransferItem/', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'X-API-Key':     API_KEY,
        'Authorization': `Bearer ${req.token.access_token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await bungieRes.json();
    if (data.ErrorCode !== 1) {
      console.error('[api/transfer] Bungie error:', data.Message);
      return res.status(400).json({ ok: false, error: data.Message ?? `ErrorCode ${data.ErrorCode}` });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[api/transfer] Error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/equip
 * Body: { itemId, characterId }
 * Equips an item on the specified character.
 * The item must already be on that character's inventory.
 */
app.post('/api/equip', requireAuth, async (req, res) => {
  const { itemId, characterId } = req.body ?? {};
  if (!itemId || !characterId) {
    return res.status(400).json({ ok: false, error: 'Missing required fields: itemId, characterId' });
  }

  try {
    const body = {
      membershipType: req.membershipType,
      itemId:         itemId,
      characterId:    characterId,
    };

    const bungieRes = await fetch('https://www.bungie.net/Platform/Destiny/EquipItem/', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'X-API-Key':     API_KEY,
        'Authorization': `Bearer ${req.token.access_token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await bungieRes.json();
    if (data.ErrorCode !== 1) {
      console.error('[api/equip] Bungie error:', data.Message);
      return res.status(400).json({ ok: false, error: data.Message ?? `ErrorCode ${data.ErrorCode}` });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[api/equip] Error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/lock
 * Body: { itemId, characterId, locked }
 *
 * Sets the Bungie lock state on an item. characterId must be a valid
 * character from the account; vault items should use any character ID.
 */
app.post('/api/lock', requireAuth, async (req, res) => {
  const { itemId, characterId, locked } = req.body ?? {};
  if (!itemId || !characterId || locked === undefined) {
    return res.status(400).json({ ok: false, error: 'Missing required fields: itemId, characterId, locked' });
  }

  try {
    const body = {
      membershipType: req.membershipType,
      itemId:         itemId,
      characterId:    characterId,
      state:          locked,
    };

    const bungieRes = await fetch('https://www.bungie.net/Platform/Destiny/SetLockState/', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'X-API-Key':     API_KEY,
        'Authorization': `Bearer ${req.token.access_token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await bungieRes.json();
    if (data.ErrorCode !== 1) {
      console.error('[api/lock] Bungie error:', data.Message);
      return res.status(400).json({ ok: false, error: data.Message ?? `ErrorCode ${data.ErrorCode}` });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[api/lock] Error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n=== D1 God Roll Evaluator ===`);
  console.log(`Server listening on port ${PORT}`);
  console.log(`Open https://d1armory.net/ in your browser\n`);
});
