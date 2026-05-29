// ── Weapon state ──────────────────────────────────────────────────────────────
let RAW                = [];
let characters         = [];
let characterIds       = [];
let platformMembershipId = null;

let sortCol    = 'result';
let sortDir    = 1;
let filterMode = 'all';
let tagFilter  = 'all';
let modeFilter = 'all';
let slotFilter   = 'all'; // Primary / Special / Heavy
let typeFilter   = 'all'; // Sidearm, Rocket Launcher, etc.
let rarityFilter = 'all'; // Common, Uncommon, Rare, Legendary, Exotic
let damageFilter = 'all'; // Kinetic, Arc, Solar, Void
let searchTerm = '';

// ── Shared filters (apply to both weapons and armor) ─────────────────────────
let locationFilter = 'all'; // 'all' | 'vault' | characterId string
let lockFilter     = 'all'; // 'all' | 'locked' | 'unlocked'
let sourceFilter   = 'any'; // 'any' | 'TRUEGaming' | 'Reddit' | 'Last City Discord'

// ── Armor state ───────────────────────────────────────────────────────────────
let ARMOR_RAW        = [];
let armorLoaded      = false;
let armorClassFilter = 'all';
let armorTypeFilter  = 'all';
let armorRankFilter  = 'all';
let armorSortCol     = 'rank';
let armorSortDir     = 1;

// ── Vendor state ──────────────────────────────────────────────────────────────
let vendorItems_   = []; // flat array of all vendor items for findItem() lookup
let vendorsLoaded  = false;

// ── Tab state ─────────────────────────────────────────────────────────────────
let activeTab = 'weapons';

// ── Loading animation state ───────────────────────────────────────────────────
const loadingMessages = [
  'Loading manifest data',
  'Fetching character inventories',
  'Fetching vault',
  'Evaluating rolls',
  'Building report',
];
let loadingMsgIdx  = 0;
let loadingInterval = null;

// ── Lookup tables ─────────────────────────────────────────────────────────────
const DAMAGE_CLASS = { 0:'kinetic', 1:'kinetic', 2:'arc', 3:'solar', 4:'void' };

const ARMOR_RANK_ORDER = { S: 0, A: 1, B: 2, C: 3, D: 4, F: 5, '—': 6 };

const RESULT_ICON = {
  'god-roll': '<i class="fa-solid fa-star"></i>',
  'close':    '<i class="fa-duotone fa-solid fa-star-half-stroke"></i>',
  'no':       '<i class="fa-solid fa-xmark"></i>',
  'curated':  '<i class="fa-duotone fa-solid fa-list-check"></i>',
  'unknown':  '<i class="fa-duotone fa-solid fa-circle-question"></i>',
  'error':    '<i class="fa-duotone fa-solid fa-triangle-exclamation"></i>',
};

const RESULT_LABEL = {
  'god-roll': 'God Roll',
  'close':    'Close',
  'no':       'No',
  'curated':  'Curated',
  'unknown':  'Unknown',
  'error':    'Error',
};
