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
      html += renderVendorWeaponCards(weaponItems);
    }
    if (armorItems.length > 0) {
      html += renderVendorArmorTable(armorItems);
      html += renderVendorArmorCards(armorItems);
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

  container.querySelectorAll('.vendor-cards [data-instanceid]').forEach(card => {
    card.addEventListener('click', () => {
      const item = findItem(card.dataset.instanceid);
      if (item) openModal(item);
    });
  });

  updateLayout();
}

function renderVendorTable(items) {
  let html = '<div class="vendor-table-wrap" style="padding:0"><table style="width:100%;border-collapse:collapse;font-size:13px">';
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

function renderVendorWeaponCards(items) {
  if (!items.length) return '';
  return '<div class="vendor-cards">'
    + items.map(item => renderCard('weapon', item, { pvp: item.evaluation?.pvp, pve: item.evaluation?.pve })).join('')
    + '</div>';
}
