/**
 * auth.js
 *
 * Handles the Bungie.net OAuth 2.0 flow and persists the token to .token.json.
 * Run standalone (`npm run auth`) whenever your token expires.
 *
 * Required env vars:
 *   D1_GOD_ROLL_EVALUATOR_CLIENT_ID     — Bungie.net OAuth client ID
 *   D1_GOD_ROLL_EVALUATOR_CLIENT_SECRET — Bungie.net OAuth client secret (Confidential apps only)
 *   D1_GOD_ROLL_EVALUATOR_API_KEY       — Bungie.net API key
 */

import http from 'http';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_PATH = path.join(__dirname, '..', '.token.json');

const CLIENT_ID     = process.env.D1_GOD_ROLL_EVALUATOR_CLIENT_ID;
const CLIENT_SECRET = process.env.D1_GOD_ROLL_EVALUATOR_CLIENT_SECRET;
const API_KEY       = process.env.D1_GOD_ROLL_EVALUATOR_API_KEY;
const REDIRECT      = 'https://krypnos.net/callback';

if (!CLIENT_ID || !CLIENT_SECRET || !API_KEY) {
  console.error(
    '\n[auth] Missing required env vars:\n' +
    '  D1_GOD_ROLL_EVALUATOR_CLIENT_ID\n' +
    '  D1_GOD_ROLL_EVALUATOR_CLIENT_SECRET\n' +
    '  D1_GOD_ROLL_EVALUATOR_API_KEY\n'
  );
  process.exit(1);
}

const BUNGIE_AUTH_URL =
  `https://www.bungie.net/en/OAuth/Authorize` +
  `?client_id=${CLIENT_ID}` +
  `&response_type=code`;

console.log('\n=== D1 God Roll Evaluator — Bungie.net Auth ===\n');
console.log('Opening your browser to authenticate with Bungie.net...\n');
console.log('If your browser does not open automatically, visit:\n', BUNGIE_AUTH_URL, '\n');

// Attempt to open the browser — gracefully skip if unavailable
try {
  const { default: open } = await import('open');
  await open(BUNGIE_AUTH_URL);
} catch {
  // Non-fatal — user will visit URL manually
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:7777');
  if (url.pathname !== '/callback') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const code = url.searchParams.get('code');
  if (!code) {
    res.writeHead(400);
    res.end('Missing code parameter in redirect.');
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h2 style="font-family:sans-serif">&#10003; Authorised! You can close this tab and return to the terminal.</h2>');
  server.close();

  console.log('[auth] Received authorisation code. Exchanging for access token...');

  const body = new URLSearchParams({
    grant_type:     'authorization_code',
    code,
    client_id:      CLIENT_ID,
    client_secret:  CLIENT_SECRET,
    redirect_uri:   REDIRECT,
  });

  const tokenRes = await fetch('https://www.bungie.net/platform/app/oauth/token/', {
    method:  'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-API-Key':    API_KEY,
    },
    body: body.toString(),
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.access_token) {
    console.error('[auth] Token exchange failed:', JSON.stringify(tokenData, null, 2));
    process.exit(1);
  }

  const stored = {
    access_token:       tokenData.access_token,
    refresh_token:      tokenData.refresh_token ?? null,
    membership_id:      tokenData.membership_id,
    expires_at:         Date.now() + (tokenData.expires_in ?? 3600) * 1000,
    refresh_expires_at: tokenData.refresh_expires_in
                          ? Date.now() + tokenData.refresh_expires_in * 1000
                          : null,
  };

  writeFileSync(TOKEN_PATH, JSON.stringify(stored, null, 2));
  console.log(`[auth] Token saved to ${TOKEN_PATH}`);
  console.log('[auth] Done! Run "npm start" to evaluate your weapons.\n');
});

server.listen(7777, () => {
  console.log('[auth] Listening for Bungie.net redirect on http://localhost:7777/callback ...');
});
