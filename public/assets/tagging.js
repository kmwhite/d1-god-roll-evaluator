// ── Tag system ──────────────────────────────────────────────────────────────
const STORAGE_KEY = 'd1-god-roll-tags';
const TAGS = {
  favorite: {
    label: '<i class="fa-duotone fa-solid fa-shield-heart"></i> Favorite',
    cls:   'tag-favorite',
  },
  keep: {
    label: '<i class="fa-duotone fa-solid fa-bookmark"></i> Keep',
    cls:   'tag-keep',
  },
  upgrade: {
    label: '<i class="fa-duotone fa-solid fa-arrow-up-right-dots"></i> Upgrade',
    cls:   'tag-upgrade',
  },
  evaluate: {
    label: '<i class="fa-duotone fa-solid fa-magnifying-glass"></i> Evaluate',
    cls:   'tag-evaluate',
  },
  infuse: {
    label: '<i class="fa-duotone fa-solid fa-charging-station"></i> Infuse',
    cls:   'tag-infuse',
  },
  junk: {
    label: '<i class="fa-duotone fa-solid fa-trash-can"></i> Junk',
    cls:   'tag-junk',
  },
  archive: {
    label: '<i class="fa-duotone fa-solid fa-box-archive"></i> Archive',
    cls:   'tag-archive',
  },
};

function loadTags() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveTag(instanceId, tagValue) {
  const tags = loadTags();
  if (tagValue) {
    tags[instanceId] = tagValue;
  } else {
    delete tags[instanceId];
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
}

function getTag(instanceId) {
  return loadTags()[instanceId] ?? null;
}

// ── Tag dropdown ────────────────────────────────────────────────────────────
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

// ── Tag Rendering ───────────────────────────────────────────────────────────
function renderTagCell(instanceId, extraOpts) {
    const tag     = getTag(instanceId);
    const tagInfo = tag ? TAGS[tag] : null;
    let tagCell = '<td class="tag-cell"'; 
    
    if (extraOpts) {
      tagCell = tagCell + ' ' + extraOpts;
    }
    
    return tagCell + 'data-iid="' + esc(instanceId) + '">'
      + '<span class="tag-pill ' + (tagInfo ? tagInfo.cls : '') + '" onclick="openTagDropdown(event,\'' + esc(instanceId) + '\')">'
      + (tagInfo ? tagInfo.label : '+ Tag') + '</span>'
      + '<div class="tag-dropdown" id="td-' + esc(instanceId) + '">'
      + Object.entries(TAGS).map(([val, info]) =>
        '<button class="tag-option' + (tag === val ? ' active' : '') + '" onclick="setTag(event,\'' + esc(instanceId) + '\',\'' + val + '\')">' + info.label + '</button>'
      ).join('')
      + '<button class="tag-option clear" onclick="setTag(event,\'' + esc(instanceId) + '\',null)"><i class="fa-duotone fa-solid fa-xmark"></i> Clear</button>'
      + '</div></td>';
}

// ── Tag Events ──────────────────────────────────────────────────────────────
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