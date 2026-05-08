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
const DAMAGE_NAMES  = { 1: 'Kinetic', 2: 'Arc', 3: 'Solar', 4: 'Void' };

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
function colCell(want, perks, gridColIndex) {
  if (want === null) return '—';
  if (want.length === 0) return '—';

  const normAll = (perks.all ?? []).map((p) => p.toLowerCase().trim());
  const hit = want.find((w) => normAll.includes(w.toLowerCase().trim()));
  if (hit) return `✓ ${hit}`;

  // Miss: show what the weapon actually has in the corresponding grid column
  const hasPerks = gridColIndex !== null
    ? (perks.get(gridColIndex) ?? [])
    : [];

  const wantStr = '[' + want.map((w) => `'${w}'`).join(', ') + ']';
  const hasStr  = hasPerks.length > 0
    ? '[' + hasPerks.map((p) => `'${p}'`).join(', ') + ']'
    : '(not on weapon)';
  return `✗ want: ${wantStr}; has: ${hasStr}`;
}

/**
 * Return a result label for one mode's evaluation status.
 */
function modeResult(status) {
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
  const { name, itemTypeName, tierType, damageType, perks, evaluation } = result;
  const pvpDef = PVP[name];
  const pveDef = PVE[name];

  const rarity = TIER_NAMES[tierType]  ?? `Tier${tierType}`;
  const damage = DAMAGE_NAMES[damageType] ?? '—';

  const makeRow = (mode, rollDef, evalResult) => {
    // Map each god roll column to a grid column index for this mode's definition
    const gridMap = mapGodRollToGridColumns(rollDef, perks);
    const w = (colKey) => rollDef ? (rollDef[colKey] ?? []) : null;

    return [
      name,
      itemTypeName,
      rarity,
      damage,
      mode,
      colCell(w('col1'), perks, gridMap['col1']),
      colCell(w('col2'), perks, gridMap['col2']),
      colCell(w('col3'), perks, gridMap['col3']),
      colCell(w('col4'), perks, gridMap['col4']),
      modeResult(evalResult.status),
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
    const evaluation   = evaluateWeapon(name, perks.all);
    const annotation   = buildDimAnnotation(evaluation);
    const tierType     = itemData?.tierType  ?? 0;
    const icon         = itemData?.icon       ?? null;
    const damageType   = stub.damageType ?? 0;

    results.push({ instanceId: stub.itemInstanceId, name, itemTypeName, tierType, damageType, icon, perks, evaluation, annotation });
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
  const RESULT_RANK = { '★ GOD ROLL': 0, '~ Close': 1, '✗ No': 2, '? —': 3 };
  const htmlRows = [];
  for (const r of results) {
    for (const mode of ['PvP', 'PvE']) {
      const rollDef   = mode === 'PvP' ? PVP[r.name] : PVE[r.name];
      const evalResult = mode === 'PvP' ? r.evaluation.pvp : r.evaluation.pve;
      const gridMap   = mapGodRollToGridColumns(rollDef, r.perks);
      const w         = (col) => rollDef ? (rollDef[col] ?? []) : null;
      const result    = modeResult(evalResult.status);
      htmlRows.push({
        instanceId: r.instanceId,
        icon:       r.icon,
        name:       r.name,
        type:       r.itemTypeName,
        rarity:     TIER_NAMES[r.tierType]    ?? `Tier${r.tierType}`,
        damage:     DAMAGE_NAMES[r.damageType] ?? '—',
        damageRaw:  r.damageType,
        mode,
        col1:       colCell(w('col1'), r.perks, gridMap['col1']),
        col2:       colCell(w('col2'), r.perks, gridMap['col2']),
        col3:       colCell(w('col3'), r.perks, gridMap['col3']),
        col4:       colCell(w('col4'), r.perks, gridMap['col4']),
        result,
        resultRank: RESULT_RANK[result] ?? 99,
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
