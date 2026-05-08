/**
 * diagnose.js
 *
 * Dumps raw API responses to help debug inventory + manifest shape issues.
 * Run with: node src/diagnose.js
 *
 * Outputs:
 *   .cache/diag-manifest-sample.json   — 3 sample rows from DestinySandboxPerkDefinition
 *   .cache/diag-manifest-tables.json   — all table names in the SQLite
 *   .cache/diag-character-inventory.json — raw inventory response for first character
 *   .cache/diag-vault.json             — raw vault response
 *   .cache/diag-item-detail.json       — raw item detail for first found item
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import Database from 'better-sqlite3';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR  = path.join(__dirname, '..', '.cache');
const TOKEN_PATH = path.join(__dirname, '..', '.token.json');
const MANIFEST_DB = path.join(CACHE_DIR, 'manifest.content');

const PLATFORM  = process.env.D1_GOD_ROLL_EVALUATOR_PLATFORM;
const API_KEY   = process.env.D1_GOD_ROLL_EVALUATOR_API_KEY;

if (!PLATFORM || !API_KEY) {
  console.error('Missing D1_GOD_ROLL_EVALUATOR_PLATFORM or D1_GOD_ROLL_EVALUATOR_API_KEY');
  process.exit(1);
}
if (!existsSync(TOKEN_PATH)) {
  console.error('No .token.json — run npm run auth first');
  process.exit(1);
}

const token = JSON.parse(readFileSync(TOKEN_PATH, 'utf8'));
const { access_token: bungieToken, membership_id: bungieNetMembershipId } = token;

const membershipTypeMap = { xbox: 1, xboxone: 1, psn: 2, ps4: 2, pc: 4 };
const membershipType = membershipTypeMap[PLATFORM.toLowerCase()] ?? parseInt(PLATFORM, 10);

const BASE = 'https://www.bungie.net/Platform';

mkdirSync(CACHE_DIR, { recursive: true });

async function get(urlPath, auth = true) {
  const headers = { 'X-API-Key': API_KEY };
  if (auth) headers['Authorization'] = `Bearer ${bungieToken}`;
  const res = await fetch(`${BASE}${urlPath}`, { headers });
  const json = await res.json();
  return { status: res.status, json };
}

function save(filename, data) {
  const p = path.join(CACHE_DIR, filename);
  writeFileSync(p, JSON.stringify(data, null, 2));
  console.log(`  Saved: ${p}`);
}

console.log('\n=== D1 God Roll Evaluator — Diagnostics ===\n');

// ---------------------------------------------------------------------------
// 1. SQLite manifest — table names + sample perk rows
// ---------------------------------------------------------------------------
console.log('[1] Inspecting manifest SQLite...');
if (!existsSync(MANIFEST_DB)) {
  console.log('    manifest.content not found — delete .cache/manifest-version.json and run npm start once');
} else {
  const db = new Database(MANIFEST_DB, { readonly: true });

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
  save('diag-manifest-tables.json', tables);
  console.log(`    Tables found: ${tables.join(', ')}`);

  // Try the perk table
  const perkTable = tables.find(t => t.toLowerCase().includes('sandboxperk'));
  if (perkTable) {
    const sample = db.prepare(`SELECT * FROM ${perkTable} LIMIT 3`).all();
    // Parse json column so we can see field names
    const parsed = sample.map(r => {
      try { return { id: r.id, json: JSON.parse(r.json) }; }
      catch { return r; }
    });
    save('diag-manifest-perk-sample.json', parsed);
    console.log(`    ${perkTable} sample saved. Key fields in first row:`);
    if (parsed[0]?.json) {
      console.log('   ', Object.keys(parsed[0].json).join(', '));
    }
  } else {
    console.log('    WARNING: No table matching "sandboxperk" found!');
    console.log('    Check diag-manifest-tables.json for the actual table names.');
  }

  db.close();
}

// ---------------------------------------------------------------------------
// 2. Resolve membership ID
// ---------------------------------------------------------------------------
console.log('\n[2] Resolving membership ID...');
const memberships = await get(`/User/GetMembershipsById/${bungieNetMembershipId}/254/`);
save('diag-memberships.json', memberships.json);
const destinyMemberships = memberships.json?.Response?.destinyMemberships ?? [];
const match = destinyMemberships.find(m => m.membershipType === membershipType);
if (!match) {
  console.log('    ERROR: no membership found for type', membershipType);
  console.log('    Available:', destinyMemberships.map(m => `type=${m.membershipType} (${m.displayName})`).join(', '));
  process.exit(1);
}
const membershipId = match.membershipId;
console.log(`    membershipId: ${membershipId}`);

// ---------------------------------------------------------------------------
// 3. Character IDs
// ---------------------------------------------------------------------------
console.log('\n[3] Fetching character IDs...');
const summary = await get(`/Destiny/${membershipType}/Account/${membershipId}/Summary/`);
save('diag-account-summary.json', summary.json);
const characters = summary.json?.Response?.data?.characters ?? [];
console.log(`    Characters found: ${characters.length}`);
const characterIds = characters.map(c => c.characterBase?.characterId);
console.log(`    IDs: ${characterIds.join(', ')}`);

// ---------------------------------------------------------------------------
// 4. Character inventory — full raw response for first character
// ---------------------------------------------------------------------------
if (characterIds.length > 0) {
  const cid = characterIds[0];
  console.log(`\n[4] Fetching inventory for character ${cid}...`);
  const inv = await get(`/Destiny/${membershipType}/Account/${membershipId}/Character/${cid}/Inventory/`);
  save('diag-character-inventory.json', inv.json);
  console.log(`    HTTP status: ${inv.status}`);
  const buckets = inv.json?.Response?.data?.buckets;
  if (buckets) {
    console.log(`    Bucket keys: ${Object.keys(buckets).join(', ')}`);
    for (const [key, val] of Object.entries(buckets)) {
      if (Array.isArray(val)) {
        const totalItems = val.reduce((n, b) => n + (b.items?.length ?? 0), 0);
        console.log(`      ${key}: ${val.length} bucket(s), ${totalItems} total item(s)`);
        // Show the first item stub to see its shape
        const firstItem = val.flatMap(b => b.items ?? [])[0];
        if (firstItem) console.log(`      First item keys: ${Object.keys(firstItem).join(', ')}`);
      }
    }
  } else {
    console.log('    WARNING: no data.buckets in response');
    console.log('    Top-level Response keys:', Object.keys(inv.json?.Response ?? {}).join(', '));
  }

  // ---------------------------------------------------------------------------
  // 5. Item detail — raw response for first Equippable item
  // ---------------------------------------------------------------------------
  const equippable = buckets?.Equippable ?? [];
  const firstItem = equippable.flatMap(b => b.items ?? [])[0];
  if (firstItem) {
    const iid = firstItem.itemInstanceId;
    console.log(`\n[5] Fetching item detail for instanceId ${iid}...`);
    const detail = await get(
      `/Destiny/${membershipType}/Account/${membershipId}/Character/${cid}/Inventory/${iid}/`
    );
    save('diag-item-detail.json', detail.json);
    console.log(`    HTTP status: ${detail.status}`);
    const d = detail.json?.Response?.data;
    if (d) {
      console.log(`    data keys: ${Object.keys(d).join(', ')}`);
      console.log(`    item keys: ${Object.keys(d.item ?? {}).join(', ')}`);
      console.log(`    perks count: ${(d.perks ?? []).length}`);
      console.log(`    talentGrid nodes: ${(d.talentGrid?.nodes ?? []).length}`);
    } else {
      console.log('    WARNING: no data in response');
      console.log('    Response keys:', Object.keys(detail.json?.Response ?? {}).join(', '));
    }
  }
}

// ---------------------------------------------------------------------------
// 6. Vault — raw response
// ---------------------------------------------------------------------------
console.log(`\n[6] Fetching vault...`);
const vault = await get(`/Destiny/${membershipType}/MyAccount/Vault/?accountId=${membershipId}`);
save('diag-vault.json', vault.json);
console.log(`    HTTP status: ${vault.status}`);
const vaultBuckets = vault.json?.Response?.data?.buckets ?? [];
console.log(`    Bucket count: ${vaultBuckets.length}`);
if (vaultBuckets.length > 0) {
  const firstBucket = vaultBuckets[0];
  console.log(`    First bucket keys: ${Object.keys(firstBucket).join(', ')}`);
  const firstItem = firstBucket.items?.[0];
  if (firstItem) console.log(`    First item keys: ${Object.keys(firstItem).join(', ')}`);
  // Count items with weapon bucket hashes
  const WEAPON_BUCKET_HASHES = new Set([1498876634, 2465295065, 953998645]);
  const weaponItems = vaultBuckets.flatMap(b => b.items ?? []).filter(i => WEAPON_BUCKET_HASHES.has(i.bucketHash));
  console.log(`    Items with weapon bucketHash: ${weaponItems.length}`);
}

console.log('\n=== Diagnostics complete ===');
console.log(`All files saved to ${CACHE_DIR}`);
console.log('Please share the contents of these files to help debug further.\n');
