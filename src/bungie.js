/**
 * bungie.js
 *
 * Bungie Platform API wrapper for Destiny 1.
 *
 * Perk resolution uses the D1 SQLite manifest, downloaded once and cached
 * locally under .cache/. Only re-downloaded when Bungie publishes a new version.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { inflateRawSync } from 'zlib';
import Database from 'better-sqlite3';

const __dirname      = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR      = path.join(__dirname, '..', '.cache');
const MANIFEST_META  = path.join(CACHE_DIR, 'manifest-version.json');
const MANIFEST_DB    = path.join(CACHE_DIR, 'manifest.content');

const BASE        = 'https://www.bungie.net/Platform';
const BUNGIE_ROOT = 'https://www.bungie.net';

// D1 weapon bucket hashes
const WEAPON_BUCKET_HASHES = new Set([
  1498876634, // Primary Weapons
  2465295065, // Special Weapons
  953998645,  // Heavy Weapons
]);

// ---------------------------------------------------------------------------
// Core HTTP helper
// ---------------------------------------------------------------------------

async function bungieGet(urlPath, apiKey, accessToken) {
  const headers = { 'X-API-Key': apiKey };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  const res = await fetch(`${BASE}${urlPath}`, { headers });
  if (!res.ok) throw new Error(`Bungie HTTP ${res.status} for ${urlPath}`);
  const json = await res.json();
  if (json.ErrorCode !== 1) throw new Error(`Bungie ErrorCode ${json.ErrorCode}: ${json.Message}`);
  return json.Response;
}

// ---------------------------------------------------------------------------
// Platform helpers
// ---------------------------------------------------------------------------

export function resolveMembershipType(platform) {
  const aliases = {
    xbox: 1, xboxone: 1, xbox_one: 1, '1': 1,
    psn: 2, ps3: 2, ps4: 2, playstation: 2, '2': 2,
    blizzard: 4, pc: 4, '4': 4,
  };
  const key = platform.toLowerCase().replace(/[^a-z0-9]/g, '');
  const resolved = aliases[key];
  if (!resolved) {
    throw new Error(
      `Unrecognised platform "${platform}". ` +
      `Set D1_GOD_ROLL_EVALUATOR_PLATFORM to: xbox, psn, or pc (or numeric type 1/2/4).`
    );
  }
  return resolved;
}

export async function getMembershipId(membershipType, apiKey, accessToken, bungieNetMembershipId) {
  const data = await bungieGet(
    `/User/GetMembershipsById/${bungieNetMembershipId}/254/`,
    apiKey, accessToken
  );
  const match = (data.destinyMemberships ?? []).find((m) => m.membershipType === membershipType);
  if (!match) {
    const available = (data.destinyMemberships ?? [])
      .map((m) => `type=${m.membershipType} (${m.displayName})`).join(', ');
    throw new Error(
      `No Destiny membership found for membershipType=${membershipType}. ` +
      `Available: ${available || 'none'}`
    );
  }
  return match.membershipId;
}

// ---------------------------------------------------------------------------
// Manifest — SQLite download + in-memory cache
// ---------------------------------------------------------------------------

// Module-level cache — survives for the lifetime of the Node process.
// Invalidated only when Bungie publishes a new manifest version.
let _manifestCache   = null;
let _manifestVersion = null;

/**
 * Load all relevant manifest data from the cached D1 SQLite.
 * Downloads + caches the manifest file if it's missing or outdated.
 * Parses the SQLite and caches the result in memory — subsequent calls
 * within the same process return instantly without any disk I/O.
 *
 * Returns:
 *   weaponHashes  Set<itemHash>
 *   itemDataMap   Map<itemHash, { name, tierType, itemTypeName, talentGridHash, icon, isCurated }>
 *   talentGridMap Map<talentGridHash, nodeDefinitions[]>
 */
export async function buildManifestData(apiKey) {
  const version = await ensureManifestCurrent(apiKey);

  if (_manifestCache && _manifestVersion === version) {
    return _manifestCache;
  }

  console.log('[bungie] Parsing manifest SQLite into memory...');

  const db            = new Database(MANIFEST_DB, { readonly: true, fileMustExist: true });
  const weaponHashes  = new Set(); // legendary+exotic weapon itemHashes
  const itemDataMap   = new Map(); // itemHash → { name, tierType, itemTypeName, talentGridHash }
  const talentGridMap = new Map(); // gridHash → nodes[]

  try {
    // Talent grid definitions — each node step carries nodeStepName directly
    for (const row of db.prepare('SELECT json FROM DestinyTalentGridDefinition').all()) {
      const def = JSON.parse(row.json);
      if (def.gridHash && def.nodes) talentGridMap.set(def.gridHash, def.nodes);
    }

    // Item definitions — name, tier, type, grid hash; filter to weapon slots
    // tierType: 6 = Exotic, 5 = Legendary
    for (const row of db.prepare('SELECT json FROM DestinyInventoryItemDefinition').all()) {
      const def = JSON.parse(row.json);
      if (!def.itemHash || !WEAPON_BUCKET_HASHES.has(def.bucketTypeHash)) continue;

      // Determine if this weapon has a curated (fixed) roll.
      // Random-roll weapons have perk column nodes with many steps (5+).
      // Curated/exotic weapons have every node at 1 step (sometimes 3 for
      // the damage-type node). Threshold of >3 steps flags a random perk column.
      const gridNodes = talentGridMap.get(def.talentGridHash) ?? [];
      const maxSteps  = gridNodes.reduce((m, n) => Math.max(m, (n.steps ?? []).length), 0);
      const isCurated = maxSteps <= 3;

      itemDataMap.set(def.itemHash, {
        name:           def.itemName ?? 'Unknown',
        tierType:       def.tierType ?? 0,
        itemTypeName:   def.itemTypeName ?? '',
        talentGridHash: def.talentGridHash ?? null,
        bucketTypeHash: def.bucketTypeHash ?? null,
        icon:           def.icon ?? null,
        isCurated,
      });
      weaponHashes.add(def.itemHash);
    }
  } finally {
    db.close();
  }

  _manifestCache   = { weaponHashes, itemDataMap, talentGridMap };
  _manifestVersion = version;
  console.log('[bungie] Manifest cached in memory.');
  return _manifestCache;
}

async function ensureManifestCurrent(apiKey) {
  const res = await fetch(`${BASE}/Destiny/Manifest/`, {
    headers: { 'X-API-Key': apiKey },
  });
  if (!res.ok) throw new Error(`Manifest index HTTP ${res.status}`);
  const json = await res.json();
  if (json.ErrorCode !== 1) throw new Error(`Manifest index error: ${json.Message}`);

  const contentPath = json.Response?.mobileWorldContentPaths?.en;
  const version     = json.Response?.version;
  if (!contentPath) throw new Error('No mobileWorldContentPaths.en in manifest response');

  // Check cached version
  let cachedVersion = null;
  if (existsSync(MANIFEST_META) && existsSync(MANIFEST_DB)) {
    try { cachedVersion = JSON.parse(readFileSync(MANIFEST_META, 'utf8')).version; } catch { /* miss */ }
  }
  if (cachedVersion === version) return version; // already up to date

  console.log(`[bungie] Manifest outdated (${cachedVersion ?? 'none'} → ${version}). Downloading...`);
  mkdirSync(CACHE_DIR, { recursive: true });

  // The content file is a ZIP archive. Download it, then unzip the single SQLite entry.
  const dlRes = await fetch(`${BUNGIE_ROOT}${contentPath}`);
  if (!dlRes.ok) throw new Error(`Manifest download HTTP ${dlRes.status}`);

  const zipBuf = Buffer.from(await dlRes.arrayBuffer());
  const sqliteBuf = unzipFirstEntry(zipBuf);
  writeFileSync(MANIFEST_DB, sqliteBuf);
  writeFileSync(MANIFEST_META, JSON.stringify({ version, contentPath }));
  console.log(`[bungie] Manifest cached (${sqliteBuf.length.toLocaleString()} bytes).`);
  return version;
}

/**
 * Minimal ZIP parser — extracts the first (and only) file from a ZIP buffer.
 * Bungie's manifest zip uses DEFLATE (method 8) or STORE (method 0).
 */
function unzipFirstEntry(zipBuf) {
  const LOCAL_HEADER_SIG = 0x04034b50;
  if (zipBuf.readUInt32LE(0) !== LOCAL_HEADER_SIG) {
    throw new Error('Not a valid ZIP file (bad local header signature)');
  }

  const method           = zipBuf.readUInt16LE(8);
  const compressedSize   = zipBuf.readUInt32LE(18);
  const fileNameLength   = zipBuf.readUInt16LE(26);
  const extraFieldLength = zipBuf.readUInt16LE(28);
  const dataOffset       = 30 + fileNameLength + extraFieldLength;
  const compressed       = zipBuf.slice(dataOffset, dataOffset + compressedSize);

  if (method === 0) return compressed;        // STORE — no compression
  if (method === 8) return inflateRawSync(compressed); // DEFLATE
  throw new Error(`Unsupported ZIP compression method: ${method}`);
}

// ---------------------------------------------------------------------------
// Inventory fetching
// ---------------------------------------------------------------------------

export async function getCharacterIds(membershipType, membershipId, apiKey, accessToken) {
  const data = await bungieGet(
    `/Destiny/${membershipType}/Account/${membershipId}/Summary/`,
    apiKey, accessToken
  );
  return (data.data?.characters ?? []).map((c) => c.characterBase.characterId);
}

const CLASS_NAMES = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };

// D1 race hashes — only 3 races exist
const RACE_HASHES = {
  898834093:  'Exo',
  2803282938: 'Awoken',
  3887404748: 'Human',
};

/**
 * Fetch character IDs alongside display info (class, race, emblem).
 * Returns an array of { characterId, className, raceName, emblemPath, emblemBackgroundPath, lightLevel }.
 */
export async function getCharacters(membershipType, membershipId, apiKey, accessToken) {
  const data = await bungieGet(
    `/Destiny/${membershipType}/Account/${membershipId}/Summary/`,
    apiKey, accessToken
  );
  return (data.data?.characters ?? []).map((c) => {
    const base = c.characterBase;
    return {
      characterId:          base.characterId,
      className:            CLASS_NAMES[base.classType]   ?? `Class${base.classType}`,
      raceName:             RACE_HASHES[base.raceHash]    ?? `Unknown`,
      // emblemPath = small square icon; backgroundPath = wide rectangular banner
      emblemPath:           c.emblemPath     ? `https://www.bungie.net${c.emblemPath}`     : null,
      emblemBackgroundPath: c.backgroundPath ? `https://www.bungie.net${c.backgroundPath}` : null,
      lightLevel:           base.powerLevel ?? null,
    };
  });
}

/**
 * Fetch weapon item stubs from a character's inventory.
 *
 * The bucketHash lives on the bucket wrapper, not on each item.
 * We filter to weapon-slot buckets and propagate bucketHash down to each item.
 * Each stub is tagged with characterId for the item detail call.
 */
export async function getCharacterWeapons(membershipType, membershipId, characterId, apiKey, accessToken) {
  const data = await bungieGet(
    `/Destiny/${membershipType}/Account/${membershipId}/Character/${characterId}/Inventory/`,
    apiKey, accessToken
  );
  const equippable = data.data?.buckets?.Equippable ?? [];
  return equippable
    .filter((bucket) => WEAPON_BUCKET_HASHES.has(bucket.bucketHash))
    .flatMap((bucket) =>
      (bucket.items ?? []).map((item) => ({ ...item, bucketHash: bucket.bucketHash, characterId }))
    );
}

/**
 * Fetch weapon item stubs from the vault.
 *
 * Vault buckets use vault-section hashes (not weapon-slot hashes), so we can't
 * filter by bucketHash. Instead we match each item's itemHash against the set of
 * all known weapon itemHashes from the manifest.
 */
export async function getVaultWeapons(membershipType, membershipId, weaponHashes, apiKey, accessToken) {
  const data = await bungieGet(
    `/Destiny/${membershipType}/MyAccount/Vault/?accountId=${membershipId}`,
    apiKey, accessToken
  );
  const buckets = data.data?.buckets ?? [];
  return buckets
    .flatMap((bucket) =>
      (bucket.items ?? []).map((item) => ({ ...item, bucketHash: bucket.bucketHash, characterId: null }))
    )
    .filter((item) => weaponHashes.has(item.itemHash));
}

/**
 * Fetch detailed item data (talent grid / perks) for one item instance.
 *
 * D1 endpoint: /Destiny/{type}/Account/{membershipId}/Character/{characterId}/Inventory/{itemInstanceId}/
 *
 * For character items, characterId is known. For vault items it's null —
 * we try each character in turn until one returns a 200.
 */
export async function getItemDetail(membershipType, membershipId, characterId, itemInstanceId, allCharacterIds, apiKey, accessToken) {
  // Build the candidate characterIds to try
  const candidates = characterId
    ? [characterId]
    : allCharacterIds; // vault items: try all characters until one works

  let lastErr;
  for (const cid of candidates) {
    try {
      const data = await bungieGet(
        `/Destiny/${membershipType}/Account/${membershipId}/Character/${cid}/Inventory/${itemInstanceId}/`,
        apiKey, accessToken
      );
      return data.data ?? {};
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

/**
 * Extract the perk names actually rolled on this specific weapon instance,
 * grouped by grid column.
 *
 * The inventory stub carries a `nodes[]` array that is positionally aligned
 * with the talent grid definition's `nodes[]` array — stub.nodes[i] corresponds
 * to gridNodes[i]. Each stub node has a `stepIndex` identifying which step
 * within that grid node is the one this instance rolled.
 *
 * For nodes with multiple exclusive steps (e.g. barrel columns where the weapon
 * rolled "Accurized Ballistics" instead of "Linear Compensator"), only the
 * rolled step is included — but we also include all sibling steps from nodes
 * that are `exlusiveWithNodes` peers, because those represent the other options
 * available in the same column slot that the player could switch between.
 *
 * Wait — re-reading the design intent: a god roll match means the weapon HAS
 * that perk option available in the column. For D1 weapons, each column slot
 * has one node selected at roll time (the stepIndex), and exclusive siblings
 * are NOT available — the roll is fixed. So we only include the specific
 * stepIndex step from each node.
 *
 * Returns a Map<gridColumn, string[]> with a `.all` flat array attached.
 *
 * @param {object} stub           Item stub from inventory response
 * @param {*} _perkMap            Unused
 * @param {Map} talentGridMap     gridHash → node definitions[]
 * @returns {Map & { all: string[] }}
 */
export function extractPerkNames(stub, _perkMap, talentGridMap) {
  const gridHash = stub.talentGridHash;
  const byColumn_ = new Map(); // gridColumn (int) → string[]

  if (gridHash) {
    const gridNodes  = talentGridMap.get(gridHash) ?? [];
    const stubNodes  = stub.nodes ?? [];

    for (let i = 0; i < gridNodes.length; i++) {
      const nodeDef = gridNodes[i];
      const stubNode = stubNodes[i];
      const col = nodeDef.column ?? -1;

      if (!byColumn_.has(col)) byColumn_.set(col, []);

      if (!stubNode) continue;

      const stepIdx = stubNode.stepIndex ?? 0;
      const step = (nodeDef.steps ?? [])[stepIdx];
      const name = step?.nodeStepName?.trim();
      if (name) byColumn_.get(col).push(name);
    }
  }

  const byColumnObj = {};
  for (const [k, v] of byColumn_.entries()) {
    byColumnObj[k] = [...new Set(v)];
  }
  const all = [...new Set(Object.values(byColumnObj).flat())];
  return { byColumn: byColumnObj, all };
}
