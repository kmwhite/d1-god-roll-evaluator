// ── Rendering Helpers ───────────────────────────────────────────────────────
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

function thStyle() {
  return 'padding:10px 12px;text-align:left;font-size:10px;font-family:Share Tech Mono,monospace;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-dim);white-space:nowrap;border-bottom:2px solid var(--amber)';
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