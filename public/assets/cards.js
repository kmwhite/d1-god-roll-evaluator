// ── Shared card rendering ─────────────────────────────────────────────────────
//
// renderCard(type, item, opts) returns an HTML string for one mobile card.
//
// Weapon opts: { pvp, pve, tag }
//   - pvp/pve: evaluation objects or null (caller filters by mode if needed)
//   - tag: tag key string or null
//
// Armor opts: { showTag }
//   - showTag: true for owned items (renders tag picker), false/absent for vendor

function renderCard(type, item, opts) {
  opts = opts ?? {};
  if (type === 'weapon') return _weaponCard(item, opts);
  if (type === 'armor')  return _armorCard(item, opts);
  return '';
}

function _weaponCard(item, opts) {
  const iid         = item.instanceId ?? '';
  const pvp         = opts.pvp ?? null;
  const pve         = opts.pve ?? null;
  const tag         = opts.tag ?? null;
  const tagInfo     = tag ? TAGS[tag] : null;
  const damageClass = DAMAGE_CLASS[item.damageRaw] ?? (item.damage ?? '').toLowerCase();

  // location is numeric on owned weapons (2 = vault); absent on vendor weapons
  const hasLoc   = item.location != null;
  const isVault  = item.location === 2;
  const locLabel = hasLoc
    ? (isVault ? 'vault' : (characters.find(c => c.characterId === item.characterId)?.className ?? null))
    : null;
  const locClass = isVault ? 'loc-vault' : '';

  let html = '<div class="weapon-card" data-instanceid="' + esc(iid) + '">';
  html += item.icon
    ? '<img class="weapon-card-icon" src="' + esc(item.icon) + '" alt="" loading="lazy" onerror="iconError(this,\'weapon-card-icon-placeholder\')">'
    : '<div class="weapon-card-icon-placeholder">⬡</div>';
  html += '<div class="weapon-card-body">';
  html += '<div class="weapon-card-name">' + esc(item.name) + '</div>';
  html += '<div class="weapon-card-meta">';
  html += '<span class="badge ' + (item.rarity ?? '').toLowerCase() + '">' + esc(item.rarity ?? '—') + '</span>';
  html += '<span class="damage-dot ' + damageClass + '">' + esc(item.damage ?? '—') + '</span>';
  if (item.light) html += '<span class="light-val" style="font-size:11px">⬡ ' + item.light + '</span>';
  if (locLabel)   html += '<span class="item-card-location ' + locClass + '">' + esc(locLabel) + '</span>';
  html += '</div>';
  html += '<div class="weapon-card-pills">';
  if (pve) html += resultPill(pve.result) + ' ';
  if (pvp) html += resultPill(pvp.result);
  html += '</div>';
  html += '</div>';
  if (tagInfo) html += '<span class="weapon-card-tag ' + tagInfo.cls + '">' + tagInfo.label + '</span>';
  html += '</div>';
  return html;
}

function _armorCard(item, opts) {
  const showTag = opts.showTag ?? false;
  const rank    = item.evaluation?.rank    ?? '—';
  const quality = item.evaluation?.quality ?? null;
  const rankKey = rank === '—' ? 'none' : rank.toLowerCase();

  // location is the string 'vault' or absent on vendor armor
  const hasLoc   = item.location != null;
  const isVault  = item.location === 'vault';
  const locLabel = hasLoc
    ? (isVault ? 'vault' : (characters.find(c => c.characterId === item.characterId)?.className ?? 'character'))
    : null;
  const locClass = isVault ? 'loc-vault' : '';

  const subtype   = item.type + (item.className ? ' · ' + item.className : '');
  const lightText = item.light != null ? ' · ⬡ ' + item.light : '';

  const icon = item.icon
    ? '<img class="weapon-icon" src="' + esc(item.icon) + '" alt="" loading="lazy" onerror="iconError(this,\'weapon-icon-placeholder\')">'
    : '<div class="weapon-icon-placeholder">⬡</div>';

  let html = '<div class="armor-card" data-instanceid="' + esc(item.instanceId ?? '') + '">';
  html += icon;
  html += '<div class="armor-card-body">';
  html += '<div class="armor-card-header">';
  html += '<span class="armor-card-name">' + esc(item.name) + '</span>';
  html += '<span class="rank-badge rank-' + rankKey + '">' + esc(rank) + '</span>';
  html += '</div>';
  html += '<div class="armor-card-meta">';
  html += '<span class="badge ' + (item.rarity ?? '').toLowerCase() + '">' + esc(item.rarity ?? '—') + '</span>';
  html += '<span class="armor-card-subtype">' + esc(subtype + lightText) + '</span>';
  if (locLabel) html += '<span class="item-card-location ' + locClass + '">' + esc(locLabel) + '</span>';
  html += '</div>';
  html += '<div class="armor-card-stats">';
  html += '<span class="armor-card-stat">INT <b>' + (item.intellect  || '—') + '</b></span>';
  html += '<span class="armor-card-stat">DIS <b>' + (item.discipline || '—') + '</b></span>';
  html += '<span class="armor-card-stat">STR <b>' + (item.strength   || '—') + '</b></span>';
  if (quality !== null) html += '<span class="armor-card-quality">' + quality + '%</span>';
  html += '</div>';
  if (showTag && item.instanceId) {
    const armorTag     = getTag(item.instanceId);
    const armorTagInfo = armorTag ? TAGS[armorTag] : null;
    html += '<div class="tag-cell" style="align-self:flex-start;padding-top:4px">';
    html += '<span class="tag-pill ' + (armorTagInfo ? armorTagInfo.cls : '') + '" onclick="openTagDropdown(event,\'' + esc(item.instanceId) + '\')">';
    html += (armorTagInfo ? armorTagInfo.label : '+ Tag') + '</span>';
    html += '<div class="tag-dropdown" id="td-' + esc(item.instanceId) + '">';
    html += Object.entries(TAGS).map(([val, info]) =>
      '<button class="tag-option' + (armorTag === val ? ' active' : '') + '" onclick="setTag(event,\'' + esc(item.instanceId) + '\',\'' + val + '\')">' + info.label + '</button>'
    ).join('');
    html += '<button class="tag-option clear" onclick="setTag(event,\'' + esc(item.instanceId) + '\',null)"><i class="fa-duotone fa-solid fa-xmark"></i> Clear</button>';
    html += '</div></div>';
  }
  html += '</div></div>';
  return html;
}
