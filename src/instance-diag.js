/**
 * instance-diag.js
 * Shows the actual nodes on your "44 Curtain Call" instance vs the full
 * talent grid definition, so we can see what the stub's nodes[] contains.
 *
 * Run: node src/instance-diag.js
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import Database from 'better-sqlite3';

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST_DB = path.join(__dirname, '..', '.cache', 'manifest.content');
const TOKEN_PATH  = path.join(__dirname, '..', '.token.json');

const PLATFORM = process.env.D1_GOD_ROLL_EVALUATOR_PLATFORM;
const API_KEY  = process.env.D1_GOD_ROLL_EVALUATOR_API_KEY;
const BASE     = 'https://www.bungie.net/Platform';

const WEAPON_BUCKET_HASHES = new Set([1498876634, 2465295065, 953998645]);

if (!existsSync(TOKEN_PATH)) { console.error('No .token.json — run npm run auth first'); process.exit(1); }
if (!existsSync(MANIFEST_DB)) { console.error('No manifest — run npm start once first'); process.exit(1); }
if (!PLATFORM || !API_KEY) { console.error('Missing env vars'); process.exit(1); }

const token = JSON.parse(readFileSync(TOKEN_PATH, 'utf8'));
const { access_token: bungieToken, membership_id: bungieNetMembershipId } = token;
const membershipTypeMap = { xbox: 1, xboxone: 1, psn: 2, ps4: 2, pc: 4 };
const membershipType = membershipTypeMap[PLATFORM.toLowerCase()] ?? parseInt(PLATFORM, 10);

async function get(urlPath, auth = true) {
  const headers = { 'X-API-Key': API_KEY };
  if (auth) headers['Authorization'] = `Bearer ${bungieToken}`;
  const res = await fetch(`${BASE}${urlPath}`, { headers });
  return res.json();
}

// Load manifest data
const db = new Database(MANIFEST_DB, { readonly: true });

const talentGridMap = new Map();
for (const row of db.prepare('SELECT json FROM DestinyTalentGridDefinition').all()) {
  const def = JSON.parse(row.json);
  if (def.gridHash && def.nodes) talentGridMap.set(def.gridHash, def.nodes);
}

const itemDefMap = new Map();
for (const row of db.prepare('SELECT json FROM DestinyInventoryItemDefinition').all()) {
  const def = JSON.parse(row.json);
  if (def.itemHash) itemDefMap.set(def.itemHash, def);
}

db.close();

// Resolve membership
const memberships = await get(`/User/GetMembershipsById/${bungieNetMembershipId}/254/`);
const match = (memberships.Response?.destinyMemberships ?? []).find(m => m.membershipType === membershipType);
if (!match) { console.error('No membership found'); process.exit(1); }
const membershipId = match.membershipId;

// Fetch all characters
const summary = await get(`/Destiny/${membershipType}/Account/${membershipId}/Summary/`);
const characterIds = (summary.Response?.data?.characters ?? []).map(c => c.characterBase.characterId);

// Collect all weapon stubs
const allStubs = [];
for (const charId of characterIds) {
  const inv = await get(`/Destiny/${membershipType}/Account/${membershipId}/Character/${charId}/Inventory/`);
  const equippable = inv.Response?.data?.buckets?.Equippable ?? [];
  for (const bucket of equippable) {
    if (!WEAPON_BUCKET_HASHES.has(bucket.bucketHash)) continue;
    for (const item of bucket.items ?? []) {
      allStubs.push({ ...item, bucketHash: bucket.bucketHash, characterId: charId });
    }
  }
}

// Vault
const vault = await get(`/Destiny/${membershipType}/MyAccount/Vault/?accountId=${membershipId}`);
for (const bucket of vault.Response?.data?.buckets ?? []) {
  for (const item of bucket.items ?? []) {
    const def = itemDefMap.get(item.itemHash);
    if (def && WEAPON_BUCKET_HASHES.has(def.bucketTypeHash)) {
      allStubs.push({ ...item, bucketHash: def.bucketTypeHash, characterId: null });
    }
  }
}

// Find 44 Curtain Call instances
const targets = allStubs.filter(s => {
  const def = itemDefMap.get(s.itemHash);
  return def?.itemName === '44 Curtain Call';
});

if (targets.length === 0) {
  console.log('No "44 Curtain Call" found in inventory or vault.');
  process.exit(0);
}

console.log(`\nFound ${targets.length} instance(s) of "44 Curtain Call"\n`);

for (const stub of targets) {
  const def = itemDefMap.get(stub.itemHash);
  console.log('='.repeat(70));
  console.log(`Instance ID : ${stub.itemInstanceId}`);
  console.log(`Item Hash   : ${stub.itemHash}`);
  console.log(`Grid Hash   : ${stub.talentGridHash}`);
  console.log(`Damage Type : ${stub.damageType} / ${stub.damageTypeHash}`);
  console.log(`Location    : ${stub.characterId ? `character ${stub.characterId}` : 'vault'}`);

  console.log('\n--- Stub nodes[] (what this instance actually has) ---');
  const stubNodes = stub.nodes ?? [];
  console.log(`Node count on stub: ${stubNodes.length}`);
  for (const node of stubNodes) {
    console.log(`  node[${node.nodeIndex ?? node.index ?? '?'}]: isActivated=${node.isActivated} stepIndex=${node.stepIndex ?? '?'}`);
  }

  console.log('\n--- Talent grid definition (ALL possible nodes) ---');
  const gridNodes = talentGridMap.get(stub.talentGridHash) ?? [];
  console.log(`Node count in grid definition: ${gridNodes.length}`);
  for (const nodeDef of gridNodes) {
    const stepNames = (nodeDef.steps ?? []).map(s => s.nodeStepName).filter(Boolean);
    const isExclusive = (nodeDef.exlusiveWithNodes ?? []).length > 0;
    console.log(`  gridNode[${nodeDef.nodeIndex}] col=${nodeDef.column} steps=[${stepNames.join(', ')}]${isExclusive ? ` exclusive_with=[${nodeDef.exlusiveWithNodes}]` : ''}`);
  }

  console.log('\n--- Cross-reference: actual rolled perks on THIS instance ---');
  console.log('(stub.nodes[i] + stepIndex → gridNodes[i].steps[stepIndex].nodeStepName)\n');
  for (let i = 0; i < stubNodes.length; i++) {
    const stubNode = stubNodes[i];
    const gridNode = gridNodes[i];
    if (!gridNode) { console.log(`  pos[${i}]: no grid node`); continue; }
    const step = (gridNode.steps ?? [])[stubNode.stepIndex ?? 0];
    const rolledName = step?.nodeStepName ?? '(unnamed)';
    const allStepNames = (gridNode.steps ?? []).map(s => s.nodeStepName).filter(Boolean);
    console.log(`  pos[${i}] col=${gridNode.column} stepIndex=${stubNode.stepIndex ?? 0} → ROLLED="${rolledName}" (options: [${allStepNames.join(', ')}]) isActivated=${stubNode.isActivated}`);
  }
}
