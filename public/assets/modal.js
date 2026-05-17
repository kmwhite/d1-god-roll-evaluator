// ── Modal ─────────────────────────────────────────────────────────────────────

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