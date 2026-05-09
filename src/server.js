/**
 * server.js — D1 God Roll Evaluator web server
 *
 * Routes:
 *   GET  /                → serve public/index.html
 *   GET  /auth/login      → redirect to Bungie OAuth
 *   GET  /callback        → exchange code for token, store in session
 *   GET  /auth/status     → { authenticated: bool, platform?, displayName? }
 *   POST /auth/logout     → clear session
 *   GET  /api/inventory   → run full evaluation pipeline, return JSON
 *
 * Required env vars:
 *   D1_GOD_ROLL_EVALUATOR_PLATFORM      — xbox | psn | pc
 *   D1_GOD_ROLL_EVALUATOR_CLIENT_ID     — Bungie.net OAuth client ID
 *   D1_GOD_ROLL_EVALUATOR_CLIENT_SECRET — Bungie.net OAuth client secret
 *   D1_GOD_ROLL_EVALUATOR_API_KEY       — Bungie.net API key
 *
 * Optional:
 *   D1_GOD_ROLL_EVALUATOR_PORT          — port to listen on (default 3000)
 *   D1_GOD_ROLL_EVALUATOR_SESSION_SECRET — session signing secret (default random)
 *   D1_GOD_ROLL_EVALUATOR_DIM_API_KEY   — DIM Sync API key
 */

import express        from 'express';
import session        from 'express-session';
import FileStore      from 'session-file-store';
import { fileURLToPath } from 'url';
import path           from 'path';
import { mkdirSync } from 'fs';

import {
  resolveMembershipType,
  getMembershipId,
  buildManifestData,
  getCharacters,
  getCharacterWeapons,
  getVaultWeapons,
  extractPerkNames,
} from './bungie.js';

import { evaluateWeapon } from './evaluate.js';
import { PVP, PVE }                           from './god-rolls.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PLATFORM       = process.env.D1_GOD_ROLL_EVALUATOR_PLATFORM;
const CLIENT_ID      = process.env.D1_GOD_ROLL_EVALUATOR_CLIENT_ID;
const CLIENT_SECRET  = process.env.D1_GOD_ROLL_EVALUATOR_CLIENT_SECRET;
const API_KEY        = process.env.D1_GOD_ROLL_EVALUATOR_API_KEY;
const PORT           = parseInt(process.env.D1_GOD_ROLL_EVALUATOR_PORT ?? '3000', 10);
const SESSION_SECRET = process.env.D1_GOD_ROLL_EVALUATOR_SESSION_SECRET;
if (!SESSION_SECRET) {
  console.error('[server] Missing required env var: D1_GOD_ROLL_EVALUATOR_SESSION_SECRET');
  console.error('         Generate one with: openssl rand -hex 32');
  process.exit(1);
}
const REDIRECT_URI   = process.env.D1_GOD_ROLL_EVALUATOR_REDIRECT_URI ?? 'https://krypnos.net/callback';

const REQUIRED = { PLATFORM, CLIENT_ID, CLIENT_SECRET, API_KEY };
for (const [k, v] of Object.entries(REQUIRED)) {
  if (!v) {
    console.error(`[server] Missing required env var: D1_GOD_ROLL_EVALUATOR_${k}`);
    process.exit(1);
  }
}

const membershipType = resolveMembershipType(PLATFORM);

// ---------------------------------------------------------------------------
// Evaluation helpers (identical logic to old index.js)
// ---------------------------------------------------------------------------

const TIER_NAMES   = { 5: 'Legendary', 6: 'Exotic', 4: 'Rare', 3: 'Uncommon', 2: 'Common' };
const DAMAGE_NAMES = { 0: 'Kinetic', 1: 'Kinetic', 2: 'Arc', 3: 'Solar', 4: 'Void' };
const RESULT_RANK  = { '★ GOD ROLL': 0, '~ Close': 1, '✗ No': 2, '⚙ Curated Roll': 3, '⚠ Error': 4, '? —': 5 };

function mapGodRollToGridColumns(rollDef, byColumn) {
  const mapping = {};
  for (const colKey of ['col1', 'col2', 'col3', 'col4']) {
    const want = (rollDef?.[colKey] ?? []).map((w) => w.toLowerCase().trim());
    let found = null;
    for (const [gridCol, colPerks] of Object.entries(byColumn)) {
      if (want.some((w) => colPerks.map(p => p.toLowerCase().trim()).includes(w))) {
        found = parseInt(gridCol, 10);
        break;
      }
    }
    mapping[colKey] = found;
  }
  return mapping;
}

function colCell(want, byColumn, all, gridColIndex, allPossible) {
  if (!want || want.length === 0) return '—';
  const normAll = (all ?? []).map(p => p.toLowerCase().trim());
  const hit = want.find(w => normAll.includes(w.toLowerCase().trim()));
  if (hit) return `✓ ${hit}`;

  const wantStr = '[' + want.map(w => `'${w}'`).join(', ') + ']';
  if (gridColIndex === null) {
    const isRollable = want.some(w =>
      [...(allPossible ?? [])].map(p => p.toLowerCase().trim()).includes(w.toLowerCase().trim())
    );
    return `✗ want: ${wantStr}; has: ${isRollable ? '(not rolled)' : '(not rollable on this weapon)'}`;
  }
  const hasPerks = byColumn[gridColIndex] ?? [];
  const hasStr = hasPerks.length > 0
    ? '[' + hasPerks.map(p => `'${p}'`).join(', ') + ']'
    : '(not rolled)';
  return `✗ want: ${wantStr}; has: ${hasStr}`;
}

function buildAllPossiblePerks(stub, talentGridMap) {
  const gridNodes = talentGridMap.get(stub.talentGridHash) ?? [];
  const all = new Set();
  for (const node of gridNodes) {
    for (const step of node.steps ?? []) {
      const name = step.nodeStepName?.trim();
      if (name && name !== 'undefined') all.add(name);
    }
  }
  return all;
}

function hasDefinitionError(rollDef, allPossiblePerks) {
  if (!rollDef) return false;
  for (const colKey of ['col1', 'col2', 'col3', 'col4']) {
    const want = rollDef[colKey] ?? [];
    if (!want.length) continue;
    const normAll = [...allPossiblePerks].map(p => p.toLowerCase().trim());
    if (!want.some(w => normAll.includes(w.toLowerCase().trim()))) return true;
  }
  return false;
}

function modeResult(status, isError) {
  if (isError)                    return '⚠ Error';
  if (status === 'god_roll')      return '★ GOD ROLL';
  if (status === 'close')         return '~ Close';
  if (status === 'not_god_roll')  return '✗ No';
  return '? —';
}

function buildModalData(stub, itemData, talentGridMap) {
  const BUNGIE_ROOT  = 'https://www.bungie.net';
  const MISSING_ICON = '/img/misc/missing_icon.png';

  const STAT_NAMES = {
    4284893193: 'Rate of Fire', 4043523819: 'Impact',    1240592695: 'Range',
    155624089:  'Stability',    4188031367: 'Reload',     3871231066: 'Magazine',
    2715839340: 'Recoil',       1345609583: 'Aim Assist', 943549884:  'Equip Speed',
    2837207746: 'Speed',        2762071195: 'Efficiency', 209426660:  'Defense',
    925767036:  'Energy',       2961396640: 'Charge Rate',2523465841: 'Velocity',
  };
  const STAT_ORDER = [
    'Rate of Fire','Impact','Range','Stability','Reload','Magazine',
    'Aim Assist','Recoil','Equip Speed','Speed','Efficiency','Defense',
    'Energy','Charge Rate','Velocity',
  ];

  const stats = Object.values(stub.stats ?? {})
    .filter(s => STAT_NAMES[s.statHash])
    .map(s => ({ name: STAT_NAMES[s.statHash], value: s.value, max: s.maximumValue ?? 100 }))
    .sort((a, b) => STAT_ORDER.indexOf(a.name) - STAT_ORDER.indexOf(b.name));

  const gridNodes = talentGridMap.get(stub.talentGridHash) ?? [];
  const stubNodes = stub.nodes ?? [];
  const colMap = new Map();

  for (let i = 0; i < gridNodes.length; i++) {
    const gn = gridNodes[i];
    const sn = stubNodes[i] ?? {};
    const col = gn.column ?? -1;
    if (col <= 0) continue;
    if (!colMap.has(col)) colMap.set(col, []);

    const rolledStepIdx = sn.stepIndex ?? 0;
    const steps = (gn.steps ?? []).map((step, si) => ({
      name:     step.nodeStepName?.trim() ?? '',
      icon:     (step.icon && step.icon !== MISSING_ICON) ? `${BUNGIE_ROOT}${step.icon}` : null,
      isRolled: si === rolledStepIdx,
      isActive: si === rolledStepIdx && (sn.isActivated ?? false),
      desc:     step.nodeStepDescription?.trim() ?? '',
    })).filter(s => s.name && s.name !== 'undefined');

    if (steps.length === 0) continue;
    colMap.get(col).push({
      nodeIndex: i, exclusiveWith: gn.exlusiveWithNodes ?? [],
      rolledName: (gn.steps ?? [])[rolledStepIdx]?.nodeStepName?.trim() ?? '', steps,
    });
  }

  const columns = [];
  for (const [colIdx, nodes] of [...colMap.entries()].sort(([a], [b]) => a - b)) {
    const assigned = new Set();
    const slotGroups = [];
    for (const node of nodes) {
      if (assigned.has(node.nodeIndex)) continue;
      const group = [node];
      assigned.add(node.nodeIndex);
      for (const peerId of node.exclusiveWith) {
        const peer = nodes.find(n => n.nodeIndex === peerId);
        if (peer && !assigned.has(peer.nodeIndex)) { group.push(peer); assigned.add(peer.nodeIndex); }
      }
      slotGroups.push(group);
    }
    for (const group of slotGroups) {
      const seen = new Set();
      const allOptions = [];
      for (const opt of group.flatMap(n => n.steps)) {
        if (!seen.has(opt.name)) { seen.add(opt.name); allOptions.push(opt); }
      }
      if (!allOptions.length) continue;
      columns.push({ colIndex: colIdx, options: allOptions, rolledName: allOptions.find(s => s.isRolled)?.name ?? '' });
    }
  }

  return { stats, columns };
}

/**
 * Run the full evaluation pipeline for the given Bungie token.
 * Returns the htmlRows array ready for the browser to render.
 */
async function runEvaluation(bungieToken, bungieNetMembershipId) {
  const { weaponHashes, itemDataMap, talentGridMap } = await buildManifestData(API_KEY);
  const platformMembershipId = await getMembershipId(membershipType, API_KEY, bungieToken, bungieNetMembershipId);
  const characters    = await getCharacters(membershipType, platformMembershipId, API_KEY, bungieToken);
  const characterIds  = characters.map(c => c.characterId);

  const weaponStubs = [];
  for (const charId of characterIds) {
    const weapons = await getCharacterWeapons(membershipType, platformMembershipId, charId, API_KEY, bungieToken);
    weaponStubs.push(...weapons);
  }
  const vaultWeapons = await getVaultWeapons(membershipType, platformMembershipId, weaponHashes, API_KEY, bungieToken);
  weaponStubs.push(...vaultWeapons);

  const instanced = weaponStubs.filter(s => s.itemInstanceId && weaponHashes.has(s.itemHash));
  const results = [];

  for (const stub of instanced) {
    const itemData     = itemDataMap.get(stub.itemHash);
    const name         = itemData?.name ?? `Unknown (hash:${stub.itemHash})`;
    const itemTypeName = itemData?.itemTypeName ?? '';
    const perks        = extractPerkNames(stub, null, talentGridMap);
    const { byColumn, all } = perks;
    const allPossible  = buildAllPossiblePerks(stub, talentGridMap);
    const evaluation   = evaluateWeapon(name, all);
    const tierType     = itemData?.tierType ?? 0;
    const icon         = itemData?.icon ?? null;
    const isCurated    = itemData?.isCurated ?? false;
    const damageType   = stub.damageType ?? 0;
    const light        = stub.primaryStat?.value ?? stub.itemLevel ?? null;
    const modalData    = buildModalData(stub, itemData, talentGridMap);

    const SLOT_NAMES = { 1498876634: 'Primary', 2465295065: 'Special', 953998645: 'Heavy' };
    const slot         = SLOT_NAMES[stub.bucketHash] ?? 'Unknown';

    results.push({
      instanceId:     stub.itemInstanceId,
      itemHash:       stub.itemHash,
      characterId:    stub.characterId ?? null,
      transferStatus: stub.transferStatus ?? 0,
      location:       stub.location ?? 1,
      slot,
      name, itemTypeName, tierType, damageType, icon, isCurated, light,
      byColumn, all, allPossible, evaluation, modalData,
    });
  }

  // Sort: best result first, then alpha
  const bestOrder = r => {
    const s = [r.evaluation.pvp.status, r.evaluation.pve.status];
    if (s.includes('god_roll'))     return 0;
    if (s.includes('close'))        return 1;
    if (s.includes('not_god_roll')) return 2;
    return 3;
  };
  results.sort((a, b) => bestOrder(a) - bestOrder(b) || a.name.localeCompare(b.name));

  // Build flat rows (one per weapon × mode) for the browser
  const rows = [];
  for (const r of results) {
    for (const mode of ['PvP', 'PvE']) {
      const rollDef    = mode === 'PvP' ? PVP[r.name] : PVE[r.name];
      const evalResult = mode === 'PvP' ? r.evaluation.pvp : r.evaluation.pve;
      const gridMap    = mapGodRollToGridColumns(rollDef, r.byColumn);
      const w          = col => rollDef ? (rollDef[col] ?? []) : null;
      const isError    = hasDefinitionError(rollDef, r.allPossible);
      const result     = modeResult(evalResult.status, isError);
      const curated    = r.isCurated;

      rows.push({
        instanceId: r.instanceId,
        icon:       r.icon ? `https://www.bungie.net${r.icon}` : null,
        name:       r.name,
        type:       r.itemTypeName,
        slot:       r.slot,
        rarity:     TIER_NAMES[r.tierType]    ?? `Tier${r.tierType}`,
        damage:     DAMAGE_NAMES[r.damageType] ?? '—',
        damageRaw:  r.damageType,
        light:      r.light ?? null,
        mode,
        col1:       curated ? '—' : colCell(w('col1'), r.byColumn, r.all, gridMap['col1'], r.allPossible),
        col2:       curated ? '—' : colCell(w('col2'), r.byColumn, r.all, gridMap['col2'], r.allPossible),
        col3:       curated ? '—' : colCell(w('col3'), r.byColumn, r.all, gridMap['col3'], r.allPossible),
        col4:       curated ? '—' : colCell(w('col4'), r.byColumn, r.all, gridMap['col4'], r.allPossible),
        result:     curated ? '⚙ Curated Roll' : result,
        resultRank: curated ? 4 : (RESULT_RANK[result] ?? 99),
        // Transfer metadata — only needed once per weapon, attach to PvP row
        ...(mode === 'PvP' ? {
          modalData:      r.modalData,
          itemHash:       r.itemHash,
          characterId:    r.characterId,
          transferStatus: r.transferStatus,
          location:       r.location,
        } : {}),
      });
    }
  }

  return { rows, characters, characterIds, platformMembershipId };
}

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

async function refreshToken(refreshTokenValue) {
  const body = new URLSearchParams({
    grant_type:    'refresh_token',
    refresh_token: refreshTokenValue,
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });
  const res = await fetch('https://www.bungie.net/platform/app/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-API-Key': API_KEY },
    body: body.toString(),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  return {
    access_token:       data.access_token,
    refresh_token:      data.refresh_token ?? refreshTokenValue,
    membership_id:      data.membership_id,
    expires_at:         Date.now() + (data.expires_in ?? 3600) * 1000,
    refresh_expires_at: data.refresh_expires_in
                          ? Date.now() + data.refresh_expires_in * 1000 : null,
  };
}

/**
 * Middleware: ensure session has a valid, non-expired access token.
 * Attempts a refresh if the access token is expired but the refresh token is still valid.
 * Calls next() with req.token set, or responds 401 if not authenticated.
 */
async function requireAuth(req, res, next) {
  const t = req.session.token;
  if (!t) return res.status(401).json({ error: 'Not authenticated' });

  if (Date.now() > t.expires_at) {
    // Try to refresh
    if (!t.refresh_token || (t.refresh_expires_at && Date.now() > t.refresh_expires_at)) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'Session expired — please log in again' });
    }
    try {
      req.session.token = await refreshToken(t.refresh_token);
      await new Promise((resolve, reject) =>
        req.session.save(err => err ? reject(err) : resolve())
      );
    } catch (err) {
      console.error('[auth] Refresh failed:', err.message);
      return res.status(401).json({ error: 'Token refresh failed — please log in again' });
    }
  }

  req.token = req.session.token;
  next();
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();
const SessionFileStore = FileStore(session);
const SESSIONS_DIR = path.join(__dirname, '..', '.sessions');
mkdirSync(SESSIONS_DIR, { recursive: true });

// Trust the first proxy (nginx) so Express sees the correct protocol,
// IP, and can set secure cookies even though it runs on plain HTTP.
app.set('trust proxy', 1);

app.use(session({
  store: new SessionFileStore({
    path:        SESSIONS_DIR,
    ttl:         90 * 24 * 60 * 60, // 90 days in seconds — matches Bungie refresh token
    retries:     1,
    logFn:       () => {},           // suppress noisy file store logs
  }),
  secret:            SESSION_SECRET,
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure:   true,
    httpOnly: true,
    maxAge:   90 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  },
}));

// Serve static files from public/
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------------

app.get('/auth/login', (_req, res) => {
  const url = `https://www.bungie.net/en/OAuth/Authorize?client_id=${CLIENT_ID}&response_type=code`;
  res.redirect(url);
});

app.get('/callback', async (req, res) => {
  const { code } = req.query;
  console.log(`[callback] Received — code present: ${!!code}, protocol: ${req.protocol}, secure: ${req.secure}`);
  if (!code) return res.status(400).send('Missing code parameter');

  try {
    const body = new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  REDIRECT_URI,
    });

    const tokenRes = await fetch('https://www.bungie.net/platform/app/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-API-Key': API_KEY },
      body: body.toString(),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error('[callback] Token exchange failed:', tokenData);
      return res.status(500).send('Token exchange failed — check server logs');
    }

    req.session.token = {
      access_token:       tokenData.access_token,
      refresh_token:      tokenData.refresh_token ?? null,
      membership_id:      tokenData.membership_id,
      expires_at:         Date.now() + (tokenData.expires_in ?? 3600) * 1000,
      refresh_expires_at: tokenData.refresh_expires_in
                            ? Date.now() + tokenData.refresh_expires_in * 1000 : null,
    };

    console.log(`[callback] Token stored in session for membership ${tokenData.membership_id}`);
    res.redirect('/');
  } catch (err) {
    console.error('[callback] Error:', err);
    res.status(500).send('Authentication error');
  }
});

app.get('/auth/status', async (req, res) => {
  const t = req.session.token;
  console.log(`[auth/status] session token present: ${!!t}`);
  if (!t) return res.json({ authenticated: false });

  // If expired but refreshable, report as authenticated (the next API call will refresh)
  const accessExpired = Date.now() > t.expires_at;
  const refreshExpired = t.refresh_expires_at && Date.now() > t.refresh_expires_at;
  if (accessExpired && refreshExpired) {
    return res.json({ authenticated: false });
  }

  // Fetch the user's display name from Bungie
  try {
    const headers = { 'X-API-Key': API_KEY, 'Authorization': `Bearer ${t.access_token}` };
    const profileRes = await fetch(
      `https://www.bungie.net/Platform/User/GetMembershipsById/${t.membership_id}/254/`,
      { headers }
    );
    const profileData = await profileRes.json();
    const memberships = profileData.Response?.destinyMemberships ?? [];
    const match = memberships.find(m => m.membershipType === membershipType) ?? memberships[0];
    res.json({
      authenticated: true,
      displayName:   match?.displayName ?? 'Guardian',
      platform:      PLATFORM,
    });
  } catch {
    res.json({ authenticated: true, displayName: 'Guardian', platform: PLATFORM });
  }
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ---------------------------------------------------------------------------
// Inventory / evaluation API
// ---------------------------------------------------------------------------

app.get('/api/inventory', requireAuth, async (req, res) => {
  try {
    const { rows, characters, characterIds, platformMembershipId } = await runEvaluation(req.token.access_token, req.token.membership_id);
    res.json({ ok: true, rows, characters, characterIds, platformMembershipId });
  } catch (err) {
    console.error('[api/inventory] Error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Transfer API
// ---------------------------------------------------------------------------

app.use(express.json());

/**
 * POST /api/transfer
 * Body: { itemId, itemHash, characterId, transferToVault }
 *
 * Proxies to /Platform/Destiny/TransferItem/ using the session token.
 * transferToVault=true  → move item to vault   (characterId = source character)
 * transferToVault=false → pull from vault       (characterId = destination character)
 *
 * To move between characters, two calls are needed:
 *   1. character → vault  (transferToVault: true,  characterId: sourceCharId)
 *   2. vault → character  (transferToVault: false, characterId: destCharId)
 * The client handles this sequencing.
 */
app.post('/api/transfer', requireAuth, async (req, res) => {
  const { itemId, itemHash, characterId, transferToVault } = req.body ?? {};
  if (!itemId || !itemHash || !characterId || transferToVault === undefined) {
    return res.status(400).json({ ok: false, error: 'Missing required fields: itemId, itemHash, characterId, transferToVault' });
  }

  try {
    const body = {
      membershipType:    membershipType,
      itemReferenceHash: itemHash,
      itemId:            itemId,
      stackSize:         1,
      characterId:       characterId,
      transferToVault:   transferToVault,
    };

    const bungieRes = await fetch('https://www.bungie.net/Platform/Destiny/TransferItem/', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'X-API-Key':     API_KEY,
        'Authorization': `Bearer ${req.token.access_token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await bungieRes.json();
    if (data.ErrorCode !== 1) {
      console.error('[api/transfer] Bungie error:', data.Message);
      return res.status(400).json({ ok: false, error: data.Message ?? `ErrorCode ${data.ErrorCode}` });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[api/transfer] Error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/equip
 * Body: { itemId, characterId }
 * Equips an item on the specified character.
 * The item must already be on that character's inventory.
 */
app.post('/api/equip', requireAuth, async (req, res) => {
  const { itemId, characterId } = req.body ?? {};
  if (!itemId || !characterId) {
    return res.status(400).json({ ok: false, error: 'Missing required fields: itemId, characterId' });
  }

  try {
    const body = {
      membershipType: membershipType,
      itemId:         itemId,
      characterId:    characterId,
    };

    const bungieRes = await fetch('https://www.bungie.net/Platform/Destiny/EquipItem/', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'X-API-Key':     API_KEY,
        'Authorization': `Bearer ${req.token.access_token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await bungieRes.json();
    if (data.ErrorCode !== 1) {
      console.error('[api/equip] Bungie error:', data.Message);
      return res.status(400).json({ ok: false, error: data.Message ?? `ErrorCode ${data.ErrorCode}` });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[api/equip] Error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n=== D1 God Roll Evaluator ===`);
  console.log(`Server listening on http://127.0.0.1:${PORT}`);
  console.log(`Open https://krypnos.net/ in your browser\n`);
});
