// ── State ─────────────────────────────────────────────────────────────────────
let RAW = [];
let characters = [];
let characterIds = [];
let platformMembershipId = null;
let sortCol = 'result', sortDir = 1;
let filterMode   = 'all';
let tagFilter    = 'all';
let modeFilter   = 'all';
let slotFilter   = 'all'; // Primary / Special / Heavy
let typeFilter   = 'all'; // Sidearm, Rocket Launcher, etc.
let rarityFilter = 'all';
let damageFilter = 'all';
let searchTerm   = '';

let ARMOR_RAW            = [];
let armorLoaded          = false;
let armorClassFilter     = 'all';
let armorTypeFilter      = 'all';
let armorRankFilter      = 'all';
let armorLocationFilter  = 'all';
let armorTagFilter       = 'all';
let armorSortCol         = 'rank';
let armorSortDir         = 1;

// Quality max per slot — source: https://l0r3.dev/page/Destiny-1-Maximum-Possible-Armor-Stats
const ARMOR_MAX = {
  'Helmet': 111, 'Gloves': 99, 'Chest': 147, 'Legs': 135,
  'Class Item': 60, 'Ghost': 60, 'Artifact': 131,
};

function armorRank(quality) {
  if (quality === null || quality === undefined) return '—';
  if (quality >= 100) return 'S';
  if (quality >= 95)  return 'A';
  if (quality >= 90)  return 'B';
  if (quality >= 80)  return 'C';
  if (quality >= 70)  return 'D';
  return 'F';
}
const DAMAGE_CLASS = { 0:'kinetic', 1:'kinetic', 2:'arc', 3:'solar', 4:'void' };

// ── Tag system ────────────────────────────────────────────────────────────────
const TAGS = {
  favorite: { label: '⭐ Favorite', cls: 'tag-favorite' },
  keep:     { label: '👍 Keep',     cls: 'tag-keep'     },
  upgrade:  { label: '⬆️ Upgrade',  cls: 'tag-upgrade'  },
  evaluate: { label: '🔍 Evaluate', cls: 'tag-evaluate'  },
  infuse:   { label: '🔺 Infuse',   cls: 'tag-infuse'   },
  junk:     { label: '🗑️ Junk',     cls: 'tag-junk'     },
  archive:  { label: '📦 Archive',  cls: 'tag-archive'  },
};
const STORAGE_KEY = 'd1-god-roll-tags';

function loadTags() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'); }
  catch { return {}; }
}

function saveTag(instanceId, tagValue) {
  const tags = loadTags();
  if (tagValue) tags[instanceId] = tagValue;
  else delete tags[instanceId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
}

function getTag(instanceId) {
  return loadTags()[instanceId] ?? null;
}

// ── View switching ─────────────────────────────────────────────────────────────
function show(id) {
  ['landing','loading-view','error-view','app'].forEach(v => {
    document.getElementById(v).style.display = v === id ? (id === 'app' ? 'block' : 'flex') : 'none';
  });
}

// ── Auth ──────────────────────────────────────────────────────────────────────
async function checkAuth() {
  const res = await fetch('/auth/status');
  const data = await res.json();
  if (!data.authenticated) {
    show('landing');
    return false;
  }
  document.getElementById('guardian-name').textContent = data.displayName ?? '';
  document.getElementById('btn-logout').style.display = 'inline-block';
  document.getElementById('btn-refresh').style.display = 'inline-block';
  document.getElementById('btn-export-tags').style.display = 'inline-block';
  document.getElementById('btn-import-tags').style.display = 'inline-block';
  document.getElementById('header-search').style.display = 'block';
  document.getElementById('header-sub').textContent =
    'DESTINY 1 // ' + (data.platform ?? '').toUpperCase() + ' // ' + (data.displayName ?? '').toUpperCase();
  await loadPlatforms(data.membershipType);
  return true;
}

async function loadPlatforms(currentMembershipType) {
  const sel = document.getElementById('platform-select');
  try {
    const res  = await fetch('/api/platforms');
    const data = await res.json();
    if (!data.ok || data.memberships.length <= 1) {
      sel.style.display = 'none';
      return;
    }
    sel.innerHTML = data.memberships.map(m =>
      '<option value="' + m.membershipType + '"' + (m.current ? ' selected' : '') + '>'
      + m.platform + ' — ' + esc(m.displayName) + '</option>'
    ).join('');
    sel.style.display = 'inline-block';
    sel.addEventListener('change', async () => {
      const newType = parseInt(sel.value, 10);
      await fetch('/api/platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipType: newType }),
      });
      // Reset and reload inventory for the new platform
      RAW = [];
      ARMOR_RAW = [];
      armorLoaded = false;
      vendorRows_ = [];
      vendorsLoaded = false;
      Object.keys(modalDataMap).forEach(k => delete modalDataMap[k]);
      Object.keys(transferMeta).forEach(k => delete transferMeta[k]);
      document.getElementById('vendors-container').innerHTML = '';
      await loadInventory();
    });
  } catch {
    sel.style.display = 'none';
  }
}

document.getElementById('btn-logout').addEventListener('click', async () => {
  await fetch('/auth/logout', { method: 'POST' });
  location.reload();
});

// ── Inventory load ─────────────────────────────────────────────────────────────
const loadingMessages = [
  'Loading manifest data',
  'Fetching character inventories',
  'Fetching vault',
  'Evaluating rolls',
  'Building report',
];
let loadingMsgIdx = 0;
let loadingInterval = null;

function startLoadingAnimation() {
  loadingMsgIdx = 0;
  document.getElementById('loading-step').textContent = loadingMessages[0];
  loadingInterval = setInterval(() => {
    loadingMsgIdx = (loadingMsgIdx + 1) % loadingMessages.length;
    document.getElementById('loading-step').textContent = loadingMessages[loadingMsgIdx];
  }, 2200);
}

function stopLoadingAnimation() {
  clearInterval(loadingInterval);
}

async function loadInventory() {
  // Show the app shell (tab bar + filters) immediately so the UI is never a blank page
  show('app');
  const loadingHtml = tabLoadingHtml('Evaluating your arsenal…');
  document.getElementById('stat-total').textContent = '—';
  document.getElementById('stat-god').textContent   = '—';
  document.getElementById('stat-close').textContent = '—';
  document.getElementById('tbody').innerHTML =
    '<tr><td colspan="13">' + loadingHtml + '</td></tr>';
  document.getElementById('weapon-cards').innerHTML = loadingHtml;
  updateLayout();
  try {
    const res = await fetch('/api/inventory');
    const raw = await res.json();
    if (!raw.ok) throw new Error(raw.error ?? 'Unknown error');
    // Deep-clone via JSON round-trip to ensure all objects are in this page's
    // JS context — avoids Firefox XrayWrapper cross-origin object errors
    const data = JSON.parse(JSON.stringify(raw));
    RAW = data.rows;
    characters = data.characters ?? [];
    characterIds = data.characterIds ?? [];
    platformMembershipId = data.platformMembershipId ?? null;
    for (const r of RAW) {
      if (r.instanceId) {
        if (r.modalData) modalDataMap[r.instanceId] = r.modalData;
        if (r.itemHash !== undefined) {
          transferMeta[r.instanceId] = {
            itemHash:       r.itemHash,
            characterId:    r.characterId,
            transferStatus: r.transferStatus,
            location:       r.location,
          };
        }
      }
    }
    document.querySelector('th[data-col="result"]').classList.add('sort-asc');
    render();
  } catch (err) {
    document.getElementById('error-msg').textContent = 'Failed to load inventory: ' + err.message;
    show('error-view');
  }
}

document.getElementById('btn-refresh').addEventListener('click', () => {
  RAW = [];
  ARMOR_RAW = [];
  armorLoaded = false;
  vendorRows_ = [];
  vendorsLoaded = false;
  Object.keys(modalDataMap).forEach(k => delete modalDataMap[k]);
  Object.keys(transferMeta).forEach(k => delete transferMeta[k]);
  slotFilter = typeFilter = rarityFilter = damageFilter = 'all';
  loadInventory();
});

document.getElementById('btn-export-tags').addEventListener('click', () => {
  const tags = loadTags();
  const json = JSON.stringify(tags, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'd1-armory-tags.json';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('btn-import-tags').addEventListener('click', () => {
  document.getElementById('import-tags-input').click();
});

document.getElementById('import-tags-input').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const imported = JSON.parse(ev.target.result);
      if (typeof imported !== 'object' || Array.isArray(imported)) {
        alert('Invalid tag file — expected a JSON object.');
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
      render();
    } catch {
      alert('Failed to parse tag file — make sure it is valid JSON.');
    } finally {
      // Reset so the same file can be re-imported if needed
      e.target.value = '';
    }
  };
  reader.readAsText(file);
});

// ── Rendering helpers ─────────────────────────────────────────────────────────
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function iconError(el, cls) {
  el.outerHTML = '<div' + (cls ? ' class="' + cls + '"' : '') + '>⬡</div>';
}

function tabLoadingHtml(msg) {
  return '<div class="tab-loading"><div class="spinner"></div>'
    + '<div class="tab-loading-text">' + esc(msg) + '</div></div>';
}

function perkCell(val) {
  if (!val || val === '—') return '<span class="perk-na">—</span>';
  if (val.startsWith('✓')) return '<span class="perk-hit">' + esc(val.slice(2)) + '</span>';
  if (val.startsWith('✗')) {
    const wantStart = val.indexOf('want: ');
    const hasStart  = val.indexOf('has: ');
    const want = wantStart !== -1 ? val.slice(wantStart + 6, hasStart !== -1 ? val.lastIndexOf(';', hasStart) : undefined).trim() : '';
    const has  = hasStart  !== -1 ? val.slice(hasStart + 5).trim() : '';
    return '<span class="perk-miss"><span class="want">want: ' + esc(want) + '</span> <span class="has">has: ' + esc(has) + '</span></span>';
  }
  return esc(val);
}

function resultPill(result) {
  const cls = result.includes('GOD') ? 'god-roll'
    : result.includes('Close')       ? 'close'
    : result.includes('Curated')     ? 'curated'
    : result.includes('Error')       ? 'error'
    : result === '? —'               ? 'unknown'
    : 'no';
  return '<span class="result-pill ' + cls + '">' + esc(result) + '</span>';
}

// ── Dynamic filter buttons (static in HTML, wired here) ───────────────────────

document.querySelectorAll('.dyn-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const group = btn.dataset.dyn;
    document.querySelectorAll(`.dyn-filter-btn[data-dyn="${group}"]`).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const val = btn.dataset.val;
    if (group === 'slot')   slotFilter   = val;
    if (group === 'type')   typeFilter   = val;
    if (group === 'rarity') rarityFilter = val;
    if (group === 'damage') damageFilter = val;
    render();
  });
});

function getRows() {
  let rows = [...RAW];

  // Result/mode filter
  if (filterMode === 'god-roll') rows = rows.filter(r => r.result.includes('GOD'));
  else if (filterMode === 'close')   rows = rows.filter(r => r.result.includes('Close'));
  else if (filterMode === 'no')      rows = rows.filter(r => r.result === '✗ No');
  else if (filterMode === 'curated') rows = rows.filter(r => r.result.includes('Curated'));
  else if (filterMode === 'unknown') rows = rows.filter(r => r.result === '? —');
  else if (filterMode === 'error')   rows = rows.filter(r => r.result.includes('Error'));
  else if (filterMode === 'pvp')     rows = rows.filter(r => r.mode === 'PvP');
  else if (filterMode === 'pve')     rows = rows.filter(r => r.mode === 'PvE');

  // Mode filter
  if (modeFilter === 'pvp') rows = rows.filter(r => r.mode === 'PvP');
  else if (modeFilter === 'pve') rows = rows.filter(r => r.mode === 'PvE');

  // Slot / type / rarity / damage filters (match on any row in the pair)
  if (slotFilter   !== 'all') rows = rows.filter(r => r.slot   === slotFilter);
  if (typeFilter   !== 'all') rows = rows.filter(r => r.type   === typeFilter);
  if (rarityFilter !== 'all') rows = rows.filter(r => r.rarity === rarityFilter);
  if (damageFilter !== 'all') rows = rows.filter(r => r.damage === damageFilter);

  // Tag filter — applied independently (AND with result filter)
  if (tagFilter !== 'all') {
    const tags = loadTags();
    if (tagFilter === 'none') {
      rows = rows.filter(r => !tags[r.instanceId]);
    } else {
      rows = rows.filter(r => tags[r.instanceId] === tagFilter);
    }
  }

  // Search
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    rows = rows.filter(r => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q));
  }

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

  // Group rows into weapon pairs: { pvp, pve, instanceId, ... }
  // A pair may be missing one mode if filtered to PvP or PvE only.
  const pairMap = new Map();
  for (const r of rows) {
    const key = r.instanceId ?? (r.name + '|' + r.mode);
    if (!pairMap.has(key)) pairMap.set(key, {});
    pairMap.get(key)[r.mode] = r;
  }
  const pairs = [...pairMap.values()];

  let html = '';
  for (const pair of pairs) {
    const pvp = pair['PvP'];
    const pve = pair['PvE'];
    const rep = pvp ?? pve; // representative row for shared cells
    const iid = rep.instanceId ?? '';
    const bothModes = !!(pvp && pve);
    const rowspan = bothModes ? ' rowspan="2"' : '';

    const icon = rep.icon
      ? '<img class="weapon-icon" src="' + esc(rep.icon) + '" alt="" loading="lazy" onerror="iconError(this,\'weapon-icon-placeholder\')">'
      : '<div class="weapon-icon-placeholder">⬡</div>';
    const rarityClass = rep.rarity.toLowerCase();
    const damageClass = DAMAGE_CLASS[rep.damageRaw] ?? rep.damage.toLowerCase();

    const tag     = getTag(iid);
    const tagInfo = tag ? TAGS[tag] : null;
    const tagCell = '<td class="tag-cell"' + rowspan + ' data-iid="' + esc(iid) + '">'
      + '<span class="tag-pill ' + (tagInfo ? tagInfo.cls : '') + '" onclick="openTagDropdown(event,\'' + esc(iid) + '\')">'
      + (tagInfo ? tagInfo.label : '+ Tag') + '</span>'
      + '<div class="tag-dropdown" id="td-' + esc(iid) + '">'
      + Object.entries(TAGS).map(([val, info]) =>
        '<button class="tag-option' + (tag === val ? ' active' : '') + '" onclick="setTag(event,\'' + esc(iid) + '\',\'' + val + '\')">' + info.label + '</button>'
      ).join('')
      + '<button class="tag-option clear" onclick="setTag(event,\'' + esc(iid) + '\',null)">❌ Clear</button>'
      + '</div></td>';

    const sharedAttrs = ' style="cursor:pointer"'
      + ' data-instanceid="' + esc(iid) + '"'
      + ' data-name="' + esc(rep.name) + '"'
      + ' data-icon="' + esc(rep.icon ?? '') + '"'
      + ' data-type="' + esc(rep.type) + '"'
      + ' data-rarity="' + esc(rep.rarity) + '"'
      + ' data-damage="' + esc(rep.damage) + '"'
      + ' data-damageraw="' + esc(String(rep.damageRaw ?? 0)) + '"'
      + ' data-light="' + esc(String(rep.light ?? '')) + '"';

    // Shared cells — only in first row, with rowspan if both modes present
    const sharedCells =
      '<td class="icon-cell"' + rowspan + '>' + icon + '</td>'
      + '<td class="name-cell"' + rowspan + '>' + esc(rep.name) + '</td>'
      + '<td' + rowspan + '>' + esc(rep.type) + '</td>'
      + '<td' + rowspan + '><span class="badge ' + rarityClass + '">' + esc(rep.rarity) + '</span></td>'
      + '<td' + rowspan + '><span class="damage-dot ' + damageClass + '">' + esc(rep.damage) + '</span></td>'
      + '<td' + rowspan + '><span class="light-val">' + (rep.light !== null ? rep.light : '—') + '</span></td>';

    // First row (PvE if available, else the single mode)
    const firstRow = pve ?? pvp;
    html += '<tr class="pair-start"' + sharedAttrs + '>';
    html += sharedCells;
    html += '<td><span class="mode-badge mode-' + firstRow.mode.toLowerCase() + '">' + esc(firstRow.mode) + '</span></td>';
    html += '<td class="perk-cell">' + perkCell(firstRow.col1) + '</td>';
    html += '<td class="perk-cell">' + perkCell(firstRow.col2) + '</td>';
    html += '<td class="perk-cell">' + perkCell(firstRow.col3) + '</td>';
    html += '<td class="perk-cell">' + perkCell(firstRow.col4) + '</td>';
    html += '<td>' + resultPill(firstRow.result) + '</td>';
    html += tagCell;
    html += '</tr>';

    // Second row (PvP) — only if both modes present
    if (bothModes) {
      html += '<tr class="pair-end"' + sharedAttrs + '>';
      html += '<td><span class="mode-badge mode-pvp">' + esc(pvp.mode) + '</span></td>';
      html += '<td class="perk-cell">' + perkCell(pvp.col1) + '</td>';
      html += '<td class="perk-cell">' + perkCell(pvp.col2) + '</td>';
      html += '<td class="perk-cell">' + perkCell(pvp.col3) + '</td>';
      html += '<td class="perk-cell">' + perkCell(pvp.col4) + '</td>';
      html += '<td>' + resultPill(pvp.result) + '</td>';
      html += '</tr>';
    }
  }

  tbody.innerHTML = html;

  // ── Mobile card view ──────────────────────────────────────────────────────
  const cardsEl = document.getElementById('weapon-cards');
  let cardHtml = '';
  for (const pair of pairs) {
    const pvp = pair['PvP'];
    const pve = pair['PvE'];
    const rep = pvp ?? pve;
    const iid = rep.instanceId ?? '';
    const tag = getTag(iid);
    const tagInfo = tag ? TAGS[tag] : null;
    const damageClass = DAMAGE_CLASS[rep.damageRaw] ?? rep.damage.toLowerCase();

    const cardAttrs = ' data-instanceid="' + esc(iid) + '"'
      + ' data-name="' + esc(rep.name) + '"'
      + ' data-icon="' + esc(rep.icon ?? '') + '"'
      + ' data-type="' + esc(rep.type) + '"'
      + ' data-rarity="' + esc(rep.rarity) + '"'
      + ' data-damage="' + esc(rep.damage) + '"'
      + ' data-damageraw="' + esc(String(rep.damageRaw ?? 0)) + '"'
      + ' data-light="' + esc(String(rep.light ?? '')) + '"';

    cardHtml += '<div class="weapon-card"' + cardAttrs + '>';

    // Icon
    cardHtml += rep.icon
      ? '<img class="weapon-card-icon" src="' + esc(rep.icon) + '" alt="" loading="lazy" onerror="iconError(this,\'weapon-card-icon-placeholder\')">'
      : '<div class="weapon-card-icon-placeholder">⬡</div>';

    // Body
    cardHtml += '<div class="weapon-card-body">';
    cardHtml += '<div class="weapon-card-name">' + esc(rep.name) + '</div>';
    const weaponMeta     = transferMeta[iid];
    const weaponLoc      = weaponMeta?.location;
    const weaponIsVault  = weaponLoc === 2;
    const weaponLocLabel = weaponIsVault
      ? 'vault'
      : (characters.find(c => c.characterId === weaponMeta?.characterId)?.className ?? null);
    const weaponLocClass = weaponIsVault ? 'loc-vault' : '';

    cardHtml += '<div class="weapon-card-meta">';
    cardHtml += '<span class="badge ' + rep.rarity.toLowerCase() + '">' + esc(rep.rarity) + '</span>';
    cardHtml += '<span class="damage-dot ' + damageClass + '">' + esc(rep.damage) + '</span>';
    if (rep.light) cardHtml += '<span class="light-val" style="font-size:11px">⬡ ' + rep.light + '</span>';
    if (weaponLocLabel) cardHtml += '<span class="item-card-location ' + weaponLocClass + '">' + esc(weaponLocLabel) + '</span>';
    cardHtml += '</div>';
    cardHtml += '<div class="weapon-card-pills">';
    if (pve) cardHtml += resultPill(pve.result) + ' ';
    if (pvp) cardHtml += resultPill(pvp.result);
    cardHtml += '</div>';
    cardHtml += '</div>';

    // Tag indicator
    if (tagInfo) {
      cardHtml += '<span class="weapon-card-tag ' + tagInfo.cls + '">' + tagInfo.label + '</span>';
    }

    cardHtml += '</div>';
  }
  cardsEl.innerHTML = cardHtml;

  // Wire card clicks to modal
  cardsEl.querySelectorAll('.weapon-card').forEach(card => {
    card.addEventListener('click', () => {
      openModal(
        card.dataset.instanceid, card.dataset.name, card.dataset.icon,
        card.dataset.type, card.dataset.rarity, card.dataset.damage,
        parseInt(card.dataset.damageraw ?? '0', 10),
        card.dataset.light ? parseInt(card.dataset.light, 10) : null,
      );
    });
  });

  // Count weapons (pairs), not rows
  document.getElementById('stat-total').textContent = pairs.length;
  document.getElementById('stat-god').textContent   = pairs.filter(p => Object.values(p).some(r => r.result.includes('GOD'))).length;
  document.getElementById('stat-close').textContent = pairs.filter(p => Object.values(p).some(r => r.result.includes('Close'))).length;

  updateLayout();
}

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

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterMode = btn.dataset.filter;
    render();
  });
});

document.querySelectorAll('.mode-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    modeFilter = btn.dataset.mode;
    render();
  });
});

document.querySelectorAll('.tag-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tag-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    tagFilter = btn.dataset.tag;
    render();
  });
});

document.getElementById('search').addEventListener('input', e => {
  searchTerm = e.target.value;
  if (activeTab === 'weapons') render();
  else if (activeTab === 'armor' && armorLoaded) renderArmor();
});

// ── Tag dropdown ──────────────────────────────────────────────────────────────
let openDropdownId = null;

function openTagDropdown(e, instanceId) {
  e.stopPropagation();
  // Close any already-open dropdown
  if (openDropdownId && openDropdownId !== instanceId) {
    const prev = document.getElementById('td-' + openDropdownId);
    if (prev) prev.classList.remove('open');
  }
  const dd = document.getElementById('td-' + instanceId);
  if (!dd) return;
  const isOpen = dd.classList.contains('open');
  dd.classList.toggle('open', !isOpen);
  openDropdownId = isOpen ? null : instanceId;
}

function setTag(e, instanceId, tagValue) {
  e.stopPropagation();
  saveTag(instanceId, tagValue);
  // Close dropdown
  const dd = document.getElementById('td-' + instanceId);
  if (dd) dd.classList.remove('open');
  openDropdownId = null;
  // Re-render the active tab and update modal tag if open
  if (activeTab === 'armor') renderArmor();
  else render();
  if (document.getElementById('modal-backdrop').classList.contains('open')) {
    renderModalTag(instanceId);
  }
}

// Close dropdowns when clicking outside
document.addEventListener('click', () => {
  if (openDropdownId) {
    const dd = document.getElementById('td-' + openDropdownId);
    if (dd) dd.classList.remove('open');
    openDropdownId = null;
  }
});
const modalDataMap = {};
const transferMeta = {};

// ── Transfer ──────────────────────────────────────────────────────────────────

/**
 * Transfer an item. If moving between characters, does vault as intermediate.
 * destCharId: character ID to send to, or null for vault.
 */
async function transferItem(instanceId, destCharId) {
  const meta = transferMeta[instanceId];
  if (!meta) return { ok: false, error: 'No transfer metadata for this item' };

  const { itemHash, characterId: sourceCharId, transferStatus, location } = meta;
  const LOCATION_CHARACTER = 1;
  const LOCATION_VAULT = 2;

  if (transferStatus !== 0) {
    return { ok: false, error: transferStatus === 1 ? 'Item is equipped — unequip it first' : 'Item cannot be transferred' };
  }

  const doTransfer = async (charId, toVault) => {
    const res = await fetch('/api/transfer', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ itemId: instanceId, itemHash, characterId: charId, transferToVault: toVault }),
    });
    return res.json();
  };

  try {
    if (destCharId === null) {
      // Move to vault
      if (location === LOCATION_VAULT) return { ok: false, error: 'Item is already in the vault' };
      return await doTransfer(sourceCharId, true);
    } else {
      // Move to a character
      if (location === LOCATION_CHARACTER && sourceCharId === destCharId) {
        return { ok: false, error: 'Item is already on that character' };
      }
      if (location === LOCATION_CHARACTER) {
        // Character → vault first
        const step1 = await doTransfer(sourceCharId, true);
        if (!step1.ok) return step1;
      }
      // Vault → destination character
      return await doTransfer(destCharId, false);
    }
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function handleEquip(instanceId, charId, btnEl) {
  btnEl.disabled = true;
  btnEl.querySelector('.transfer-btn-label').textContent = '…';
  const res    = await fetch('/api/equip', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ itemId: instanceId, characterId: charId }),
  });
  const result = await res.json();
  if (result.ok) {
    const meta = transferMeta[instanceId];
    if (meta) {
      meta.transferStatus = 1; // now equipped
      meta.characterId    = charId;
      meta.location       = 1;
    }
    renderTransferButtons(instanceId);
    refreshInventoryBackground();
  } else {
    btnEl.disabled = false;
    btnEl.querySelector('.transfer-btn-label').textContent = btnEl.dataset.label;
    alert('Equip failed: ' + result.error);
  }
}

async function handleTransfer(instanceId, destCharId, btnEl) {
  btnEl.disabled = true;
  btnEl.textContent = '…';
  const result = await transferItem(instanceId, destCharId);
  if (result.ok) {
    // Update local metadata so buttons reflect new location
    const meta = transferMeta[instanceId];
    if (meta) {
      meta.location   = destCharId === null ? 2 : 1;
      meta.characterId = destCharId;
    }
    renderTransferButtons(instanceId);
    // Also trigger a background inventory refresh so table stays current
    refreshInventoryBackground();
  } else {
    btnEl.disabled = false;
    btnEl.textContent = btnEl.dataset.label;
    alert('Transfer failed: ' + result.error);
  }
}

// Lightweight background refresh — updates RAW without showing the loading screen
async function refreshInventoryBackground() {
  try {
    const res  = await fetch('/api/inventory');
    const raw  = await res.json();
    if (!raw.ok) return;
    const data = JSON.parse(JSON.stringify(raw));
    RAW = data.rows;
    characters = data.characters ?? characters;
    characterIds = data.characterIds ?? characterIds;
    platformMembershipId = data.platformMembershipId ?? platformMembershipId;
    for (const r of RAW) {
      if (r.instanceId) {
        if (r.modalData) modalDataMap[r.instanceId] = r.modalData;
        if (r.itemHash !== undefined) {
          transferMeta[r.instanceId] = {
            itemHash: r.itemHash, characterId: r.characterId,
            transferStatus: r.transferStatus, location: r.location,
          };
        }
      }
    }
    render();
  } catch { /* silent — user can manual refresh */ }
}

function renderTransferButtons(instanceId) {
  const container = document.getElementById('modal-transfer-section');
  if (!container) return;
  if (!instanceId) { container.innerHTML = ''; return; }
  const meta = transferMeta[instanceId];
  if (!meta) { container.innerHTML = ''; return; }

  const { characterId: currentCharId, transferStatus, location } = meta;
  const LOCATION_VAULT = 2;
  const canTransfer = transferStatus === 0;
  const isEquipped  = transferStatus === 1;

  let html = '<div class="manage-location-box">';
  html += '<div class="manage-location-title">Manage Location</div>';

  if (!canTransfer && !isEquipped) {
    html += '<p class="transfer-disabled">This item cannot be transferred.</p>';
  } else {
    // ── Equip row ──────────────────────────────────────────────────────────
    html += '<div class="manage-location-section">';
    html += '<div class="manage-location-section-label">Equip</div>';
    html += '<div class="transfer-group">';
    for (const char of characters) {
      const onThisChar   = location !== LOCATION_VAULT && currentCharId === char.characterId;
      const alreadyEquip = isEquipped && onThisChar;
      const canEquip     = onThisChar && !alreadyEquip;
      const label        = char.raceName + ' ' + char.className;
      const bgStyle      = char.emblemBackgroundPath
        ? 'background-image:url(' + esc(char.emblemBackgroundPath) + ');background-size:cover;background-position:center left;'
        : '';
      html += '<button class="transfer-btn transfer-btn-emblem' + (alreadyEquip ? ' current' : '') + '"'
        + (!canEquip ? ' disabled' : '')
        + ' style="' + bgStyle + '"'
        + ' data-label="' + esc(label) + '"'
        + ' onclick="handleEquip(\'' + esc(instanceId) + '\',\'' + esc(char.characterId) + '\', this)">'
        + '<span class="transfer-btn-label">' + esc(label) + '</span>'
        + '</button>';
    }
    html += '</div></div>';

    // ── Move row ───────────────────────────────────────────────────────────
    html += '<div class="manage-location-section">';
    html += '<div class="manage-location-section-label">Move</div>';
    html += '<div class="transfer-group">';

    if (canTransfer) {
      // Vault button
      const inVault = location === LOCATION_VAULT;
      html += '<button class="transfer-btn' + (inVault ? ' current' : '') + '"'
        + (inVault ? ' disabled' : '')
        + ' data-label="📦 Vault"'
        + ' onclick="handleTransfer(\'' + esc(instanceId) + '\', null, this)">'
        + '📦 Vault</button>';

      for (const char of characters) {
        const isCurrent = location !== LOCATION_VAULT && currentCharId === char.characterId;
        const label     = char.raceName + ' ' + char.className;
        const bgStyle   = char.emblemBackgroundPath
          ? 'background-image:url(' + esc(char.emblemBackgroundPath) + ');background-size:cover;background-position:center left;'
          : '';
        html += '<button class="transfer-btn transfer-btn-emblem' + (isCurrent ? ' current' : '') + '"'
          + (isCurrent ? ' disabled' : '')
          + ' style="' + bgStyle + '"'
          + ' data-label="' + esc(label) + '"'
          + ' onclick="handleTransfer(\'' + esc(instanceId) + '\',\'' + esc(char.characterId) + '\', this)">'
          + '<span class="transfer-btn-label">' + esc(label) + '</span>'
          + '</button>';
      }
    } else {
      html += '<span class="transfer-disabled">Unequip item before moving</span>';
    }

    html += '</div></div>';
  }

  html += '</div>';
  container.innerHTML = html;
}

function renderModalTag(instanceId) {
  const container = document.getElementById('modal-tag-section');
  if (!container) return;
  if (!instanceId) { container.innerHTML = ''; return; }
  const tag = getTag(instanceId);
  let html = '<div class="modal-section-title">Tag</div><div class="tag-group">';
  for (const [val, info] of Object.entries(TAGS)) {
    html += '<button class="tag-btn' + (tag === val ? ' active' : '') + '" onclick="setTag(event,\'' + esc(instanceId) + '\',\'' + val + '\')">' + info.label + '</button>';
  }
  html += '<button class="tag-btn" onclick="setTag(event,\'' + esc(instanceId) + '\',null)" style="color:#c06060">❌ Clear</button>';
  html += '</div>';
  container.innerHTML = html;
}

function openModal(instanceId, name, icon, type, rarity, damage, damageRaw, light, isVendorItem) {
  const data = modalDataMap[instanceId] ?? VENDOR_MODAL_DATA[instanceId];
  const iconWrap = document.getElementById('modal-icon-wrap');
  iconWrap.innerHTML = icon
    ? '<img class="modal-icon" src="' + esc(icon) + '" alt="" onerror="iconError(this,\'modal-icon-placeholder\')">'
    : '<div class="modal-icon-placeholder">⬡</div>';

  document.getElementById('modal-name').textContent = name;
  document.getElementById('modal-meta').innerHTML =
    '<span class="badge ' + rarity.toLowerCase() + '">' + esc(rarity) + '</span>' +
    '<span class="damage-dot ' + (DAMAGE_CLASS[damageRaw] ?? damage.toLowerCase()) + '">' + esc(damage) + '</span>' +
    (light !== null ? '<span class="light-val">⬡ ' + light + '</span>' : '') +
    '<span style="color:var(--text-dim);font-size:12px">' + esc(type) + '</span>';

  renderModalTag(isVendorItem ? null : instanceId);
  renderTransferButtons(isVendorItem ? null : instanceId);

  const body = document.getElementById('modal-content');
  if (!data) {
    body.innerHTML = '<p style="color:var(--text-dim);font-family:Share Tech Mono,monospace;font-size:12px">No detail data available.</p>';
  } else {
    let html = '';
    if (data.stats && data.stats.length > 0) {
      html += '<div class="modal-section-title">Stats</div><div class="stats-grid">';
      for (const s of data.stats) {
        const pct = Math.round((s.value / (s.max || 100)) * 100);
        const cls = pct >= 70 ? 'high' : pct >= 40 ? 'mid' : 'low';
        html += '<div class="stat-row"><div class="stat-label-row"><span class="stat-name">' + esc(s.name) + '</span><span class="stat-value">' + s.value + '</span></div><div class="stat-bar-track"><div class="stat-bar-fill ' + cls + '" style="width:' + pct + '%"></div></div></div>';
      }
      html += '</div>';
    }

    const pvpRow = RAW.find(r => r.instanceId === instanceId && r.mode === 'PvP')
      ?? vendorRows_?.find(r => r.instanceId === instanceId && r.mode === 'PvP');
    const pveRow = RAW.find(r => r.instanceId === instanceId && r.mode === 'PvE')
      ?? vendorRows_?.find(r => r.instanceId === instanceId && r.mode === 'PvE');
    if (pvpRow || pveRow) {
      html += '<div class="modal-section-title">God Roll Evaluation</div><div class="god-roll-eval">';
      for (const [modeKey, row] of [['pve', pveRow], ['pvp', pvpRow]]) {
        if (!row) continue;
        const label = modeKey === 'pvp' ? 'PvP' : 'PvE';
        const resultText = row.result ?? '—';
        const badgeCls = resultText.includes('GOD') ? 'god' : resultText.includes('Close') ? 'close' : 'no';
        html += '<div class="god-roll-mode ' + modeKey + '"><div class="god-roll-mode-title">' + label + '</div>';
        html += '<div class="god-roll-result-badge ' + badgeCls + '">' + esc(resultText + (row.source ? ' (' + row.source + ')' : '')) + '</div>';
        html += '<div class="god-roll-col-list">';
        for (const [idx, colVal] of [[1, row.col1],[2, row.col2],[3, row.col3],[4, row.col4]]) {
          if (!colVal || colVal === '—') continue;
          const isHit  = colVal.startsWith('✓');
          const isMiss = colVal.startsWith('✗');
          const cls    = isHit ? 'god-roll-col-hit' : isMiss ? 'god-roll-col-miss' : 'god-roll-col-na';
          let display  = isHit ? colVal.slice(2) : colVal;
          if (isMiss) {
            const wi = colVal.indexOf('want: '), hi = colVal.indexOf('; has:');
            display = wi !== -1 ? colVal.slice(wi + 6, hi !== -1 ? hi : undefined) : colVal;
          }
          html += '<div class="god-roll-col-row"><span class="god-roll-col-label">Col ' + idx + '</span><span class="' + cls + '">' + esc(display) + '</span></div>';
        }
        html += '</div></div>';
      }
      html += '</div>';
    }

    if (data.columns && data.columns.length > 0) {
      html += '<div class="modal-section-title">Perks</div><div class="perk-columns">';
      const colsSeen = [...new Set(data.columns.map(c => c.colIndex))].sort((a,b) => a-b);
      for (const col of data.columns) {
        const label = 'Column ' + (colsSeen.indexOf(col.colIndex) + 1);
        html += '<div class="perk-column"><div class="perk-column-label">' + esc(label) + '</div>';
        for (const opt of col.options) {
          html += '<div class="perk-option' + (opt.isRolled ? ' is-rolled' : '') + '">';
          html += opt.icon ? '<img class="perk-icon" src="' + esc(opt.icon) + '" alt="" onerror="iconError(this,\'perk-icon-placeholder\')">' : '<div class="perk-icon-placeholder"></div>';
          html += '<div class="perk-name">' + esc(opt.name) + '</div>';
          if (opt.desc) html += '<div class="perk-tooltip">' + esc(opt.desc) + '</div>';
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
document.getElementById('modal-backdrop').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

document.getElementById('tbody').addEventListener('click', e => {
  const row = e.target.closest('tr[data-instanceid]');
  if (!row) return;
  openModal(
    row.dataset.instanceid, row.dataset.name, row.dataset.icon,
    row.dataset.type, row.dataset.rarity, row.dataset.damage,
    parseInt(row.dataset.damageraw ?? '0', 10),
    row.dataset.light ? parseInt(row.dataset.light, 10) : null,
  );
});

// ── Tabs ──────────────────────────────────────────────────────────────────────

let activeTab = 'weapons';
let vendorsLoaded = false;

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    if (tab === activeTab) return;
    activeTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
    document.getElementById('tab-' + tab).style.display = '';
    // Clear search on tab change so stale terms don't bleed across item types
    searchTerm = '';
    const searchEl = document.getElementById('search');
    searchEl.value = '';
    searchEl.placeholder = tab === 'armor' ? 'Search armor…' : 'Search weapon name…';
    // Hide search on vendors tab — vendor search is not yet supported
    document.getElementById('header-search').style.display = tab === 'vendors' ? 'none' : 'block';
    if (tab === 'vendors' && !vendorsLoaded) loadVendors();
    if (tab === 'armor'   && !armorLoaded)   loadArmor();
  });
});

// ── Vendor loading ────────────────────────────────────────────────────────────

let VENDOR_MODAL_DATA = {}; // instanceId → modalData for vendor items
let vendorRows_ = [];       // flat array of all vendor rows for modal god roll lookup

async function loadVendors() {
  const container = document.getElementById('vendors-container');
  container.innerHTML = tabLoadingHtml('Loading vendor inventories…');
  try {
    const res  = await fetch('/api/vendors');
    const raw  = await res.json();
    if (!raw.ok) throw new Error(raw.error ?? 'Unknown error');
    const data = JSON.parse(JSON.stringify(raw));

    // Store modal data and flat rows for god roll lookup
    vendorRows_ = [];
    for (const section of data.sections) {
      for (const r of section.rows) {
        vendorRows_.push(r);
        if (r.instanceId && r.modalData) VENDOR_MODAL_DATA[r.instanceId] = r.modalData;
      }
    }

    renderVendors(data.sections);
    vendorsLoaded = true;
  } catch (err) {
    container.innerHTML = tabLoadingHtml('Failed to load vendors: ' + err.message);
  }
}

function renderVendors(sections) {
  const container = document.getElementById('vendors-container');
  let html = '';

  for (const section of sections) {
    const v = section.vendor;
    html += '<div class="vendor-section">';
    html += '<div class="vendor-header">';
    html += '<div><div class="vendor-name">' + esc(v.name) + '</div>';
    html += '<div class="vendor-location">' + esc(v.location) + '</div></div>';
    html += '</div>';

    if (!section.available || section.rows.length === 0) {
      const msg = !section.available ? (section.error ?? 'Currently unavailable') : 'No weapons available';
      html += '<div class="vendor-empty">' + esc(msg) + '</div>';
    } else {
      html += renderVendorTable(section.rows, v);
    }
    if (section.armorRows && section.armorRows.length > 0) {
      html += renderVendorArmorTable(section.armorRows);
    }
    html += '</div>';
  }

  container.innerHTML = html;

  // Wire up row clicks for modal
  container.querySelectorAll('tr[data-instanceid]').forEach(row => {
    row.addEventListener('click', () => {
      openModal(
        row.dataset.instanceid, row.dataset.name, row.dataset.icon,
        row.dataset.type, row.dataset.rarity, row.dataset.damage,
        parseInt(row.dataset.damageraw ?? '0', 10), null,
        true // isVendorItem — suppresses tag/transfer sections
      );
    });
  });
}

function renderVendorTable(rows, vendor) {
  // Group into pairs same as inventory render
  const pairMap = new Map();
  for (const r of rows) {
    const key = r.instanceId ?? r.name;
    if (!pairMap.has(key)) pairMap.set(key, {});
    pairMap.get(key)[r.mode] = r;
  }

  let html = '<div class="table-wrap" style="padding:0"><table style="width:100%;border-collapse:collapse;font-size:13px">';
  html += '<thead><tr>';
  html += '<th class="no-sort" style="' + thStyle() + '">Icon</th>';
  html += '<th style="' + thStyle() + '">Weapon</th>';
  html += '<th style="' + thStyle() + '">Type</th>';
  html += '<th style="' + thStyle() + '">Rarity</th>';
  html += '<th style="' + thStyle() + '">Damage</th>';
  html += '<th style="' + thStyle() + '">Mode</th>';
  html += '<th style="' + thStyle() + '">Column 1</th>';
  html += '<th style="' + thStyle() + '">Column 2</th>';
  html += '<th style="' + thStyle() + '">Column 3</th>';
  html += '<th style="' + thStyle() + '">Column 4</th>';
  html += '<th style="' + thStyle() + '">Result</th>';
  html += '</tr></thead><tbody>';

  for (const pair of pairMap.values()) {
    const pve = pair['PvE'];
    const pvp = pair['PvP'];
    const rep = pve ?? pvp;
    const bothModes = !!(pve && pvp);
    const rowspan = bothModes ? ' rowspan="2"' : '';
    const iid = rep.instanceId ?? '';

    const icon = rep.icon
      ? '<img class="weapon-icon" src="' + esc(rep.icon) + '" alt="" loading="lazy" onerror="iconError(this,\'weapon-icon-placeholder\')">'
      : '<div class="weapon-icon-placeholder">⬡</div>';

    const sharedAttrs = ' style="cursor:pointer"'
      + ' data-instanceid="' + esc(iid) + '"'
      + ' data-name="' + esc(rep.name) + '"'
      + ' data-icon="' + esc(rep.icon ?? '') + '"'
      + ' data-type="' + esc(rep.type) + '"'
      + ' data-rarity="' + esc(rep.rarity) + '"'
      + ' data-damage="' + esc(rep.damage) + '"'
      + ' data-damageraw="' + esc(String(rep.damageRaw ?? 0)) + '"';

    const sharedCells =
      '<td class="icon-cell"' + rowspan + '>' + icon + '</td>' +
      '<td class="name-cell"' + rowspan + '>' + esc(rep.name) + '</td>' +
      '<td' + rowspan + '>' + esc(rep.type) + '</td>' +
      '<td' + rowspan + '><span class="badge ' + rep.rarity.toLowerCase() + '">' + esc(rep.rarity) + '</span></td>' +
      '<td' + rowspan + '><span class="damage-dot ' + (DAMAGE_CLASS[rep.damageRaw] ?? rep.damage.toLowerCase()) + '">' + esc(rep.damage) + '</span></td>';

    const firstRow = pve ?? pvp;
    html += '<tr class="pair-start"' + sharedAttrs + '>';
    html += sharedCells;
    html += '<td><span class="mode-badge mode-' + firstRow.mode.toLowerCase() + '">' + esc(firstRow.mode) + '</span></td>';
    html += '<td class="perk-cell">' + perkCell(firstRow.col1) + '</td>';
    html += '<td class="perk-cell">' + perkCell(firstRow.col2) + '</td>';
    html += '<td class="perk-cell">' + perkCell(firstRow.col3) + '</td>';
    html += '<td class="perk-cell">' + perkCell(firstRow.col4) + '</td>';
    html += '<td>' + resultPill(firstRow.result) + '</td>';
    html += '</tr>';

    if (bothModes) {
      html += '<tr class="pair-end"' + sharedAttrs + '>';
      html += '<td><span class="mode-badge mode-pvp">' + esc(pvp.mode) + '</span></td>';
      html += '<td class="perk-cell">' + perkCell(pvp.col1) + '</td>';
      html += '<td class="perk-cell">' + perkCell(pvp.col2) + '</td>';
      html += '<td class="perk-cell">' + perkCell(pvp.col3) + '</td>';
      html += '<td class="perk-cell">' + perkCell(pvp.col4) + '</td>';
      html += '<td>' + resultPill(pvp.result) + '</td>';
      html += '</tr>';
    }
  }

  html += '</tbody></table></div>';
  return html;
}

function thStyle() {
  return 'padding:10px 12px;text-align:left;font-size:10px;font-family:Share Tech Mono,monospace;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-dim);white-space:nowrap;border-bottom:2px solid var(--amber)';
}

// ── Armor tab ─────────────────────────────────────────────────────────────────

document.querySelectorAll('th[data-acol]').forEach(th => {
  th.style.cursor = 'pointer';
  th.addEventListener('click', () => {
    const col = th.dataset.acol;
    if (armorSortCol === col) {
      armorSortDir *= -1;
    } else {
      armorSortCol = col;
      armorSortDir = 1;
    }
    document.querySelectorAll('th[data-acol]').forEach(t => t.classList.remove('sort-asc', 'sort-desc'));
    th.classList.add(armorSortDir === 1 ? 'sort-asc' : 'sort-desc');
    renderArmor();
  });
});

document.querySelectorAll('.armor-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const group = btn.dataset.armor;
    document.querySelectorAll(`.armor-filter-btn[data-armor="${group}"]`).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const val = btn.dataset.val;
    if (group === 'class')    armorClassFilter    = val;
    if (group === 'type')     armorTypeFilter     = val;
    if (group === 'rank')     armorRankFilter     = val;
    if (group === 'location') armorLocationFilter = val;
    if (group === 'tag')      armorTagFilter      = val;
    if (armorLoaded) renderArmor();
  });
});

function initArmorLocationFilters() {
  const group = document.getElementById('armor-location-filter-group');
  if (!group) return;
  group.querySelectorAll('.armor-filter-btn[data-generated]').forEach(b => b.remove());
  for (const char of characters) {
    const btn = document.createElement('button');
    btn.className = 'armor-filter-btn';
    btn.dataset.armor = 'location';
    btn.dataset.val = char.characterId;
    btn.dataset.generated = '1';
    btn.textContent = char.className;
    group.appendChild(btn);
    btn.addEventListener('click', () => {
      group.querySelectorAll('.armor-filter-btn[data-armor="location"]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      armorLocationFilter = char.characterId;
      if (armorLoaded) renderArmor();
    });
  }
}

async function loadArmor() {
  const loadingHtml = tabLoadingHtml('Loading armor…');
  document.getElementById('armor-tbody').innerHTML =
    '<tr><td colspan="11">' + loadingHtml + '</td></tr>';
  document.getElementById('armor-cards').innerHTML = loadingHtml;
  updateLayout();
  try {
    const res = await fetch('/api/armor');
    const raw = await res.json();
    if (!raw.ok) throw new Error(raw.error ?? 'Unknown error');
    ARMOR_RAW = JSON.parse(JSON.stringify(raw.armorRows));
    armorLoaded = true;
    initArmorLocationFilters();
    renderArmor();
  } catch (err) {
    const errHtml = tabLoadingHtml('Failed to load armor: ' + err.message);
    document.getElementById('armor-tbody').innerHTML = '<tr><td colspan="11">' + errHtml + '</td></tr>';
    document.getElementById('armor-cards').innerHTML = errHtml;
  }
}

const ARMOR_RANK_ORDER = { S: 0, A: 1, B: 2, C: 3, D: 4, F: 5, '—': 6 };

function getArmorRows() {
  let rows = [...ARMOR_RAW];
  // Universal items (className === null: Ghost, Artifact) appear under every class filter
  if (armorClassFilter    !== 'all') rows = rows.filter(r => r.className === armorClassFilter || r.className === null);
  if (armorTypeFilter     !== 'all') rows = rows.filter(r => r.type === armorTypeFilter);
  if (armorRankFilter     !== 'all') rows = rows.filter(r => r.rank === armorRankFilter);
  if (armorLocationFilter === 'vault') {
    rows = rows.filter(r => r.location === 'vault');
  } else if (armorLocationFilter !== 'all') {
    // armorLocationFilter is a characterId string
    rows = rows.filter(r => r.characterId === armorLocationFilter);
  }

  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    rows = rows.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q) ||
      (r.className ?? '').toLowerCase().includes(q)
    );
  }

  if (armorTagFilter !== 'all') {
    const tags = loadTags();
    if (armorTagFilter === 'none') rows = rows.filter(r => !tags[r.instanceId]);
    else                           rows = rows.filter(r => tags[r.instanceId] === armorTagFilter);
  }

  rows.sort((a, b) => {
    let av = a[armorSortCol] ?? '', bv = b[armorSortCol] ?? '';
    if (armorSortCol === 'rank')    { av = ARMOR_RANK_ORDER[a.rank] ?? 9; bv = ARMOR_RANK_ORDER[b.rank] ?? 9; }
    if (typeof av === 'number') return (av - bv) * armorSortDir;
    return String(av).localeCompare(String(bv)) * armorSortDir;
  });
  return rows;
}

function updateLayout() {
  const isMobile = window.innerWidth <= 640;
  const weaponCards  = document.getElementById('weapon-cards');
  const weaponTable  = document.querySelector('#tab-weapons .table-wrap');
  const armorCards   = document.getElementById('armor-cards');
  const armorTable   = document.querySelector('#tab-armor .table-wrap');
  if (weaponCards) weaponCards.style.display = isMobile ? 'block' : 'none';
  if (weaponTable) weaponTable.style.display  = isMobile ? 'none'  : '';
  if (armorCards)  armorCards.style.display   = isMobile ? 'block' : 'none';
  if (armorTable)  armorTable.style.display   = isMobile ? 'none'  : '';
}

function renderArmor() {
  const rows  = getArmorRows();
  const tbody = document.getElementById('armor-tbody');

  document.getElementById('armor-stat-total').textContent = rows.length;
  document.getElementById('armor-stat-s').textContent = rows.filter(r => r.rank === 'S').length;
  document.getElementById('armor-stat-a').textContent = rows.filter(r => r.rank === 'A').length;

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:32px;color:var(--text-dim)">No armor found.</td></tr>';
    document.getElementById('armor-cards').innerHTML = '';
    updateLayout();
    return;
  }

  // ── Table rows ────────────────────────────────────────────────────────────
  let tableHtml = '';
  for (const r of rows) {
    const icon = r.icon
      ? '<img class="weapon-icon" src="' + esc(r.icon) + '" alt="" loading="lazy" onerror="iconError(this,\'weapon-icon-placeholder\')">'
      : '<div class="weapon-icon-placeholder">⬡</div>';
    const rankKey = r.rank === '—' ? 'none' : r.rank.toLowerCase();
    tableHtml += '<tr>';
    tableHtml += '<td class="icon-cell">' + icon + '</td>';
    tableHtml += '<td class="name-cell">' + esc(r.name) + '</td>';
    tableHtml += '<td>' + esc(r.type) + '</td>';
    tableHtml += '<td>' + esc(r.className ?? 'Any') + '</td>';
    tableHtml += '<td><span class="badge ' + (r.rarity ?? '').toLowerCase() + '">' + esc(r.rarity ?? '—') + '</span></td>';
    tableHtml += '<td><span class="light-val">' + (r.light !== null ? r.light : '—') + '</span></td>';
    tableHtml += '<td class="armor-stat-cell">' + (r.intellect  || '—') + '</td>';
    tableHtml += '<td class="armor-stat-cell">' + (r.discipline || '—') + '</td>';
    tableHtml += '<td class="armor-stat-cell">' + (r.strength   || '—') + '</td>';
    tableHtml += '<td class="armor-stat-cell">' + (r.quality !== null ? r.quality + '%' : '—') + '</td>';
    tableHtml += '<td><span class="rank-badge rank-' + rankKey + '">' + esc(r.rank) + '</span></td>';
    tableHtml += '</tr>';
  }
  tbody.innerHTML = tableHtml;

  // ── Mobile cards ──────────────────────────────────────────────────────────
  const cardsEl = document.getElementById('armor-cards');
  let cardHtml = '';
  for (const r of rows) {
    const rankKey    = r.rank === '—' ? 'none' : r.rank.toLowerCase();
    const isVault    = r.location === 'vault';
    const locClass   = isVault ? 'loc-vault' : '';
    const locLabel   = isVault
      ? 'vault'
      : (characters.find(c => c.characterId === r.characterId)?.className ?? 'character');

    const icon = r.icon
      ? '<img class="weapon-icon" src="' + esc(r.icon) + '" alt="" loading="lazy" onerror="iconError(this,\'weapon-icon-placeholder\')">'
      : '<div class="weapon-icon-placeholder">⬡</div>';

    const subtypeText = r.type + (r.className ? ' · ' + r.className : '');
    const lightText   = r.light !== null ? ' · ⬡ ' + r.light : '';

    cardHtml += '<div class="armor-card">';
    cardHtml += icon;
    cardHtml += '<div class="armor-card-body">';

    // Header: name + rank badge
    cardHtml += '<div class="armor-card-header">';
    cardHtml += '<span class="armor-card-name">' + esc(r.name) + '</span>';
    cardHtml += '<span class="rank-badge rank-' + rankKey + '">' + esc(r.rank) + '</span>';
    cardHtml += '</div>';

    // Meta: rarity badge + type·class + light + location
    cardHtml += '<div class="armor-card-meta">';
    cardHtml += '<span class="badge ' + (r.rarity ?? '').toLowerCase() + '">' + esc(r.rarity ?? '—') + '</span>';
    cardHtml += '<span class="armor-card-subtype">' + esc(subtypeText + lightText) + '</span>';
    cardHtml += '<span class="item-card-location ' + locClass + '">' + esc(locLabel) + '</span>';
    cardHtml += '</div>';

    // Stats row
    cardHtml += '<div class="armor-card-stats">';
    cardHtml += '<span class="armor-card-stat">INT <b>' + (r.intellect  || '—') + '</b></span>';
    cardHtml += '<span class="armor-card-stat">DIS <b>' + (r.discipline || '—') + '</b></span>';
    cardHtml += '<span class="armor-card-stat">STR <b>' + (r.strength   || '—') + '</b></span>';
    if (r.quality !== null) {
      cardHtml += '<span class="armor-card-quality">' + r.quality + '%</span>';
    }
    cardHtml += '</div>';

    // Tag picker
    if (r.instanceId) {
      const armorTag     = getTag(r.instanceId);
      const armorTagInfo = armorTag ? TAGS[armorTag] : null;
      cardHtml += '<div class="tag-cell" style="align-self:flex-start;padding-top:4px">';
      cardHtml += '<span class="tag-pill ' + (armorTagInfo ? armorTagInfo.cls : '') + '" onclick="openTagDropdown(event,\'' + esc(r.instanceId) + '\')">';
      cardHtml += (armorTagInfo ? esc(armorTagInfo.label) : '+ Tag') + '</span>';
      cardHtml += '<div class="tag-dropdown" id="td-' + esc(r.instanceId) + '">';
      cardHtml += Object.entries(TAGS).map(([val, info]) =>
        '<button class="tag-option' + (armorTag === val ? ' active' : '') + '" onclick="setTag(event,\'' + esc(r.instanceId) + '\',\'' + val + '\')">' + esc(info.label) + '</button>'
      ).join('');
      cardHtml += '<button class="tag-option clear" onclick="setTag(event,\'' + esc(r.instanceId) + '\',null)">❌ Clear</button>';
      cardHtml += '</div></div>';
    }

    cardHtml += '</div>';
    cardHtml += '</div>';
  }
  cardsEl.innerHTML = cardHtml;
  updateLayout();
}

function renderVendorArmorTable(rows) {
  let html = '<div class="table-wrap" style="padding:0;margin-top:8px"><table style="width:100%;border-collapse:collapse;font-size:13px">';
  html += '<thead><tr>';
  ['Icon', 'Armor', 'Type', 'Rarity', 'INT', 'DIS', 'STR', 'Quality', 'Rank'].forEach(h => {
    html += '<th class="no-sort" style="' + thStyle() + '">' + h + '</th>';
  });
  html += '</tr></thead><tbody>';

  for (const r of rows) {
    const icon = r.icon
      ? '<img class="weapon-icon" src="' + esc(r.icon) + '" alt="" loading="lazy" onerror="iconError(this,\'weapon-icon-placeholder\')">'
      : '<div class="weapon-icon-placeholder">⬡</div>';
    const rankKey = r.rank === '—' ? 'none' : r.rank.toLowerCase();
    html += '<tr>';
    html += '<td class="icon-cell">' + icon + '</td>';
    html += '<td class="name-cell">' + esc(r.name) + '</td>';
    html += '<td>' + esc(r.type) + '</td>';
    html += '<td><span class="badge ' + (r.rarity ?? '').toLowerCase() + '">' + esc(r.rarity ?? '—') + '</span></td>';
    html += '<td class="armor-stat-cell">' + (r.intellect  || '—') + '</td>';
    html += '<td class="armor-stat-cell">' + (r.discipline || '—') + '</td>';
    html += '<td class="armor-stat-cell">' + (r.strength   || '—') + '</td>';
    html += '<td class="armor-stat-cell">' + (r.quality !== null ? r.quality + '%' : '—') + '</td>';
    html += '<td><span class="rank-badge rank-' + rankKey + '">' + esc(r.rank) + '</span></td>';
    html += '</tr>';
  }
  html += '</tbody></table></div>';
  return html;
}

window.addEventListener('resize', updateLayout);

// ── Boot ──────────────────────────────────────────────────────────────────────
(async () => {
  const authed = await checkAuth();
  if (authed) await loadInventory();
})();
