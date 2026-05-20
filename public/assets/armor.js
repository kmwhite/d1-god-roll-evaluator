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
    ARMOR_RAW = JSON.parse(JSON.stringify(raw.items));
    armorLoaded = true;
    initArmorLocationFilters();
    renderArmor();
  } catch (err) {
    const errHtml = tabLoadingHtml('Failed to load armor: ' + err.message);
    document.getElementById('armor-tbody').innerHTML = '<tr><td colspan="11">' + errHtml + '</td></tr>';
    document.getElementById('armor-cards').innerHTML = errHtml;
  }
}

function getArmorRows() {
  let rows = [...ARMOR_RAW];
  // Universal items (className === null: Ghost, Artifact) appear under every class filter
  if (armorClassFilter    !== 'all') rows = rows.filter(r => r.className === armorClassFilter || r.className === null);
  if (armorTypeFilter     !== 'all') rows = rows.filter(r => r.type === armorTypeFilter);
  if (armorRankFilter     !== 'all') rows = rows.filter(r => r.evaluation?.rank === armorRankFilter);
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
    if (armorSortCol === 'rank') {
      av = ARMOR_RANK_ORDER[a.evaluation?.rank] ?? 9;
      bv = ARMOR_RANK_ORDER[b.evaluation?.rank] ?? 9;
    } else if (armorSortCol === 'quality') {
      av = a.evaluation?.quality ?? -1;
      bv = b.evaluation?.quality ?? -1;
    }
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
  document.getElementById('armor-stat-s').textContent = rows.filter(r => r.evaluation?.rank === 'S').length;
  document.getElementById('armor-stat-a').textContent = rows.filter(r => r.evaluation?.rank === 'A').length;

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
    const rank    = r.evaluation?.rank    ?? '—';
    const quality = r.evaluation?.quality ?? null;
    const rankKey = rank === '—' ? 'none' : rank.toLowerCase();

    tableHtml += '<tr style="cursor:pointer" data-instanceid="' + esc(r.instanceId ?? '') + '">';
    tableHtml += '<td class="icon-cell">' + icon + '</td>';
    tableHtml += '<td class="name-cell">' + esc(r.name) + '</td>';
    tableHtml += '<td>' + esc(r.type) + '</td>';
    tableHtml += '<td>' + esc(r.className ?? 'Any') + '</td>';
    tableHtml += '<td><span class="badge ' + (r.rarity ?? '').toLowerCase() + '">' + esc(r.rarity ?? '—') + '</span></td>';
    tableHtml += '<td><span class="light-val">' + (r.light !== null ? r.light : '—') + '</span></td>';
    tableHtml += '<td class="armor-stat-cell">' + (r.intellect  || '—') + '</td>';
    tableHtml += '<td class="armor-stat-cell">' + (r.discipline || '—') + '</td>';
    tableHtml += '<td class="armor-stat-cell">' + (r.strength   || '—') + '</td>';
    tableHtml += '<td class="armor-stat-cell">' + (quality !== null ? quality + '%' : '—') + '</td>';
    tableHtml += '<td><span class="rank-badge rank-' + rankKey + '">' + esc(rank) + '</span></td>';
    tableHtml += renderTagCell(r.instanceId);
    tableHtml += '</tr>';
  }
  tbody.innerHTML = tableHtml;

  tbody.querySelectorAll('tr[data-instanceid]').forEach(row => {
    row.addEventListener('click', () => {
      const item = findItem(row.dataset.instanceid);
      if (item) openModal(item);
    });
  });

  // ── Mobile cards ──────────────────────────────────────────────────────────
  const cardsEl = document.getElementById('armor-cards');
  let cardHtml = '';
  for (const r of rows) {
    const rank     = r.evaluation?.rank    ?? '—';
    const quality  = r.evaluation?.quality ?? null;
    const rankKey  = rank === '—' ? 'none' : rank.toLowerCase();
    const isVault  = r.location === 'vault';
    const locClass = isVault ? 'loc-vault' : '';
    const locLabel = isVault
      ? 'vault'
      : (characters.find(c => c.characterId === r.characterId)?.className ?? 'character');

    const icon = r.icon
      ? '<img class="weapon-icon" src="' + esc(r.icon) + '" alt="" loading="lazy" onerror="iconError(this,\'weapon-icon-placeholder\')">'
      : '<div class="weapon-icon-placeholder">⬡</div>';

    const subtypeText = r.type + (r.className ? ' · ' + r.className : '');
    const lightText   = r.light !== null ? ' · ⬡ ' + r.light : '';

    cardHtml += '<div class="armor-card" data-instanceid="' + esc(r.instanceId ?? '') + '">';
    cardHtml += icon;
    cardHtml += '<div class="armor-card-body">';
    cardHtml += '<div class="armor-card-header">';
    cardHtml += '<span class="armor-card-name">' + esc(r.name) + '</span>';
    cardHtml += '<span class="rank-badge rank-' + rankKey + '">' + esc(rank) + '</span>';
    cardHtml += '</div>';
    cardHtml += '<div class="armor-card-meta">';
    cardHtml += '<span class="badge ' + (r.rarity ?? '').toLowerCase() + '">' + esc(r.rarity ?? '—') + '</span>';
    cardHtml += '<span class="armor-card-subtype">' + esc(subtypeText + lightText) + '</span>';
    cardHtml += '<span class="item-card-location ' + locClass + '">' + esc(locLabel) + '</span>';
    cardHtml += '</div>';
    cardHtml += '<div class="armor-card-stats">';
    cardHtml += '<span class="armor-card-stat">INT <b>' + (r.intellect  || '—') + '</b></span>';
    cardHtml += '<span class="armor-card-stat">DIS <b>' + (r.discipline || '—') + '</b></span>';
    cardHtml += '<span class="armor-card-stat">STR <b>' + (r.strength   || '—') + '</b></span>';
    if (quality !== null) cardHtml += '<span class="armor-card-quality">' + quality + '%</span>';
    cardHtml += '</div>';

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
    cardHtml += '</div></div>';
  }
  cardsEl.innerHTML = cardHtml;

  cardsEl.querySelectorAll('.armor-card[data-instanceid]').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.tag-cell')) return; // don't open modal when clicking tag picker
      const item = findItem(card.dataset.instanceid);
      if (item) openModal(item);
    });
  });

  updateLayout();
}

function renderVendorArmorTable(rows) {
  let html = '<div class="vendor-table-wrap" style="padding:0;margin-top:8px"><table style="width:100%;border-collapse:collapse;font-size:13px">';
  html += '<thead><tr>';
  ['Icon', 'Armor', 'Type', 'Rarity', 'INT', 'DIS', 'STR', 'Quality', 'Rank'].forEach(h => {
    html += '<th class="no-sort" style="' + thStyle() + '">' + h + '</th>';
  });
  html += '</tr></thead><tbody>';

  for (const r of rows) {
    const rank    = r.evaluation?.rank    ?? '—';
    const quality = r.evaluation?.quality ?? null;
    const rankKey = rank === '—' ? 'none' : rank.toLowerCase();
    const icon = r.icon
      ? '<img class="weapon-icon" src="' + esc(r.icon) + '" alt="" loading="lazy" onerror="iconError(this,\'weapon-icon-placeholder\')">'
      : '<div class="weapon-icon-placeholder">⬡</div>';
    html += '<tr style="cursor:pointer" data-instanceid="' + esc(r.instanceId ?? '') + '">';
    html += '<td class="icon-cell">' + icon + '</td>';
    html += '<td class="name-cell">' + esc(r.name) + '</td>';
    html += '<td>' + esc(r.type) + '</td>';
    html += '<td><span class="badge ' + (r.rarity ?? '').toLowerCase() + '">' + esc(r.rarity ?? '—') + '</span></td>';
    html += '<td class="armor-stat-cell">' + (r.intellect  || '—') + '</td>';
    html += '<td class="armor-stat-cell">' + (r.discipline || '—') + '</td>';
    html += '<td class="armor-stat-cell">' + (r.strength   || '—') + '</td>';
    html += '<td class="armor-stat-cell">' + (quality !== null ? quality + '%' : '—') + '</td>';
    html += '<td><span class="rank-badge rank-' + rankKey + '">' + esc(rank) + '</span></td>';
    html += '</tr>';
  }
  html += '</tbody></table></div>';
  return html;
}

function renderVendorArmorCards(rows) {
  if (!rows.length) return '';
  let html = '<div class="vendor-cards" style="margin-top:4px">';
  for (const r of rows) {
    const rank    = r.evaluation?.rank    ?? '—';
    const quality = r.evaluation?.quality ?? null;
    const rankKey = rank === '—' ? 'none' : rank.toLowerCase();
    const icon = r.icon
      ? '<img class="weapon-icon" src="' + esc(r.icon) + '" alt="" loading="lazy" onerror="iconError(this,\'weapon-icon-placeholder\')">'
      : '<div class="weapon-icon-placeholder">⬡</div>';
    html += '<div class="armor-card" style="cursor:pointer" data-instanceid="' + esc(r.instanceId ?? '') + '">';
    html += icon;
    html += '<div class="armor-card-body">';
    html += '<div class="armor-card-header">';
    html += '<span class="armor-card-name">' + esc(r.name) + '</span>';
    html += '<span class="rank-badge rank-' + rankKey + '">' + esc(rank) + '</span>';
    html += '</div>';
    html += '<div class="armor-card-meta">';
    html += '<span class="badge ' + (r.rarity ?? '').toLowerCase() + '">' + esc(r.rarity ?? '—') + '</span>';
    html += '<span class="armor-card-subtype">' + esc(r.type) + '</span>';
    html += '</div>';
    html += '<div class="armor-card-stats">';
    html += '<span class="armor-card-stat">INT <b>' + (r.intellect  || '—') + '</b></span>';
    html += '<span class="armor-card-stat">DIS <b>' + (r.discipline || '—') + '</b></span>';
    html += '<span class="armor-card-stat">STR <b>' + (r.strength   || '—') + '</b></span>';
    if (quality !== null) html += '<span class="armor-card-quality">' + quality + '%</span>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
  }
  html += '</div>';
  return html;
}

window.addEventListener('resize', updateLayout);
