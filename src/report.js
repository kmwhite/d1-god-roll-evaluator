/**
 * report.js
 * Generates a self-contained HTML report of the god roll evaluation results.
 * Styled to match Destiny's aesthetic — dark, amber accents, military-grid typography.
 */

import { writeFileSync } from 'fs';

const BUNGIE_ROOT = 'https://www.bungie.net';

const TIER_CLASS = { 5: 'legendary', 6: 'exotic', 4: 'rare', 3: 'uncommon', 2: 'common' };
const DAMAGE_CLASS = { 1: 'kinetic', 2: 'arc', 3: 'solar', 4: 'void' };

/**
 * @param {Array} rows   — flat row objects from index.js (one per weapon×mode)
 * @param {string} outPath — file path to write
 */
export function writeHtmlReport(rows, outPath) {
  const html = buildHtml(rows);
  writeFileSync(outPath, html, 'utf8');
}

function buildHtml(rows) {
  const rowsJson = JSON.stringify(rows.map(r => ({
    instanceId: r.instanceId,
    icon:       r.icon ?? null,
    name:       r.name,
    type:       r.type,
    rarity:     r.rarity,
    damage:     r.damage,
    damageRaw:  r.damageRaw,
    light:      r.light ?? null,
    mode:       r.mode,
    col1:       r.col1,
    col2:       r.col2,
    col3:       r.col3,
    col4:       r.col4,
    result:     r.result,
    resultRank: r.resultRank,
    modalData:  r.modalData ?? undefined,
  })));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>D1 God Roll Evaluator</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&display=swap" rel="stylesheet">
<style>
  :root {
    --bg:          #0a0c0f;
    --surface:     #111418;
    --surface2:    #181c22;
    --border:      #252b34;
    --border-bright: #2e3744;
    --text:        #c8d0d9;
    --text-dim:    #5a6472;
    --text-bright: #e8edf2;
    --amber:       #c8922a;
    --amber-bright:#e8a830;
    --amber-glow:  rgba(200,146,42,0.12);
    --god-roll:    #c8922a;
    --close:       #4a7c9e;
    --no:          #3a3f48;
    --unknown:     #2e3340;
    --exotic:      #c8922a;
    --legendary:   #7b5ea7;
    --rare:        #4a7ca7;
    --kinetic:     #8a9aaa;
    --arc:         #79b4e0;
    --solar:       #e07840;
    --void:        #a070c8;
    --hit:         #4a8a5a;
    --miss:        #8a3a3a;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Rajdhani', sans-serif;
    font-size: 15px;
    min-height: 100vh;
  }

  /* Subtle scanline overlay */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0,0,0,0.03) 2px,
      rgba(0,0,0,0.03) 4px
    );
    pointer-events: none;
    z-index: 9999;
  }

  header {
    padding: 32px 40px 24px;
    border-bottom: 1px solid var(--border);
    background: linear-gradient(180deg, rgba(200,146,42,0.06) 0%, transparent 100%);
    display: flex;
    align-items: flex-end;
    gap: 24px;
  }

  .header-emblem {
    width: 56px;
    height: 56px;
    border: 2px solid var(--amber);
    display: grid;
    place-items: center;
    font-size: 28px;
    flex-shrink: 0;
    box-shadow: 0 0 20px var(--amber-glow), inset 0 0 20px var(--amber-glow);
  }

  header h1 {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--text-bright);
    line-height: 1;
  }
  header p {
    font-family: 'Share Tech Mono', monospace;
    font-size: 11px;
    color: var(--text-dim);
    letter-spacing: 0.1em;
    margin-top: 6px;
  }

  .controls {
    padding: 16px 40px;
    display: flex;
    gap: 12px;
    align-items: center;
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }

  .filter-label {
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-dim);
    font-family: 'Share Tech Mono', monospace;
  }

  .filter-btn {
    padding: 5px 14px;
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text-dim);
    font-family: 'Rajdhani', sans-serif;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.15s;
  }
  .filter-btn:hover { border-color: var(--border-bright); color: var(--text); }
  .filter-btn.active { background: var(--amber-glow); border-color: var(--amber); color: var(--amber-bright); }

  .search-wrap {
    margin-left: auto;
    position: relative;
  }
  .search-wrap::before {
    content: '⌕';
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-dim);
    font-size: 16px;
    pointer-events: none;
  }
  #search {
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text);
    font-family: 'Share Tech Mono', monospace;
    font-size: 12px;
    padding: 6px 12px 6px 30px;
    width: 220px;
    outline: none;
    transition: border-color 0.15s;
  }
  #search:focus { border-color: var(--amber); }
  #search::placeholder { color: var(--text-dim); }

  .stats-bar {
    padding: 10px 40px;
    display: flex;
    gap: 32px;
    border-bottom: 1px solid var(--border);
    font-family: 'Share Tech Mono', monospace;
    font-size: 11px;
    background: var(--surface);
  }
  .stat { display: flex; gap: 8px; align-items: center; }
  .stat-value { color: var(--amber-bright); font-weight: 700; font-size: 14px; }
  .stat-label { color: var(--text-dim); letter-spacing: 0.08em; text-transform: uppercase; }

  .table-wrap {
    overflow-x: auto;
    padding: 0 40px 40px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 24px;
    font-size: 13px;
  }

  thead tr {
    border-bottom: 2px solid var(--amber);
  }

  th {
    padding: 10px 12px;
    text-align: left;
    font-size: 10px;
    font-family: 'Share Tech Mono', monospace;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-dim);
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    position: relative;
  }
  th:hover { color: var(--text); }
  th.sort-asc::after  { content: ' ↑'; color: var(--amber); }
  th.sort-desc::after { content: ' ↓'; color: var(--amber); }
  th.no-sort { cursor: default; }
  th.no-sort:hover { color: var(--text-dim); }

  tbody tr {
    border-bottom: 1px solid var(--border);
    transition: background 0.1s;
  }
  tbody tr:hover { background: var(--surface); }

  /* Weapon pair separator */
  tbody tr.pair-start { border-top: 2px solid var(--border-bright); }

  td { padding: 8px 12px; vertical-align: middle; }

  /* Icon cell */
  td.icon-cell { padding: 6px 10px; width: 56px; }
  .weapon-icon {
    width: 44px;
    height: 44px;
    object-fit: cover;
    border: 1px solid var(--border);
    display: block;
    background: var(--surface2);
  }
  .weapon-icon-placeholder {
    width: 44px;
    height: 44px;
    background: var(--surface2);
    border: 1px solid var(--border);
    display: grid;
    place-items: center;
    font-size: 18px;
    color: var(--border-bright);
  }

  /* Weapon name */
  td.name-cell {
    font-weight: 600;
    font-size: 14px;
    color: var(--text-bright);
    white-space: nowrap;
    letter-spacing: 0.03em;
  }

  /* Rarity badge */
  .badge {
    display: inline-block;
    padding: 2px 7px;
    font-size: 10px;
    font-family: 'Share Tech Mono', monospace;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    border: 1px solid currentColor;
  }
  .badge.legendary { color: var(--legendary); }
  .badge.exotic    { color: var(--exotic); background: rgba(200,146,42,0.08); }
  .badge.rare      { color: var(--rare); }

  /* Damage type dot */
  .damage-dot {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
  }
  .damage-dot::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .damage-dot.kinetic::before { background: var(--kinetic); }
  .damage-dot.arc::before     { background: var(--arc); box-shadow: 0 0 6px var(--arc); }
  .damage-dot.solar::before   { background: var(--solar); box-shadow: 0 0 6px var(--solar); }
  .damage-dot.void::before    { background: var(--void); box-shadow: 0 0 6px var(--void); }

  /* Mode badge */
  .mode-badge {
    font-family: 'Share Tech Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.1em;
    color: var(--text-dim);
    padding: 2px 6px;
    border: 1px solid var(--border);
  }

  .light-val {
    font-family: 'Share Tech Mono', monospace;
    font-size: 12px;
    color: var(--amber-bright);
    display: block;
    text-align: center;
  }

  /* Perk cells */
  td.perk-cell { max-width: 260px; }
  .perk-hit {
    color: #6dbe8a;
    font-weight: 600;
  }
  .perk-hit::before { content: '✓ '; color: #4a8a5a; }
  .perk-miss { color: var(--text-dim); font-size: 11px; font-family: 'Share Tech Mono', monospace; }
  .perk-miss .want { color: #c06060; }
  .perk-miss .has  { color: var(--text-dim); }
  .perk-na { color: var(--border-bright); }

  /* Result cell */
  .result-pill {
    display: inline-block;
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .result-pill.god-roll {
    background: rgba(200,146,42,0.15);
    border: 1px solid var(--amber);
    color: var(--amber-bright);
    box-shadow: 0 0 12px rgba(200,146,42,0.2);
  }
  .result-pill.close {
    background: rgba(74,124,158,0.12);
    border: 1px solid #4a7c9e;
    color: #7ab0d0;
  }
  .result-pill.no {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-dim);
  }
  .result-pill.unknown {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--border-bright);
    font-style: italic;
  }
  .result-pill.curated {
    background: rgba(120,160,120,0.08);
    border: 1px solid #5a8a6a;
    color: #8ab898;
    font-style: italic;
  }
  .result-pill.error {
    background: rgba(180,120,40,0.12);
    border: 1px solid #b07828;
    color: #d09840;
  }

  .hidden { display: none !important; }

  footer {
    padding: 24px 40px;
    border-top: 1px solid var(--border);
    font-family: 'Share Tech Mono', monospace;
    font-size: 10px;
    color: var(--text-dim);
    letter-spacing: 0.08em;
  }

  /* ── Modal ────────────────────────────────────────────────────────────────── */

  .modal-backdrop {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.82);
    z-index: 100;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .modal-backdrop.open { display: flex; }

  .modal {
    background: var(--surface);
    border: 1px solid var(--border-bright);
    width: 100%;
    max-width: 900px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 0 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(200,146,42,0.15);
    position: relative;
  }

  .modal-header {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 24px 24px 16px;
    border-bottom: 1px solid var(--border);
    background: linear-gradient(135deg, rgba(200,146,42,0.06) 0%, transparent 60%);
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .modal-icon {
    width: 72px;
    height: 72px;
    object-fit: cover;
    border: 2px solid var(--border-bright);
    flex-shrink: 0;
    background: var(--surface2);
  }
  .modal-icon-placeholder {
    width: 72px;
    height: 72px;
    background: var(--surface2);
    border: 2px solid var(--border);
    display: grid;
    place-items: center;
    font-size: 32px;
    color: var(--border-bright);
    flex-shrink: 0;
  }

  .modal-title-group { flex: 1; min-width: 0; }
  .modal-name {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-bright);
    letter-spacing: 0.06em;
    line-height: 1.1;
  }
  .modal-meta {
    margin-top: 6px;
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }

  .modal-close {
    background: none;
    border: 1px solid var(--border);
    color: var(--text-dim);
    width: 32px;
    height: 32px;
    font-size: 18px;
    cursor: pointer;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    transition: all 0.15s;
    line-height: 1;
  }
  .modal-close:hover { border-color: var(--amber); color: var(--amber); }

  .modal-body { padding: 24px; }

  /* Stats */
  .modal-section-title {
    font-family: 'Share Tech Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--amber);
    margin-bottom: 14px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 10px 24px;
    margin-bottom: 28px;
  }

  .stat-row { display: flex; flex-direction: column; gap: 4px; }
  .stat-label-row {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    letter-spacing: 0.06em;
  }
  .stat-name { color: var(--text-dim); text-transform: uppercase; font-family: 'Share Tech Mono', monospace; font-size: 10px; }
  .stat-value { color: var(--text-bright); font-weight: 700; font-size: 13px; }
  .stat-bar-track {
    height: 3px;
    background: var(--border);
    position: relative;
  }
  .stat-bar-fill {
    position: absolute;
    left: 0; top: 0; bottom: 0;
    background: var(--amber);
    transition: width 0.3s;
  }
  .stat-bar-fill.high { background: #6dbe8a; }
  .stat-bar-fill.mid  { background: var(--amber); }
  .stat-bar-fill.low  { background: #c06060; }

  /* Perk columns */
  .perk-columns {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding-bottom: 8px;
  }

  .perk-column {
    flex: 0 0 auto;
    width: 140px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .perk-column-label {
    font-family: 'Share Tech Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-dim);
    text-align: center;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--border);
  }

  .perk-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    padding: 8px 6px;
    border: 1px solid transparent;
    background: var(--surface2);
    transition: all 0.15s;
    cursor: default;
    position: relative;
  }
  .perk-option.is-rolled {
    border-color: var(--amber);
    background: var(--amber-glow);
  }
  .perk-option.is-rolled::before {
    content: '';
    position: absolute;
    inset: 0;
    box-shadow: inset 0 0 12px rgba(200,146,42,0.15);
    pointer-events: none;
  }
  .perk-option:hover { border-color: var(--border-bright); }
  .perk-option.is-rolled:hover { border-color: var(--amber-bright); }

  .perk-icon {
    width: 40px;
    height: 40px;
    object-fit: cover;
    image-rendering: pixelated;
  }
  .perk-icon-placeholder {
    width: 40px;
    height: 40px;
    background: var(--border);
    border-radius: 50%;
  }
  .perk-name {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-align: center;
    color: var(--text);
    line-height: 1.2;
  }
  .perk-option.is-rolled .perk-name { color: var(--amber-bright); }

  .perk-tooltip {
    display: none;
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--surface2);
    border: 1px solid var(--border-bright);
    padding: 8px 10px;
    font-size: 11px;
    color: var(--text);
    width: 200px;
    z-index: 200;
    line-height: 1.4;
    pointer-events: none;
  }
  .perk-option:hover .perk-tooltip { display: block; }

</style>
</head>
<body>

<header>
  <div class="header-emblem">⬡</div>
  <div>
    <h1>God Roll Evaluator</h1>
    <p>DESTINY 1 // WEAPON ANALYSIS REPORT // ${new Date().toISOString().slice(0,10).replace(/-/g,'.')}</p>
  </div>
</header>

<div class="controls">
  <span class="filter-label">Filter:</span>
  <button class="filter-btn active" data-filter="all">All</button>
  <button class="filter-btn" data-filter="god-roll">★ God Rolls</button>
  <button class="filter-btn" data-filter="close">~ Close</button>
  <button class="filter-btn" data-filter="no">✗ No</button>
  <button class="filter-btn" data-filter="curated">⚙ Curated</button>
  <button class="filter-btn" data-filter="unknown">? Unknown</button>
  <button class="filter-btn" data-filter="error">⚠ Error</button>
  <button class="filter-btn" data-filter="pvp">PvP</button>
  <button class="filter-btn" data-filter="pve">PvE</button>
  <div class="search-wrap">
    <input type="text" id="search" placeholder="Search weapon name…">
  </div>
</div>

<div class="stats-bar">
  <div class="stat"><span class="stat-value" id="stat-god">0</span><span class="stat-label">God Rolls</span></div>
  <div class="stat"><span class="stat-value" id="stat-close">0</span><span class="stat-label">Close</span></div>
  <div class="stat"><span class="stat-value" id="stat-total">0</span><span class="stat-label">Total Shown</span></div>
</div>

<div class="table-wrap">
<table id="results-table">
<thead>
<tr>
  <th class="no-sort">Icon</th>
  <th data-col="name">Weapon</th>
  <th data-col="type">Type</th>
  <th data-col="rarity">Rarity</th>
  <th data-col="damage">Damage</th>
  <th data-col="light">Light</th>
  <th data-col="mode">Mode</th>
  <th data-col="col1">Column 1</th>
  <th data-col="col2">Column 2</th>
  <th data-col="col3">Column 3</th>
  <th data-col="col4">Column 4</th>
  <th data-col="result">Result</th>
</tr>
</thead>
<tbody id="tbody"></tbody>
</table>
</div>

<footer>
  GOD ROLL DEFINITIONS: TRUEGAMING.BOARDS.NET // GENERATED BY D1-GOD-ROLL-EVALUATOR
</footer>

<!-- Detail modal -->
<div class="modal-backdrop" id="modal-backdrop">
  <div class="modal" id="modal" role="dialog" aria-modal="true">
    <div class="modal-header" id="modal-header">
      <div id="modal-icon-wrap"></div>
      <div class="modal-title-group">
        <div class="modal-name" id="modal-name"></div>
        <div class="modal-meta" id="modal-meta"></div>
      </div>
      <button class="modal-close" id="modal-close" aria-label="Close">✕</button>
    </div>
    <div class="modal-body" id="modal-body"></div>
  </div>
</div>

<script>
const RAW = ${rowsJson};

// ── Helpers ──────────────────────────────────────────────────────────────────

function iconError(el) {
  el.outerHTML = '<div class="weapon-icon-placeholder">⬡</div>';
}

// ── Rendering helpers ────────────────────────────────────────────────────────

function perkCell(val) {
  if (!val || val === '—') return '<span class="perk-na">—</span>';
  if (val.startsWith('✓')) {
    return '<span class="perk-hit">' + esc(val.slice(2)) + '</span>';
  }
  if (val.startsWith('✗')) {
    // format: ✗ want: ['X']; has: ['A','B']
    const wantStart = val.indexOf('want: ');
    const hasStart  = val.indexOf('has: ');
    const want = wantStart !== -1
      ? val.slice(wantStart + 6, hasStart !== -1 ? val.lastIndexOf(';', hasStart) : undefined).trim()
      : '';
    const has = hasStart !== -1 ? val.slice(hasStart + 5).trim() : '';
    return '<span class="perk-miss">'
      + '<span class="want">want: ' + esc(want) + '</span> '
      + '<span class="has">has: ' + esc(has) + '</span>'
      + '</span>';
  }
  return esc(val);
}

function resultPill(result) {
  const cls = result.includes('GOD')     ? 'god-roll'
    : result.includes('Close')           ? 'close'
    : result.includes('Curated')         ? 'curated'
    : result.includes('Error')           ? 'error'
    : result === '? —'                   ? 'unknown'
    : 'no';
  return '<span class="result-pill ' + cls + '">' + esc(result) + '</span>';
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// ── Table state ──────────────────────────────────────────────────────────────

let sortCol = 'result', sortDir = 1;
let filterMode = 'all';
let searchTerm = '';

function getRows() {
  let rows = [...RAW];

  // Filter
  if (filterMode === 'god-roll') rows = rows.filter(r => r.result.includes('GOD'));
  else if (filterMode === 'close')   rows = rows.filter(r => r.result.includes('Close'));
  else if (filterMode === 'no')      rows = rows.filter(r => r.result === '✗ No');
  else if (filterMode === 'curated') rows = rows.filter(r => r.result.includes('Curated'));
  else if (filterMode === 'unknown') rows = rows.filter(r => r.result === '? —');
  else if (filterMode === 'error')   rows = rows.filter(r => r.result.includes('Error'));
  else if (filterMode === 'pvp')     rows = rows.filter(r => r.mode === 'PvP');
  else if (filterMode === 'pve')     rows = rows.filter(r => r.mode === 'PvE');

  // Search
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    rows = rows.filter(r => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q));
  }

  // Sort
  rows.sort((a, b) => {
    let av = a[sortCol] ?? '', bv = b[sortCol] ?? '';
    if (sortCol === 'result') { av = a.resultRank; bv = b.resultRank; }
    if (typeof av === 'number') return (av - bv) * sortDir;
    return String(av).localeCompare(String(bv)) * sortDir;
  });

  return rows;
}

function render() {
  const rows = getRows();
  const tbody = document.getElementById('tbody');

  // Group by weapon name+instanceId to add pair-start class
  const seen = new Set();
  let html = '';
  for (const r of rows) {
    const key = r.name + '|' + (r.instanceId ?? '');
    const isPairStart = !seen.has(key);
    seen.add(key);

    let icon = null;
    if (r.icon) {
      icon = '<img class="weapon-icon" src="' + esc(r.icon) + '" alt="" loading="lazy" onerror="iconError(this)">';
    } else {
      icon = '<div class="weapon-icon-placeholder">⬡</div>';
    };

    const rarityClass = r.rarity.toLowerCase();
    const damageClass = DAMAGE_CLASS[r.damageRaw] ?? r.damage.toLowerCase();

    html += '<tr' + (isPairStart ? ' class="pair-start"' : '') + ' style="cursor:pointer" data-instanceid="' + esc(r.instanceId ?? '') + '" data-name="' + esc(r.name) + '" data-icon="' + esc(r.icon ?? '') + '" data-type="' + esc(r.type) + '" data-rarity="' + esc(r.rarity) + '" data-damage="' + esc(r.damage) + '" data-damageraw="' + esc(String(r.damageRaw ?? 0)) + '" data-light="' + esc(String(r.light ?? '')) + '">';
    html += '<td class="icon-cell">' + icon + '</td>';
    html += '<td class="name-cell">' + esc(r.name) + '</td>';
    html += '<td>' + esc(r.type) + '</td>';
    html += '<td><span class="badge ' + rarityClass + '">' + esc(r.rarity) + '</span></td>';
    html += '<td><span class="damage-dot ' + damageClass + '">' + esc(r.damage) + '</span></td>';
    html += '<td><span class="light-val">' + (r.light !== null ? r.light : '—') + '</span></td>';
    html += '<td><span class="mode-badge">' + esc(r.mode) + '</span></td>';
    html += '<td class="perk-cell">' + perkCell(r.col1) + '</td>';
    html += '<td class="perk-cell">' + perkCell(r.col2) + '</td>';
    html += '<td class="perk-cell">' + perkCell(r.col3) + '</td>';
    html += '<td class="perk-cell">' + perkCell(r.col4) + '</td>';
    html += '<td>' + resultPill(r.result) + '</td>';
    html += '</tr>';
  }

  tbody.innerHTML = html;

  // Update stats
  document.getElementById('stat-total').textContent = rows.length;
  document.getElementById('stat-god').textContent   = rows.filter(r => r.result.includes('GOD')).length;
  document.getElementById('stat-close').textContent = rows.filter(r => r.result.includes('Close')).length;
}

// Damage class needs to go into the data too
const DAMAGE_CLASS = { 0:'kinetic', 1:'kinetic', 2:'arc', 3:'solar', 4:'void' };

// ── Sort headers ─────────────────────────────────────────────────────────────

document.querySelectorAll('th[data-col]').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.dataset.col;
    if (sortCol === col) sortDir *= -1;
    else { sortCol = col; sortDir = 1; }
    document.querySelectorAll('th').forEach(t => t.classList.remove('sort-asc','sort-desc'));
    th.classList.add(sortDir === 1 ? 'sort-asc' : 'sort-desc');
    render();
  });
});

// ── Filter buttons ────────────────────────────────────────────────────────────

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterMode = btn.dataset.filter;
    render();
  });
});

// ── Search ────────────────────────────────────────────────────────────────────

document.getElementById('search').addEventListener('input', e => {
  searchTerm = e.target.value;
  render();
});

// ── Modal ─────────────────────────────────────────────────────────────────────

// Build a lookup: instanceId → modalData (from PvP rows which carry it)
const modalDataMap = {};
for (const r of RAW) {
  if (r.modalData && r.instanceId) modalDataMap[r.instanceId] = r.modalData;
}

function openModal(instanceId, name, icon, type, rarity, damage, damageRaw, light) {
  const data = modalDataMap[instanceId];

  // Header
  const iconWrap = document.getElementById('modal-icon-wrap');
  if (icon) {
    iconWrap.innerHTML = '<img class="modal-icon" src="' + esc(icon) + '" alt="" onerror="iconError(this)">';
  } else {
    iconWrap.innerHTML = '<div class="modal-icon-placeholder">⬡</div>';
  }

  document.getElementById('modal-name').textContent = name;
  const meta = document.getElementById('modal-meta');
  meta.innerHTML =
    '<span class="badge ' + rarity.toLowerCase() + '">' + esc(rarity) + '</span>' +
    '<span class="damage-dot ' + (DAMAGE_CLASS[damageRaw] ?? damage.toLowerCase()) + '">' + esc(damage) + '</span>' +
    (light !== null ? '<span class="light-val">⬡ ' + light + '</span>' : '') +
    '<span style="color:var(--text-dim);font-size:12px">' + esc(type) + '</span>';

  // Body
  const body = document.getElementById('modal-body');
  if (!data) {
    body.innerHTML = '<p style="color:var(--text-dim);font-family:Share Tech Mono,monospace;font-size:12px">No detail data available for this weapon.</p>';
  } else {
    let html = '';

    // Stats
    if (data.stats && data.stats.length > 0) {
      html += '<div class="modal-section-title">Stats</div>';
      html += '<div class="stats-grid">';
      for (const s of data.stats) {
        const pct = Math.round((s.value / (s.max || 100)) * 100);
        const cls = pct >= 70 ? 'high' : pct >= 40 ? 'mid' : 'low';
        html += '<div class="stat-row">';
        html += '<div class="stat-label-row"><span class="stat-name">' + esc(s.name) + '</span><span class="stat-value">' + s.value + '</span></div>';
        html += '<div class="stat-bar-track"><div class="stat-bar-fill ' + cls + '" style="width:' + pct + '%"></div></div>';
        html += '</div>';
      }
      html += '</div>';
    }

    // Perk columns
    if (data.columns && data.columns.length > 0) {
      html += '<div class="modal-section-title">Perks</div>';
      html += '<div class="perk-columns">';

      // Label columns sequentially — weapon types vary too much for hardcoded names
      const colsSeen = [];
      for (const col of data.columns) {
        if (!colsSeen.includes(col.colIndex)) colsSeen.push(col.colIndex);
      }
      colsSeen.sort((a, b) => a - b);

      for (const col of data.columns) {
        const colPos = colsSeen.indexOf(col.colIndex);
        const label  = 'Column ' + (colPos + 1);
        html += '<div class="perk-column">';
        html += '<div class="perk-column-label">' + esc(label) + '</div>';
        for (const opt of col.options) {
          const rolledClass = opt.isRolled ? ' is-rolled' : '';
          html += '<div class="perk-option' + rolledClass + '">';
          if (opt.icon) {
            html += '<img class="perk-icon" src="' + esc(opt.icon) + '" alt="" onerror="iconError(this)">';
          } else {
            html += '<div class="perk-icon-placeholder"></div>';
          }
          html += '<div class="perk-name">' + esc(opt.name) + '</div>';
          if (opt.desc) {
            html += '<div class="perk-tooltip">' + esc(opt.desc) + '</div>';
          }
          html += '</div>';
        }
        html += '</div>';
      }
      html += '</div>';
    }

    body.innerHTML = html;
  }

  document.getElementById('modal-backdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-backdrop').classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-backdrop').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// Make table rows clickable — attach to tbody via delegation
document.getElementById('tbody').addEventListener('click', (e) => {
  const row = e.target.closest('tr[data-instanceid]');
  if (!row) return;
  openModal(
    row.dataset.instanceid,
    row.dataset.name,
    row.dataset.icon,
    row.dataset.type,
    row.dataset.rarity,
    row.dataset.damage,
    parseInt(row.dataset.damageraw ?? '0', 10),
    row.dataset.light ? parseInt(row.dataset.light, 10) : null,
  );
});

// ── Initial render ────────────────────────────────────────────────────────────

// Set initial sort indicator
document.querySelector('th[data-col="result"]').classList.add('sort-asc');
render();
</script>
</body>
</html>`;
}
