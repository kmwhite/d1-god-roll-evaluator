/**
 * evaluate.js
 * Core logic for comparing a weapon's perks against god roll definitions.
 */

import { PVP, PVE, CLOSE_THRESHOLD } from './god-rolls.js';

/**
 * @typedef {'god_roll' | 'close' | 'not_god_roll' | 'unknown'} RollStatus
 *
 * @typedef {{ status: RollStatus, columnsMatched: number, detail: string, source: string|null }} RollResult
 *
 * @typedef {{ pvp: RollResult, pve: RollResult }} WeaponEvaluation
 */

/**
 * Normalise a perk name for comparison: lowercase + trim.
 * @param {string} s
 */
const norm = (s) => s.toLowerCase().trim();

/**
 * Given a list of acceptable perk names for a column and the full set of
 * perk names on an item, return true if at least one acceptable perk is present.
 *
 * @param {string[]} acceptable
 * @param {string[]} itemPerks
 */
function columnMatches(acceptable, itemPerks) {
  const normItem = itemPerks.map(norm);
  return acceptable.some((a) => normItem.includes(norm(a)));
}

/**
 * Score a weapon against a single god roll definition.
 * All four columns must come from the same definition — no mixing.
 *
 * @param {{ col1: string[], col2: string[], col3: string[], col4: string[], source?: string }} roll
 * @param {string[]} itemPerks  All perk names on the weapon instance
 * @returns {RollResult}
 */
function scoreAgainstRoll(roll, itemPerks) {
  const cols = [roll.col1, roll.col2, roll.col3, roll.col4];
  const results = cols.map((col, i) => ({
    col: i + 1,
    matched: columnMatches(col, itemPerks),
    wanted: col.join(' / '),
  }));

  const matchCount = results.filter((r) => r.matched).length;
  const missingCols = results
    .filter((r) => !r.matched)
    .map((r) => `Col${r.col} needs [${r.wanted}]`);

  let status;
  if (matchCount === 4) {
    status = 'god_roll';
  } else if (matchCount >= CLOSE_THRESHOLD) {
    status = 'close';
  } else {
    status = 'not_god_roll';
  }

  const detail =
    status === 'god_roll'
      ? 'Perfect roll — all 4 columns match.'
      : `${matchCount}/4 cols match. Missing: ${missingCols.join('; ')}`;

  return { status, columnsMatched: matchCount, detail, source: roll.source ?? null };
}

/** Status rank for picking the best result across multiple definitions */
const STATUS_RANK = { god_roll: 3, close: 2, not_god_roll: 1, unknown: 0 };

/**
 * Evaluate a weapon against one god roll table entry.
 * The entry may be a single definition object or an array of definitions.
 * Each definition is scored independently — no mixing between definitions.
 * Returns the best result across all definitions.
 *
 * @param {object|object[]|undefined} rollEntry
 * @param {string[]} itemPerks
 * @returns {RollResult}
 */
function evaluateAgainstEntry(rollEntry, itemPerks) {
  const unknown = { status: 'unknown', columnsMatched: 0, detail: 'No god roll definition found for this weapon.', source: null };
  if (!rollEntry) return unknown;

  const defs    = Array.isArray(rollEntry) ? rollEntry : [rollEntry];
  const results = defs.map(def => scoreAgainstRoll(def, itemPerks));

  let best = null;
  for (const result of results) {
    if (!best || STATUS_RANK[result.status] > STATUS_RANK[best.status] ||
        (result.status === best.status && result.columnsMatched > best.columnsMatched)) {
      best = result;
    }
  }
  if (!best) return unknown;

  // Aggregate all sources that reached the same best score so that, e.g.,
  // both TRUEGaming and Reddit matching shows "TRUEGaming + Reddit".
  const sources = [
    ...new Set(
      results
        .filter(r => r.status === best.status && r.columnsMatched === best.columnsMatched)
        .map(r => r.source)
        .filter(Boolean),
    ),
  ];
  return { ...best, source: sources.length > 0 ? sources.join(' + ') : null };
}

/**
 * Evaluate a single weapon against the PvP and PvE god roll tables.
 *
 * @param {string} weaponName   Display name of the weapon (e.g. "Eyasluna")
 * @param {string[]} itemPerks  All perk names on the weapon instance
 * @returns {WeaponEvaluation}
 */
export function evaluateWeapon(weaponName, itemPerks) {
  return {
    pvp: evaluateAgainstEntry(PVP[weaponName], itemPerks),
    pve: evaluateAgainstEntry(PVE[weaponName], itemPerks),
  };
}

/**
 * Build the DIM tag and notes string for a weapon based on its evaluation.
 *
 * Tag priority (DIM supports one tag per item):
 *   'favorite' → god roll in EITHER PvP or PvE
 *   'keep'     → close in at least one mode, not god roll in either
 *   no tag     → not a god roll / close in either mode
 *
 * @param {WeaponEvaluation} evaluation
 * @returns {{ tag: string | null, notes: string }}
 */
export function buildDimAnnotation(evaluation) {
  const { pvp, pve } = evaluation;

  const isGodRoll = pvp.status === 'god_roll' || pve.status === 'god_roll';
  const isClose = pvp.status === 'close' || pve.status === 'close';

  let tag = null;
  if (isGodRoll) tag = 'favorite';
  else if (isClose) tag = 'keep';

  // Build a concise notes string
  const pvpLine = formatLine('PvP', pvp);
  const pveLine = formatLine('PvE', pve);
  const notes = `${pvpLine} | ${pveLine}`;

  return { tag, notes };
}

/**
 * @param {string} label
 * @param {RollResult} result
 */
function formatLine(label, result) {
  const src = result.source ? ` [${result.source}]` : '';
  switch (result.status) {
    case 'god_roll':      return `${label}: GOD ROLL${src}`;
    case 'close':         return `${label}: Close (${result.columnsMatched}/4)${src} — ${result.detail.split('Missing: ')[1] ?? ''}`;
    case 'not_god_roll':  return `${label}: No (${result.columnsMatched}/4)`;
    case 'unknown':       return `${label}: —`;
  }
}
