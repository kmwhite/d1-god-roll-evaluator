
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

// ── Rendering helpers ─────────────────────────────────────────────────────────
function iconError(el, cls) {
  el.outerHTML = '<div' + (cls ? ' class="' + cls + '"' : '') + '>⬡</div>';
}

function tabLoadingHtml(msg) {
  return '<div class="tab-loading"><div class="spinner"></div>'
    + '<div class="tab-loading-text">' + esc(msg) + '</div></div>';
}

function perkCell(val, colPerks) {
  if (!val || val === '—') return '<span class="perk-na">—</span>';
  if (val.startsWith('✓')) return '<span class="perk-hit">' + esc(val.slice(2)) + '</span>';
  if (val.startsWith('✗')) {
    const wantStart = val.indexOf('want: ');
    const hasStart  = val.indexOf('has: ');
    const want = wantStart !== -1 ? val.slice(wantStart + 6, hasStart !== -1 ? val.lastIndexOf(';', hasStart) : undefined).trim() : '';
    let hasContent;
    if (colPerks?.options?.length) {
      const rolled = colPerks.options.filter(o => o.isRolled).map(o => esc(o.name));
      hasContent = rolled.length > 0 ? "['" + rolled.join("', '") + "']" : '(not rolled)';
    } else {
      hasContent = esc(hasStart !== -1 ? val.slice(hasStart + 5).trim() : '');
    }
    return '<span class="perk-miss"><span class="want">want: ' + esc(want) + '</span><br><span class="has">has: ' + hasContent + '</span></span>';
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
  return '<span class="result-pill ' + cls + '">' + RESULT_ICON[cls] + ' ' + RESULT_LABEL[cls] + '</span>';
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

// Finds a normalized item by instanceId across weapons, armor, and vendor items.
function findItem(instanceId) {
  return RAW.find(r => r.instanceId === instanceId)
    ?? ARMOR_RAW.find(r => r.instanceId === instanceId)
    ?? vendorItems_.find(r => r.instanceId === instanceId)
    ?? null;
}

// ── Transfer ──────────────────────────────────────────────────────────────────

/**
 * Transfer an item. If moving between characters, does vault as intermediate.
 * destCharId: character ID to send to, or null for vault.
 */
async function transferItem(instanceId, destCharId) {
  const item = findItem(instanceId);
  if (!item) return { ok: false, error: 'No transfer data for this item' };

  const { itemHash, characterId: sourceCharId, transferStatus, location } = item;
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
    const item = findItem(instanceId);
    if (item) { item.transferStatus = 1; item.characterId = charId; item.location = 1; }
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
    const item = findItem(instanceId);
    if (item) { item.location = destCharId === null ? 2 : 1; item.characterId = destCharId; }
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
    RAW = data.items;
    characters = data.characters ?? characters;
    characterIds = data.characterIds ?? characterIds;
    platformMembershipId = data.platformMembershipId ?? platformMembershipId;
    render();
  } catch { /* silent — user can manual refresh */ }
}

function renderTransferButtons(instanceId) {
  const container = document.getElementById('modal-transfer-section');
  if (!container) return;
  if (!instanceId) { container.innerHTML = ''; return; }
  const item = findItem(instanceId);
  if (!item || item.itemType !== 'weapon' || item.isVendorItem) { container.innerHTML = ''; return; }

  const { characterId: currentCharId, transferStatus, location } = item;
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
  html += '<button class="tag-btn" onclick="setTag(event,\'' + esc(instanceId) + '\',null)" style="color:#c06060"><i class="fa-duotone fa-solid fa-xmark"></i> Clear</button>';
  html += '</div>';
  container.innerHTML = html;
}

function openModal(item) {
  if (!item) return;
  const iconWrap = document.getElementById('modal-icon-wrap');
  iconWrap.innerHTML = item.icon
    ? '<img class="modal-icon" src="' + esc(item.icon) + '" alt="" onerror="iconError(this,\'modal-icon-placeholder\')">'
    : '<div class="modal-icon-placeholder">⬡</div>';

  document.getElementById('modal-name').textContent = item.name;
  let metaHtml = '<span class="badge ' + (item.rarity ?? '').toLowerCase() + '">' + esc(item.rarity ?? '—') + '</span>';
  if (item.itemType === 'weapon') {
    metaHtml += '<span class="damage-dot ' + (DAMAGE_CLASS[item.damageRaw] ?? item.damage.toLowerCase()) + '">' + esc(item.damage) + '</span>';
  }
  if (item.light != null) metaHtml += '<span class="light-val">⬡ ' + item.light + '</span>';
  metaHtml += '<span style="color:var(--text-dim);font-size:12px">' + esc(item.type) + '</span>';
  if (item.itemType === 'armor' && item.className) {
    metaHtml += '<span style="color:var(--text-dim);font-size:12px;margin-left:6px">' + esc(item.className) + '</span>';
  }
  document.getElementById('modal-meta').innerHTML = metaHtml;

  const suppressed = !!item.isVendorItem;
  renderModalTag(suppressed ? null : item.instanceId);
  renderTransferButtons(suppressed ? null : item.instanceId);

  const body = document.getElementById('modal-content');
  let html = '';

  // Stats section (works for weapon and armor)
  if (item.stats?.length > 0) {
    html += '<div class="modal-section-title">Stats</div><div class="stats-grid">';
    for (const s of item.stats) {
      const pct = Math.round((s.value / (s.max || 100)) * 100);
      const cls = pct >= 70 ? 'high' : pct >= 40 ? 'mid' : 'low';
      html += '<div class="stat-row"><div class="stat-label-row"><span class="stat-name">' + esc(s.name) + '</span><span class="stat-value">' + s.value + '</span></div>'
        + '<div class="stat-bar-track"><div class="stat-bar-fill ' + cls + '" style="width:' + pct + '%"></div></div></div>';
    }
    html += '</div>';
  }

  // Weapon evaluation section
  if (item.itemType === 'weapon' && item.evaluation) {
    const { pvp, pve } = item.evaluation;
    if (pvp || pve) {
      html += '<div class="modal-section-title">God Roll Evaluation</div><div class="god-roll-eval">';
      for (const [modeKey, ev] of [['pve', pve], ['pvp', pvp]]) {
        if (!ev) continue;
        const label      = modeKey === 'pvp' ? 'PvP' : 'PvE';
        const resultText = ev.result ?? '—';
        const pillCls    = resultText.includes('GOD') ? 'god-roll' : resultText.includes('Close') ? 'close' : resultText.includes('Curated') ? 'curated' : resultText.includes('Error') ? 'error' : resultText === '? —' ? 'unknown' : 'no';
        const badgeCls   = pillCls === 'god-roll' ? 'god' : pillCls;
        html += '<div class="god-roll-mode ' + modeKey + '"><div class="god-roll-mode-title">' + label + '</div>';
        html += '<div class="god-roll-result-badge ' + badgeCls + '">' + RESULT_ICON[pillCls] + ' ' + esc(resultText + (ev.source ? ' (' + ev.source + ')' : '')) + '</div>';
        html += '<div class="god-roll-col-list">';
        for (const [idx, colVal] of [[1, ev.col1],[2, ev.col2],[3, ev.col3],[4, ev.col4]]) {
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
  }

  // Armor evaluation section
  if (item.itemType === 'armor' && item.evaluation) {
    const { rank, quality } = item.evaluation;
    const rankKey = rank === '—' ? 'none' : (rank ?? '').toLowerCase();
    html += '<div class="modal-section-title">Quality</div>';
    html += '<div style="display:flex;align-items:center;gap:12px;padding:8px 0">';
    html += '<span class="rank-badge rank-' + rankKey + '">' + esc(rank ?? '—') + '</span>';
    if (quality !== null && quality !== undefined) {
      html += '<span style="font-family:Share Tech Mono,monospace;font-size:13px;color:var(--text)">' + quality + '%</span>';
    }
    html += '</div>';
  }

  // Perks section (weapon only currently)
  if (item.perks?.length > 0) {
    html += '<div class="modal-section-title">Perks</div><div class="perk-columns">';
    const colsSeen = [...new Set(item.perks.map(c => c.colIndex))].sort((a, b) => a - b);
    for (const col of item.perks) {
      const label = 'Column ' + (colsSeen.indexOf(col.colIndex) + 1);
      html += '<div class="perk-column"><div class="perk-column-label">' + esc(label) + '</div>';
      for (const opt of col.options) {
        const optCls = opt.isActive ? ' is-active' : opt.isRolled ? ' is-rolled' : '';
        html += '<div class="perk-option' + optCls + '">';
        html += opt.icon ? '<img class="perk-icon" src="' + esc(opt.icon) + '" alt="" onerror="iconError(this,\'perk-icon-placeholder\')">' : '<div class="perk-icon-placeholder"></div>';
        html += '<div class="perk-name">' + esc(opt.name) + '</div>';
        if (opt.desc) html += '<div class="perk-tooltip">' + esc(opt.desc) + '</div>';
        html += '</div>';
      }
      html += '</div>';
    }
    html += '</div>';
  }

  if (!html) html = '<p style="color:var(--text-dim);font-family:Share Tech Mono,monospace;font-size:12px">No detail data available.</p>';
  body.innerHTML = html;

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
  const item = findItem(row.dataset.instanceid);
  if (item) openModal(item);
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

// ── Vendor loading ────────────────────────────────────────────────────────────


async function loadVendors() {
  const container = document.getElementById('vendors-container');
  container.innerHTML = tabLoadingHtml('Loading vendor inventories…');
  try {
    const res  = await fetch('/api/vendors');
    const raw  = await res.json();
    if (!raw.ok) throw new Error(raw.error ?? 'Unknown error');
    const data = JSON.parse(JSON.stringify(raw));

    vendorItems_ = [];
    for (const section of data.sections) {
      for (const item of section.items ?? []) vendorItems_.push(item);
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

    const weaponItems = (section.items ?? []).filter(r => r.itemType === 'weapon');
    const armorItems  = (section.items ?? []).filter(r => r.itemType === 'armor');
    if (!section.available || weaponItems.length === 0) {
      const msg = !section.available ? (section.error ?? 'Currently unavailable') : 'No weapons available';
      html += '<div class="vendor-empty">' + esc(msg) + '</div>';
    } else {
      html += renderVendorTable(weaponItems);
    }
    if (armorItems.length > 0) {
      html += renderVendorArmorTable(armorItems);
    }
    html += '</div>';
  }

  container.innerHTML = html;

  container.querySelectorAll('tr[data-instanceid]').forEach(row => {
    row.addEventListener('click', () => {
      const item = findItem(row.dataset.instanceid);
      if (item) openModal(item);
    });
  });
}

function renderVendorTable(items) {
  let html = '<div class="table-wrap" style="padding:0"><table style="width:100%;border-collapse:collapse;font-size:13px">';
  html += '<thead><tr>';
  ['Icon','Weapon','Type','Rarity','Damage','Mode','Column 1','Column 2','Column 3','Column 4','Result'].forEach(h => {
    html += '<th class="no-sort" style="' + thStyle() + '">' + h + '</th>';
  });
  html += '</tr></thead><tbody>';

  for (const item of items) {
    const iid       = item.instanceId ?? '';
    const pvp       = item.evaluation?.pvp;
    const pve       = item.evaluation?.pve;
    const firstEval = pve ?? pvp;
    const bothModes = !!(pvp && pve);
    const rowspan   = bothModes ? ' rowspan="2"' : '';
    const rowAttrs  = ' style="cursor:pointer" data-instanceid="' + esc(iid) + '"';
    const damageClass = DAMAGE_CLASS[item.damageRaw] ?? (item.damage ?? '').toLowerCase();

    const icon = item.icon
      ? '<img class="weapon-icon" src="' + esc(item.icon) + '" alt="" loading="lazy" onerror="iconError(this,\'weapon-icon-placeholder\')">'
      : '<div class="weapon-icon-placeholder">⬡</div>';

    const sharedCells =
      '<td class="icon-cell"' + rowspan + '>' + icon + '</td>'
      + '<td class="name-cell"' + rowspan + '>' + esc(item.name) + '</td>'
      + '<td' + rowspan + '>' + esc(item.type) + '</td>'
      + '<td' + rowspan + '><span class="badge ' + (item.rarity ?? '').toLowerCase() + '">' + esc(item.rarity ?? '—') + '</span></td>'
      + '<td' + rowspan + '><span class="damage-dot ' + damageClass + '">' + esc(item.damage ?? '—') + '</span></td>';

    const perkCols  = (item.perks ?? []).slice().sort((a, b) => a.colIndex - b.colIndex);
    html += '<tr class="pair-start"' + rowAttrs + '>' + sharedCells;
    html += '<td><span class="mode-badge mode-' + (pve ? 'pve' : 'pvp') + '">' + (pve ? 'PvE' : 'PvP') + '</span></td>';
    html += '<td class="perk-cell">' + perkCell(firstEval.col1, perkCols[0]) + '</td>';
    html += '<td class="perk-cell">' + perkCell(firstEval.col2, perkCols[1]) + '</td>';
    html += '<td class="perk-cell">' + perkCell(firstEval.col3, perkCols[2]) + '</td>';
    html += '<td class="perk-cell">' + perkCell(firstEval.col4, perkCols[3]) + '</td>';
    html += '<td>' + resultPill(firstEval.result) + '</td></tr>';

    if (bothModes) {
      html += '<tr class="pair-end"' + rowAttrs + '>';
      html += '<td><span class="mode-badge mode-pvp">PvP</span></td>';
      html += '<td class="perk-cell">' + perkCell(pvp.col1, perkCols[0]) + '</td>';
      html += '<td class="perk-cell">' + perkCell(pvp.col2, perkCols[1]) + '</td>';
      html += '<td class="perk-cell">' + perkCell(pvp.col3, perkCols[2]) + '</td>';
      html += '<td class="perk-cell">' + perkCell(pvp.col4, perkCols[3]) + '</td>';
      html += '<td>' + resultPill(pvp.result) + '</td></tr>';
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
  let html = '<div class="table-wrap" style="padding:0;margin-top:8px"><table style="width:100%;border-collapse:collapse;font-size:13px">';
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

window.addEventListener('resize', updateLayout);

// ── Boot ──────────────────────────────────────────────────────────────────────
(async () => {
  const authed = await checkAuth();
  if (authed) await loadInventory();
})();
