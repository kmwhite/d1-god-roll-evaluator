/**
 * index.js — D1 God Roll Evaluator
 *
 * Usage:
 *   npm start              — evaluate and print ASCII table report (no DIM writes)
 *   npm run apply          — evaluate, print report, AND write tags/notes to DIM Sync
 *
 * Required env vars:
 *   D1_GOD_ROLL_EVALUATOR_PLATFORM   — xbox | psn | pc  (or numeric type 1/2/4)
 *   D1_GOD_ROLL_EVALUATOR_API_KEY    — Bungie.net API key
 *
 * Optional:
 *   D1_GOD_ROLL_EVALUATOR_DIM_API_KEY — DIM Sync API key (defaults to Bungie key for localhost dev)
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

import {
  resolveMembershipType,
  getMembershipId,
  buildManifestData,
  getCharacterIds,
  getCharacterWeapons,
  getVaultWeapons,
  extractPerkNames,
} from './bungie.js';

import { getDimToken, writeAnnotations } from './dim-api.js';
import { evaluateWeapon, buildDimAnnotation } from './evaluate.js';
import { PVP, PVE } from './god-rolls.js';
import { writeHtmlReport } from './report.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_PATH  = path.join(__dirname, '..', '.token.json');
const PLATFORM    = process.env.D1_GOD_ROLL_EVALUATOR_PLATFORM;
const API_KEY     = process.env.D1_GOD_ROLL_EVALUATOR_API_KEY;
const DIM_API_KEY = process.env.D1_GOD_ROLL_EVALUATOR_DIM_API_KEY ?? API_KEY;
const APPLY_TO_DIM = process.argv.includes('--apply');

const log = (msg) => console.log(`[evaluator] ${msg}`);

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

if (!PLATFORM || !API_KEY) {
  console.error(
    '\n[error] Missing required environment variables:\n' +
    '  D1_GOD_ROLL_EVALUATOR_PLATFORM  (xbox, psn, or pc)\n' +
    '  D1_GOD_ROLL_EVALUATOR_API_KEY   (Bungie.net API key)\n'
  );
  process.exit(1);
}

if (!existsSync(TOKEN_PATH)) {
  console.error(`\n[error] No auth token at ${TOKEN_PATH}.\nRun "npm run auth" first.\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Result formatter — produces TWO rows per weapon (PvP + PvE)
// ---------------------------------------------------------------------------

const TIER_NAMES    = { 5: 'Legendary', 6: 'Exotic', 4: 'Rare', 3: 'Uncommon', 2: 'Common' };
const DAMAGE_NAMES  = { 0: 'Kinetic', 1: 'Kinetic', 2: 'Arc', 3: 'Solar', 4: 'Void' };

/**
 * Given a full god roll definition and the perks column map, determine which
 * grid column index corresponds to each god roll column position (col1-col4).
 * We find the grid column that contains any wanted perk for that god roll column.
 * Returns Map<colKey, gridColumnIndex | null>.
 */
function mapGodRollToGridColumns(rollDef, perks) {
  const mapping = {};
  for (const colKey of ['col1', 'col2', 'col3', 'col4']) {
    const want = (rollDef?.[colKey] ?? []).map((w) => w.toLowerCase().trim());
    let found = null;
    for (const [gridCol, colPerks] of perks) {
      const normColPerks = colPerks.map((p) => p.toLowerCase().trim());
      if (want.some((w) => normColPerks.includes(w))) {
        found = gridCol;
        break;
      }
    }
    mapping[colKey] = found;
  }
  return mapping;
}

/**
 * For a single god roll column, return a display string.
 *
 * Hit:  ✓ <matched perk>
 * Miss: ✗ want: ['X']; has: ['A', 'B']
 *         — has: shows perks from the grid column that corresponds to this
 *           god roll column position (identified by where other columns landed),
 *           or '(not on weapon)' if this perk type isn't present at all.
 * N/A:  — (weapon not in god roll table for this mode)
 */
function colCell(want, perks, gridColIndex, allPossible) {
  if (want === null) return '—';
  if (want.length === 0) return '—';

  const normAll = (perks.all ?? []).map((p) => p.toLowerCase().trim());
  const hit = want.find((w) => normAll.includes(w.toLowerCase().trim()));
  if (hit) return `✓ ${hit}`;

  const wantStr = '[' + want.map((w) => `'${w}'`).join(', ') + ']';

  if (gridColIndex === null) {
    // Wanted perk not found in any rolled column — check if it exists anywhere
    // in the full talent grid definition to distinguish the two cases.
    const normPossible = [...(allPossible ?? [])].map(p => p.toLowerCase().trim());
    const isRollable = want.some(w => normPossible.includes(w.toLowerCase().trim()));
    const hasStr = isRollable ? '(not rolled)' : '(not rollable on this weapon)';
    return `✗ want: ${wantStr}; has: ${hasStr}`;
  }

  const hasPerks = perks.get(gridColIndex) ?? [];
  const hasStr   = hasPerks.length > 0
    ? '[' + hasPerks.map((p) => `'${p}'`).join(', ') + ']'
    : '(not rolled)';
  return `✗ want: ${wantStr}; has: ${hasStr}`;
}

/**
 * Build a flat set of ALL perk names available on this weapon type —
 * every step of every node in the talent grid definition, regardless of
 * what was rolled on this specific instance.
 * Used for error detection: a perk is only a definition error if it doesn't
 * exist anywhere in the talent grid at all.
 */
function buildAllPossiblePerks(stub, talentGridMap) {
  const gridHash = stub.talentGridHash;
  if (!gridHash) return new Set();
  const gridNodes = talentGridMap.get(gridHash) ?? [];
  const all = new Set();
  for (const node of gridNodes) {
    for (const step of node.steps ?? []) {
      const name = step.nodeStepName?.trim();
      if (name && name !== 'undefined') all.add(name);
    }
  }
  return all;
}

/**
 * Returns true if any god roll column wants a perk that doesn't exist
 * anywhere in this weapon type's talent grid definition.
 * This indicates a mistake in the god roll data, not a bad roll.
 */
function hasDefinitionError(rollDef, allPossiblePerks) {
  if (!rollDef) return false;
  for (const colKey of ['col1', 'col2', 'col3', 'col4']) {
    const want = rollDef[colKey] ?? [];
    if (want.length === 0) continue;
    const normAll = [...allPossiblePerks].map(p => p.toLowerCase().trim());
    const anyExists = want.some(w => normAll.includes(w.toLowerCase().trim()));
    if (!anyExists) return true;
  }
  return false;
}

/**
 * Build the full data payload needed to render the detail modal for one weapon.
 * Returns stats (from the stub) and perk columns (from the talent grid definition,
 * annotated with which step this instance rolled and whether it's activated).
 */
function buildModalData(stub, itemData, talentGridMap) {
  const BUNGIE_ROOT = 'https://www.bungie.net';
  const MISSING_ICON = '/img/misc/missing_icon.png';

  // --- Stats: use the stub's stats array (the 6 player-visible stats) ---
  // Covers both gun stats and sword-specific stats.
  const STAT_NAMES = {
    4284893193: 'Rate of Fire',
    4043523819: 'Impact',
    1240592695: 'Range',
    155624089:  'Stability',
    4188031367: 'Reload',
    3871231066: 'Magazine',
    2715839340: 'Recoil',
    1345609583: 'Aim Assist',
    943549884:  'Equip Speed',
    // Sword stats
    2837207746: 'Speed',
    2762071195: 'Efficiency',
    209426660:  'Defense',
    925767036:  'Energy',
    2961396640: 'Charge Rate',
    2523465841: 'Velocity',
  };

  const STAT_ORDER = [
    'Rate of Fire', 'Impact', 'Range', 'Stability', 'Reload', 'Magazine',
    'Aim Assist', 'Recoil', 'Equip Speed',
    'Speed', 'Efficiency', 'Defense', 'Energy', 'Charge Rate', 'Velocity',
  ];

  const stats = Object.values(stub.stats ?? {})
    .filter(s => STAT_NAMES[s.statHash])
    .map(s => ({
      name:  STAT_NAMES[s.statHash],
      value: s.value,
      max:   s.maximumValue ?? 100,
    }))
    .sort((a, b) => STAT_ORDER.indexOf(a.name) - STAT_ORDER.indexOf(b.name));

  // --- Perk columns: group talent grid nodes by column ---
  const gridNodes = talentGridMap.get(stub.talentGridHash) ?? [];
  const stubNodes = stub.nodes ?? [];

  // Group nodes by column, skipping:
  //   column -1 — hidden/intrinsic nodes (damage type flavour, broken entries)
  //   column  0 — utility nodes (infuse, upgrade, damage element)
  const colMap = new Map();
  for (let i = 0; i < gridNodes.length; i++) {
    const gn  = gridNodes[i];
    const sn  = stubNodes[i] ?? {};
    const col = gn.column ?? -1;
    if (col <= 0) continue; // skip intrinsic (-1) and utility (0)

    if (!colMap.has(col)) colMap.set(col, []);

    const rolledStepIdx = sn.stepIndex ?? 0;
    const rolledStep    = (gn.steps ?? [])[rolledStepIdx];

    const steps = (gn.steps ?? []).map((step, si) => ({
      name:     step.nodeStepName?.trim() ?? '',
      icon:     (step.icon && step.icon !== MISSING_ICON)
                  ? `${BUNGIE_ROOT}${step.icon}` : null,
      isRolled: si === rolledStepIdx,
      isActive: si === rolledStepIdx && (sn.isActivated ?? false),
      desc:     step.nodeStepDescription?.trim() ?? '',
    })).filter(s => s.name && s.name !== 'undefined');

    if (steps.length === 0) continue;

    colMap.get(col).push({
      nodeIndex:     i,
      exclusiveWith: gn.exlusiveWithNodes ?? [],
      rolledName:    rolledStep?.nodeStepName?.trim() ?? '',
      steps,
    });
  }

  // Sort columns numerically, then collapse exclusive node groups into one slot
  const columns = [];
  const sortedCols = [...colMap.entries()].sort(([a], [b]) => a - b);

  for (const [colIdx, nodes] of sortedCols) {
    const slotGroups = [];
    const assigned   = new Set();

    for (const node of nodes) {
      if (assigned.has(node.nodeIndex)) continue;
      const group = [node];
      assigned.add(node.nodeIndex);
      for (const peerId of node.exclusiveWith) {
        const peer = nodes.find(n => n.nodeIndex === peerId);
        if (peer && !assigned.has(peer.nodeIndex)) {
          group.push(peer);
          assigned.add(peer.nodeIndex);
        }
      }
      slotGroups.push(group);
    }

    for (const group of slotGroups) {
      // Flatten all steps across competing nodes, deduplicate by name
      // (e.g. sword upgrade tiers like "The Wolves Remember" x2 → shown once)
      const seen       = new Set();
      const allOptions = [];
      for (const opt of group.flatMap(n => n.steps)) {
        if (!seen.has(opt.name)) {
          seen.add(opt.name);
          allOptions.push(opt);
        }
      }
      if (allOptions.length === 0) continue;

      const rolledOption = allOptions.find(s => s.isRolled) ?? allOptions[0];
      columns.push({
        colIndex:   colIdx,
        options:    allOptions,
        rolledName: rolledOption?.name ?? '',
      });
    }
  }

  return { stats, columns };
}

/**
 * Return a result label for one mode's evaluation status.
 * If the god roll definition references perks not in the talent grid, label as Error.
 */
function modeResult(status, isError) {
  if (isError)                   return '⚠ Error';
  if (status === 'god_roll')     return '★ GOD ROLL';
  if (status === 'close')        return '~ Close';
  if (status === 'not_god_roll') return '✗ No';
  return '? —';
}

/**
 * Expand one weapon result into two table rows: one for PvP, one for PvE.
 * Returns [pvpRow, pveRow] — each is a string[].
 */
function formatRows(result) {
  const { name, itemTypeName, tierType, damageType, isCurated, perks, allPossible, evaluation } = result;
  const pvpDef = PVP[name];
  const pveDef = PVE[name];

  const rarity = TIER_NAMES[tierType]  ?? `Tier${tierType}`;
  const damage = DAMAGE_NAMES[damageType] ?? '—';

  // Curated/exotic weapons have a fixed roll — no column evaluation applies.
  if (isCurated) {
    const curatedRow = (mode) => [
      name, itemTypeName, rarity, damage, mode,
      '—', '—', '—', '—',
      '⚙ Curated Roll',
    ];
    return [curatedRow('PvP'), curatedRow('PvE')];
  }

  const makeRow = (mode, rollDef, evalResult) => {
    // Map each god roll column to a grid column index for this mode's definition
    const gridMap = mapGodRollToGridColumns(rollDef, perks);
    const w = (colKey) => rollDef ? (rollDef[colKey] ?? []) : null;
    const isError = hasDefinitionError(rollDef, allPossible);

    return [
      name,
      itemTypeName,
      rarity,
      damage,
      mode,
      colCell(w('col1'), perks, gridMap['col1'], allPossible),
      colCell(w('col2'), perks, gridMap['col2'], allPossible),
      colCell(w('col3'), perks, gridMap['col3'], allPossible),
      colCell(w('col4'), perks, gridMap['col4'], allPossible),
      modeResult(evalResult.status, isError),
    ];
  };

  return [
    makeRow('PvP', pvpDef, evaluation.pvp),
    makeRow('PvE', pveDef, evaluation.pve),
  ];
}

// ---------------------------------------------------------------------------
// ASCII table renderer
// ---------------------------------------------------------------------------

/**
 * Render rows as a fixed-width ASCII table.
 * @param {string[]} headers
 * @param {string[][]} rows
 */
function renderTable(headers, rows) {
  const allRows = [headers, ...rows];
  const widths  = headers.map((_, ci) =>
    Math.max(...allRows.map((r) => (r[ci] ?? '').length))
  );
  const sep  = '+-' + widths.map((w) => '-'.repeat(w)).join('-+-') + '-+';
  const line = (cells) =>
    '| ' + cells.map((c, i) => (c ?? '').padEnd(widths[i])).join(' | ') + ' |';

  console.log(sep);
  console.log(line(headers));
  console.log(sep);
  for (const row of rows) console.log(line(row));
  console.log(sep);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function loadToken() {
  const raw = JSON.parse(readFileSync(TOKEN_PATH, 'utf8'));
  if (Date.now() > raw.expires_at) {
    console.error('\n[error] Token expired. Run "npm run auth" to re-authenticate.\n');
    process.exit(1);
  }
  return raw;
}

async function main() {
  console.log('\n=== D1 God Roll Evaluator ===');
  console.log(APPLY_TO_DIM
    ? '    Mode: APPLY  — will evaluate and write tags/notes to DIM Sync\n'
    : '    Mode: REPORT — dry run, no changes will be written to DIM\n'
  );

  const token = loadToken();
  const { access_token: bungieToken, membership_id: bungieNetMembershipId } = token;
  const membershipType = resolveMembershipType(PLATFORM);
  log(`Platform: ${PLATFORM} → membershipType=${membershipType}`);

  log('Resolving Destiny membership...');
  const platformMembershipId = await getMembershipId(
    membershipType, API_KEY, bungieToken, bungieNetMembershipId
  );
  log(`Destiny membershipId: ${platformMembershipId}`);

  log('Loading D1 manifest data...');
  const { weaponHashes, itemDataMap, talentGridMap } = await buildManifestData(API_KEY);
  log(`Loaded ${weaponHashes.size} legendary/exotic weapon hashes, ${talentGridMap.size} talent grids.`);

  log('Fetching character IDs...');
  const characterIds = await getCharacterIds(membershipType, platformMembershipId, API_KEY, bungieToken);
  log(`Found ${characterIds.length} character(s).`);

  const weaponStubs = [];
  for (const charId of characterIds) {
    const weapons = await getCharacterWeapons(
      membershipType, platformMembershipId, charId, API_KEY, bungieToken
    );
    log(`  Character ${charId}: ${weapons.length} legendary/exotic weapon(s)`);
    weaponStubs.push(...weapons);
  }

  const vaultWeapons = await getVaultWeapons(
    membershipType, platformMembershipId, weaponHashes, API_KEY, bungieToken
  );
  log(`Vault: ${vaultWeapons.length} legendary/exotic weapon(s)`);
  weaponStubs.push(...vaultWeapons);

  // Character inventory already filters by bucket hash (weapon slots).
  // Additionally filter to only legendary/exotic by checking weaponHashes.
  const instanced = weaponStubs
    .filter((s) => s.itemInstanceId && weaponHashes.has(s.itemHash));
  log(`Total legendary/exotic weapons to evaluate: ${instanced.length}`);

  // Evaluate — no extra API calls needed; talent grid definition from manifest
  // gives us the full set of available perks regardless of which are active.
  const results = [];

  for (const stub of instanced) {
    const itemData = itemDataMap.get(stub.itemHash);
    const name         = itemData?.name         ?? `Unknown (hash:${stub.itemHash})`;
    const itemTypeName = itemData?.itemTypeName  ?? '';
    const perks        = extractPerkNames(stub, null, talentGridMap);
    const allPossible  = buildAllPossiblePerks(stub, talentGridMap);
    const evaluation   = evaluateWeapon(name, perks.all);
    const annotation   = buildDimAnnotation(evaluation);
    const tierType     = itemData?.tierType  ?? 0;
    const icon         = itemData?.icon       ?? null;
    const isCurated    = itemData?.isCurated  ?? false;
    const damageType   = stub.damageType ?? 0;
    const modalData    = buildModalData(stub, itemData, talentGridMap);

    results.push({ instanceId: stub.itemInstanceId, name, itemTypeName, tierType, damageType, icon, isCurated, perks, allPossible, evaluation, annotation, modalData });
  }

  log(`Evaluated ${results.length} weapon(s).\n`);

  // ---------------------------------------------------------------------------
  // ASCII table — two rows per weapon (PvP + PvE), sorted by best result then name
  // ---------------------------------------------------------------------------

  // Sort results: best overall result first (god roll > close > no > unknown), then alpha
  const bestOrder = (r) => {
    const s = [r.evaluation.pvp.status, r.evaluation.pve.status];
    if (s.includes('god_roll'))    return 0;
    if (s.includes('close'))       return 1;
    if (s.includes('not_god_roll')) return 2;
    return 3; // both unknown
  };

  results.sort((a, b) => {
    const od = bestOrder(a) - bestOrder(b);
    return od !== 0 ? od : a.name.localeCompare(b.name);
  });

  // Expand each result into [pvpRow, pveRow] and insert a blank separator row
  // between different weapons so it's easy to scan vertically.
  const tableRows = [];
  for (let i = 0; i < results.length; i++) {
    const [pvpRow, pveRow] = formatRows(results[i]);
    tableRows.push(pvpRow, pveRow);
    // Blank separator between weapons (not after the last one)
    if (i < results.length - 1) {
      tableRows.push(new Array(10).fill(''));
    }
  }

  const headers = ['Weapon', 'Type', 'Rarity', 'Damage', 'Mode', 'Column 1', 'Column 2', 'Column 3', 'Column 4', 'Result'];
  renderTable(headers, tableRows);

  // Summary counts
  const godRolls   = results.filter((r) => r.annotation.tag === 'favorite');
  const closeRolls = results.filter((r) => r.annotation.tag === 'keep');
  const unknown    = results.filter((r) => r.evaluation.pvp.status === 'unknown' && r.evaluation.pve.status === 'unknown');
  console.log(`\n  ★ God Rolls: ${godRolls.length}   ~ Close: ${closeRolls.length}   ? Not in tables: ${unknown.length}   Total: ${results.length}\n`);

  // ---------------------------------------------------------------------------
  // HTML report
  // ---------------------------------------------------------------------------

  // Build flat row objects for the report (one per weapon × mode)
  const RESULT_RANK = { '★ GOD ROLL': 0, '~ Close': 1, '✗ No': 2, '⚙ Curated Roll': 3, '⚠ Error': 4, '? —': 5 };
  const htmlRows = [];
  for (const r of results) {
    for (const mode of ['PvP', 'PvE']) {
      const rollDef   = mode === 'PvP' ? PVP[r.name] : PVE[r.name];
      const evalResult = mode === 'PvP' ? r.evaluation.pvp : r.evaluation.pve;
      const gridMap   = mapGodRollToGridColumns(rollDef, r.perks);
      const w         = (col) => rollDef ? (rollDef[col] ?? []) : null;
      const isError   = hasDefinitionError(rollDef, r.allPossible);
      const result    = modeResult(evalResult.status, isError);
      const curated   = r.isCurated;
      htmlRows.push({
        instanceId: r.instanceId,
        icon:       r.icon ? `https://www.bungie.net${r.icon}` : null,
        name:       r.name,
        type:       r.itemTypeName,
        rarity:     TIER_NAMES[r.tierType]    ?? `Tier${r.tierType}`,
        damage:     DAMAGE_NAMES[r.damageType] ?? '—',
        damageRaw:  r.damageType,
        mode,
        col1:       curated ? '—' : colCell(w('col1'), r.perks, gridMap['col1'], r.allPossible),
        col2:       curated ? '—' : colCell(w('col2'), r.perks, gridMap['col2'], r.allPossible),
        col3:       curated ? '—' : colCell(w('col3'), r.perks, gridMap['col3'], r.allPossible),
        col4:       curated ? '—' : colCell(w('col4'), r.perks, gridMap['col4'], r.allPossible),
        result:     curated ? '⚙ Curated Roll' : result,
        resultRank: curated ? 4 : (RESULT_RANK[result] ?? 99),
        // Modal data only attached once (on PvP row) to avoid doubling JSON size
        modalData:  mode === 'PvP' ? r.modalData : undefined,
      });
    }
  }

  const reportPath = path.join(__dirname, '..', 'god-roll-report.html');
  writeHtmlReport(htmlRows, reportPath);
  log(`HTML report written to ${reportPath}`);

  // ---------------------------------------------------------------------------
  // DIM Sync — only runs when --apply is passed
  // ---------------------------------------------------------------------------

  if (!APPLY_TO_DIM) {
    console.log('─────────────────────────────────────────────');
    console.log('  Dry run complete. No changes written to DIM.');
    console.log('  To tag and annotate your weapons in DIM, run:');
    console.log('    npm run apply\n');
    return;
  }

  log('Obtaining DIM Sync token...');
  const dimToken = await getDimToken(bungieToken, bungieNetMembershipId, DIM_API_KEY);

  const dimUpdates = results.map((r) => ({
    id:    r.instanceId,
    tag:   r.annotation.tag,
    notes: r.annotation.notes,
  }));

  log(`Writing ${dimUpdates.length} DIM annotation(s)...`);
  await writeAnnotations(platformMembershipId, dimToken, DIM_API_KEY, dimUpdates);

  console.log('\n✓ Done! Open DIM — your weapons now show god roll tags and notes.\n');
}

main().catch((err) => {
  console.error('\n[fatal]', err.message ?? err);
  process.exit(1);
});
