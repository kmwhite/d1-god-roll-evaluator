/**
 * evaluate.js
 * Core logic for comparing a weapon's perks against god roll definitions.
 */

import { PVP, PVE, CLOSE_THRESHOLD } from './god-rolls.js';

/**
 * @typedef {'god_roll' | 'close' | 'not_god_roll' | 'unknown'} RollStatus
 *
 * @typedef {{ status: RollStatus, columnsMatched: number, detail: string }} RollResult
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
 *
 * @param {{ col1: string[], col2: string[], col3: string[], col4: string[] }} roll
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

  return { status, columnsMatched: matchCount, detail };
}

/**
 * Evaluate a single weapon against the PvP and PvE god roll tables.
 *
 * @param {string} weaponName   Display name of the weapon (e.g. "Eyasluna")
 * @param {string[]} itemPerks  All perk names on the weapon instance
 * @returns {WeaponEvaluation}
 */
export function evaluateWeapon(weaponName, itemPerks) {
  const unknown = { status: 'unknown', columnsMatched: 0, detail: 'No god roll definition found for this weapon.' };

  const pvpRoll = PVP[weaponName];
  const pveRoll = PVE[weaponName];

  return {
    pvp: pvpRoll ? scoreAgainstRoll(pvpRoll, itemPerks) : unknown,
    pve: pveRoll ? scoreAgainstRoll(pveRoll, itemPerks) : unknown,
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
  switch (result.status) {
    case 'god_roll':   return `${label}: ✓ GOD ROLL`;
    case 'close':      return `${label}: ~ Close (${result.columnsMatched}/4) — ${result.detail.split('Missing: ')[1] ?? ''}`;
    case 'not_god_roll': return `${label}: ✗ (${result.columnsMatched}/4)`;
    case 'unknown':    return `${label}: —`;
  }
}
