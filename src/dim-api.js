/**
 * dim-api.js
 *
 * Minimal client for the DIM Sync API.
 * Handles auth token exchange and batch tag/notes updates.
 *
 * Docs: https://github.com/DestinyItemManager/dim-api
 */

const DIM_BASE = 'https://api.destinyitemmanager.com';

/**
 * Exchange a Bungie.net access token for a DIM API token.
 *
 * @param {string} bungieAccessToken
 * @param {string} bungieNetMembershipId
 * @param {string} dimApiKey
 * @returns {Promise<string>}  DIM access token
 */
export async function getDimToken(bungieAccessToken, bungieNetMembershipId, dimApiKey) {
  const res = await fetch(`${DIM_BASE}/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key':    dimApiKey,
    },
    body: JSON.stringify({
      bungieAccessToken,
      membershipId: bungieNetMembershipId,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DIM auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  if (!data.accessToken) throw new Error(`DIM auth response missing accessToken: ${JSON.stringify(data)}`);
  return data.accessToken;
}

/**
 * Read the current tag/notes profile for all D1 items from DIM Sync.
 *
 * @param {string} platformMembershipId
 * @param {string} dimToken
 * @param {string} dimApiKey
 * @returns {Promise<Array<{id: string, tag?: string, notes?: string}>>}
 */
export async function getExistingAnnotations(platformMembershipId, dimToken, dimApiKey) {
  const url =
    `${DIM_BASE}/profile?platformMembershipId=${platformMembershipId}` +
    `&destinyVersion=1&components=tags`;

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${dimToken}`,
      'X-API-Key':     dimApiKey,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DIM profile read failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.tags ?? [];
}

/**
 * Write a batch of tag + notes updates to DIM Sync for D1 items.
 *
 * @param {string} platformMembershipId
 * @param {string} dimToken
 * @param {string} dimApiKey
 * @param {Array<{id: string, tag: string | null, notes: string}>} updates
 */
export async function writeAnnotations(platformMembershipId, dimToken, dimApiKey, updates) {
  if (updates.length === 0) {
    console.log('[dim-api] No updates to write.');
    return;
  }

  // DIM API accepts updates in batches; we send all at once.
  const body = {
    platformMembershipId,
    destinyVersion: 1,
    updates: updates.map((u) => ({
      action: 'tag',
      payload: {
        id:    u.id,
        tag:   u.tag ?? null,
        notes: u.notes,
      },
    })),
  };

  const res = await fetch(`${DIM_BASE}/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dimToken}`,
      'X-API-Key':     dimApiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DIM profile update failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  // DIM returns per-update results; surface any errors
  const errors = (data.results ?? []).filter((r) => r.error);
  if (errors.length > 0) {
    console.warn(`[dim-api] ${errors.length} update(s) returned errors:`);
    errors.forEach((e) => console.warn('  ', JSON.stringify(e)));
  }

  console.log(`[dim-api] Wrote ${updates.length - errors.length}/${updates.length} annotation(s) successfully.`);
}
