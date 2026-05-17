
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
      RAW = [];
      ARMOR_RAW = [];
      armorLoaded = false;
      vendorItems_ = [];
      vendorsLoaded = false;
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
    const data = JSON.parse(JSON.stringify(raw));
    RAW = data.items;
    characters = data.characters ?? [];
    characterIds = data.characterIds ?? [];
    platformMembershipId = data.platformMembershipId ?? null;
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
  vendorItems_ = [];
  vendorsLoaded = false;
  slotFilter = typeFilter = rarityFilter = damageFilter = 'all';
  loadInventory();
});

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

// Returns the evaluation(s) relevant to the current modeFilter for a weapon item.
function activeEvals(item) {
  if (modeFilter === 'pvp') return [item.evaluation.pvp];
  if (modeFilter === 'pve') return [item.evaluation.pve];
  return [item.evaluation.pvp, item.evaluation.pve].filter(Boolean);
}

function getRows() {
  let rows = [...RAW];

  // Result filter — checked against whichever mode(s) are active
  if (filterMode === 'god-roll') rows = rows.filter(r => activeEvals(r).some(e => e.result.includes('GOD')));
  else if (filterMode === 'close')   rows = rows.filter(r => activeEvals(r).some(e => e.result.includes('Close')));
  else if (filterMode === 'no')      rows = rows.filter(r => activeEvals(r).some(e => e.result === '✗ No'));
  else if (filterMode === 'curated') rows = rows.filter(r => activeEvals(r).some(e => e.result.includes('Curated')));
  else if (filterMode === 'unknown') rows = rows.filter(r => activeEvals(r).some(e => e.result === '? —'));
  else if (filterMode === 'error')   rows = rows.filter(r => activeEvals(r).some(e => e.result.includes('Error')));

  if (slotFilter   !== 'all') rows = rows.filter(r => r.slot   === slotFilter);
  if (typeFilter   !== 'all') rows = rows.filter(r => r.type   === typeFilter);
  if (rarityFilter !== 'all') rows = rows.filter(r => r.rarity === rarityFilter);
  if (damageFilter !== 'all') rows = rows.filter(r => r.damage === damageFilter);

  if (tagFilter !== 'all') {
    const tags = loadTags();
    if (tagFilter === 'none') rows = rows.filter(r => !tags[r.instanceId]);
    else                      rows = rows.filter(r => tags[r.instanceId] === tagFilter);
  }

  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    rows = rows.filter(r => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q));
  }

  rows.sort((a, b) => {
    let av = a[sortCol] ?? '', bv = b[sortCol] ?? '';
    if (sortCol === 'result') {
      av = Math.min(...activeEvals(a).map(e => e.resultRank ?? 99));
      bv = Math.min(...activeEvals(b).map(e => e.resultRank ?? 99));
    }
    if (typeof av === 'number') return (av - bv) * sortDir;
    return String(av).localeCompare(String(bv)) * sortDir;
  });
  return rows;
}

function render() {
  const items  = getRows();
  const tbody  = document.getElementById('tbody');

  let html = '';
  for (const item of items) {
    const iid        = item.instanceId ?? '';
    const pvp        = modeFilter !== 'pve' ? item.evaluation.pvp : null;
    const pve        = modeFilter !== 'pvp' ? item.evaluation.pve : null;
    const firstEval  = pve ?? pvp;
    const bothModes  = !!(pvp && pve);
    const rowspan    = bothModes ? 'rowspan="2"' : '';
    const rarityClass = item.rarity.toLowerCase();
    const damageClass = DAMAGE_CLASS[item.damageRaw] ?? item.damage.toLowerCase();

    const icon = item.icon
      ? '<img class="weapon-icon" src="' + esc(item.icon) + '" alt="" loading="lazy" onerror="iconError(this,\'weapon-icon-placeholder\')">'
      : '<div class="weapon-icon-placeholder">⬡</div>';

    const rowAttrs = ' style="cursor:pointer" data-instanceid="' + esc(iid) + '"';
    const sharedCells =
      '<td class="icon-cell"' + rowspan + '>' + icon + '</td>'
      + '<td class="name-cell"' + rowspan + '>' + esc(item.name) + '</td>'
      + '<td ' + rowspan + '>' + esc(item.type) + '</td>'
      + '<td ' + rowspan + '><span class="badge ' + rarityClass + '">' + esc(item.rarity) + '</span></td>'
      + '<td ' + rowspan + '><span class="damage-dot ' + damageClass + '">' + esc(item.damage) + '</span></td>'
      + '<td ' + rowspan + '><span class="light-val">' + (item.light !== null ? item.light : '—') + '</span></td>';

    const modeLabel = pve ? 'PvE' : 'PvP';
    const perkCols  = (item.perks ?? []).slice().sort((a, b) => a.colIndex - b.colIndex);
    html += '<tr class="pair-start"' + rowAttrs + '>';
    html += sharedCells;
    html += '<td><span class="mode-badge mode-' + modeLabel.toLowerCase() + '">' + modeLabel + '</span></td>';
    html += '<td class="perk-cell">' + perkCell(firstEval.col1, perkCols[0]) + '</td>';
    html += '<td class="perk-cell">' + perkCell(firstEval.col2, perkCols[1]) + '</td>';
    html += '<td class="perk-cell">' + perkCell(firstEval.col3, perkCols[2]) + '</td>';
    html += '<td class="perk-cell">' + perkCell(firstEval.col4, perkCols[3]) + '</td>';
    html += '<td>' + resultPill(firstEval.result) + '</td>';
    html += renderTagCell(iid, rowspan);
    html += '</tr>';

    if (bothModes) {
      html += '<tr class="pair-end"' + rowAttrs + '>';
      html += '<td><span class="mode-badge mode-pvp">PvP</span></td>';
      html += '<td class="perk-cell">' + perkCell(pvp.col1, perkCols[0]) + '</td>';
      html += '<td class="perk-cell">' + perkCell(pvp.col2, perkCols[1]) + '</td>';
      html += '<td class="perk-cell">' + perkCell(pvp.col3, perkCols[2]) + '</td>';
      html += '<td class="perk-cell">' + perkCell(pvp.col4, perkCols[3]) + '</td>';
      html += '<td>' + resultPill(pvp.result) + '</td>';
      html += '</tr>';
    }
  }
  tbody.innerHTML = html;

  // ── Mobile card view ──────────────────────────────────────────────────────
  const cardsEl = document.getElementById('weapon-cards');
  let cardHtml = '';
  for (const item of items) {
    const iid        = item.instanceId ?? '';
    const pvp        = modeFilter !== 'pve' ? item.evaluation.pvp : null;
    const pve        = modeFilter !== 'pvp' ? item.evaluation.pve : null;
    const tag        = getTag(iid);
    const tagInfo    = tag ? TAGS[tag] : null;
    const damageClass = DAMAGE_CLASS[item.damageRaw] ?? item.damage.toLowerCase();
    const isVault    = item.location === 2;
    const locLabel   = isVault
      ? 'vault'
      : (characters.find(c => c.characterId === item.characterId)?.className ?? null);
    const locClass   = isVault ? 'loc-vault' : '';

    cardHtml += '<div class="weapon-card" data-instanceid="' + esc(iid) + '">';
    cardHtml += item.icon
      ? '<img class="weapon-card-icon" src="' + esc(item.icon) + '" alt="" loading="lazy" onerror="iconError(this,\'weapon-card-icon-placeholder\')">'
      : '<div class="weapon-card-icon-placeholder">⬡</div>';
    cardHtml += '<div class="weapon-card-body">';
    cardHtml += '<div class="weapon-card-name">' + esc(item.name) + '</div>';
    cardHtml += '<div class="weapon-card-meta">';
    cardHtml += '<span class="badge ' + item.rarity.toLowerCase() + '">' + esc(item.rarity) + '</span>';
    cardHtml += '<span class="damage-dot ' + damageClass + '">' + esc(item.damage) + '</span>';
    if (item.light) cardHtml += '<span class="light-val" style="font-size:11px">⬡ ' + item.light + '</span>';
    if (locLabel) cardHtml += '<span class="item-card-location ' + locClass + '">' + esc(locLabel) + '</span>';
    cardHtml += '</div>';
    cardHtml += '<div class="weapon-card-pills">';
    if (pve) cardHtml += resultPill(pve.result) + ' ';
    if (pvp) cardHtml += resultPill(pvp.result);
    cardHtml += '</div>';
    cardHtml += '</div>';
    if (tagInfo) cardHtml += '<span class="weapon-card-tag ' + tagInfo.cls + '">' + tagInfo.label + '</span>';
    cardHtml += '</div>';
  }
  cardsEl.innerHTML = cardHtml;

  cardsEl.querySelectorAll('.weapon-card').forEach(card => {
    card.addEventListener('click', () => {
      const item = findItem(card.dataset.instanceid);
      if (item) openModal(item);
    });
  });

  document.getElementById('stat-total').textContent = items.length;
  document.getElementById('stat-god').textContent   = items.filter(r => activeEvals(r).some(e => e.result.includes('GOD'))).length;
  document.getElementById('stat-close').textContent = items.filter(r => activeEvals(r).some(e => e.result.includes('Close'))).length;

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

// ── Tabs ──────────────────────────────────────────────────────────────────────


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

// ── Boot ──────────────────────────────────────────────────────────────────────
(async () => {
  const authed = await checkAuth();
  if (authed) await loadInventory();
})();
