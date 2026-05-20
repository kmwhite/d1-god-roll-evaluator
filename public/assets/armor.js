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
  document.querySelectorAll('.vendor-table-wrap').forEach(el => { el.style.display = isMobile ? 'none'  : ''; });
  document.querySelectorAll('.vendor-cards').forEach(     el => { el.style.display = isMobile ? 'block' : 'none'; });
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
    cardHtml += renderCard('armor', r, { showTag: true });
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
  return '<div class="vendor-cards" style="margin-top:4px">'
    + rows.map(r => renderCard('armor', r)).join('')
    + '</div>';
}

window.addEventListener('resize', updateLayout);
