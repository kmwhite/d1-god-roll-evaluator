/**
 * god-rolls.js
 * Aggregates god roll definitions from all community sources into the PVP
 * and PVE tables consumed by the rest of the app.
 *
 * Each source file lives in src/god-rolls/ and exports a plain object keyed
 * by weapon name.  merge() combines them so that weapons covered by multiple
 * sources become arrays of definitions.  evaluate.js then scores each
 * definition independently and aggregates the sources that achieved the best
 * result (e.g. both TRUEGaming and Reddit match -> "TRUEGaming + Reddit").
 *
 * Sources
 *   TRUEGaming          truegaming-pvp.js / truegaming-pve.js
 *   Reddit              reddit-pvp.js     / reddit-pve.js
 *   Last City Discord   last-city-discord-pve.js  (PvE only)
 */

import { TG_PVP } from './god-rolls/truegaming-pvp.js';
import { TG_PVE } from './god-rolls/truegaming-pve.js';
import { RD_PVP } from './god-rolls/reddit-pvp.js';
import { RD_PVE } from './god-rolls/reddit-pve.js';
import { LCD_PVE } from './god-rolls/last-city-discord-pve.js';

export const CLOSE_THRESHOLD = 3;

/**
 * Merge any number of per-source tables into one combined table.
 * When multiple sources define the same weapon, their entries are combined
 * into an array so evaluate.js can score each definition independently.
 *
 * @param {...Object} sources
 * @returns {Object}
 */
function merge(...sources) {
  const out = {};
  for (const src of sources) {
    for (const [name, def] of Object.entries(src)) {
      if (out[name] === undefined) {
        out[name] = def;
      } else {
        const existing = Array.isArray(out[name]) ? out[name] : [out[name]];
        const add      = Array.isArray(def)        ? def        : [def];
        out[name] = [...existing, ...add];
      }
    }
  }
  return out;
}

export const PVP = merge(TG_PVP, RD_PVP);
export const PVE = merge(TG_PVE, RD_PVE, LCD_PVE);
