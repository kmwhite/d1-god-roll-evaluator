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

async function handleLock(instanceId, btnEl) {
  const item = findItem(instanceId);
  if (!item) return;

  const newLocked = !item.locked;
  // Vault items have no characterId; fall back to first available character
  const charId = item.characterId ?? characterIds[0];
  if (!charId) { alert('No character available to set lock state'); return; }

  btnEl.disabled = true;

  const res = await fetch('/api/lock', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ itemId: instanceId, characterId: charId, locked: newLocked }),
  });
  const result = await res.json();

  btnEl.disabled = false;

  if (result.ok) {
    item.locked = newLocked;
    // Update every lock button for this item (table row + card are mutually exclusive,
    // but update all matching buttons in case the modal is also open)
    const icon   = newLocked ? 'fa-lock' : 'fa-lock-open';
    document.querySelectorAll('.lock-btn[data-iid="' + instanceId + '"]').forEach(b => {
      b.classList.toggle('lock-open', !newLocked);
      b.querySelector('i').className = 'fa-duotone fa-solid ' + icon;
    });
  } else {
    alert('Lock failed: ' + result.error);
  }
}
