# D1 God Roll Evaluator

Evaluates every weapon in your Destiny 1 vault and characters against community god roll definitions, then writes **tags** and **notes** directly into [DIM Sync](https://github.com/DestinyItemManager/dim-api) so they appear natively inside DIM.

God roll definitions sourced from the [TRUE Gaming guides](https://truegaming.boards.net):
- PvP: https://truegaming.boards.net/thread/433/god-roll-pvp-guide
- PvE: https://truegaming.boards.net/thread/437/god-roll-pve-guide

## How it works

| Result | DIM Tag | Condition |
|--------|---------|-----------|
| God Roll | ⭐ `favorite` | All 4 perk columns match for PvP **or** PvE |
| Close | 👍 `keep` | 3 of 4 columns match in at least one mode |
| Not notable | *(none)* | Fewer than 3 columns match in either mode |

Notes written to DIM look like:
```
PvP: ✓ GOD ROLL | PvE: ~ Close (3/4) — Col4 needs [Firefly]
```

---

## Requirements

- Node.js ≥ 18
- A [Bungie.net developer application](https://www.bungie.net/en/Application)
- A DIM Sync API key for non-localhost use (see [dim-api docs](https://github.com/DestinyItemManager/dim-api#get-an-api-key))

### Creating your Bungie.net application

1. Go to https://www.bungie.net/en/Application and click **Create New App**.
2. Set **OAuth Client Type** to `Confidential`.
3. Set **Redirect URL** to `http://localhost:7777/callback`.
4. Note your **API Key** and **OAuth client_id**.

---

## Setup

```bash
git clone <this repo>
cd d1-god-roll-evaluator
npm install
```

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `D1_GOD_ROLL_EVALUATOR_PLATFORM` | ✓ | Your platform: `xbox`, `psn`, or `pc` |
| `D1_GOD_ROLL_EVALUATOR_CLIENT_ID` | ✓ (auth only) | Bungie.net OAuth client ID |
| `D1_GOD_ROLL_EVALUATOR_API_KEY` | ✓ | Bungie.net API key |
| `D1_GOD_ROLL_EVALUATOR_DIM_API_KEY` | optional | DIM Sync API key — falls back to Bungie key for localhost |

Example:
```bash
export D1_GOD_ROLL_EVALUATOR_PLATFORM=xbox
export D1_GOD_ROLL_EVALUATOR_CLIENT_ID=12345
export D1_GOD_ROLL_EVALUATOR_API_KEY=abc123...
```

---

## Usage

### Step 1 — Authenticate (once per session)

```bash
npm run auth
```

Opens your browser to Bungie.net, completes the OAuth flow, and saves your token to `.token.json`. Tokens expire after ~1 hour — just run this again if the evaluator reports an expired token.

### Step 2 — Evaluate (dry run, default)

```bash
npm start
```

Fetches all your weapons, evaluates them, and prints a full report to STDOUT. **Nothing is written to DIM.** This is the safe default — use it freely while waiting for a production DIM API key, or just to audit your vault without committing any changes.

### Step 3 — Apply to DIM (opt-in)

```bash
npm run apply
```

Does everything `npm start` does, then also writes tags and notes to DIM Sync. Requires a valid `D1_GOD_ROLL_EVALUATOR_DIM_API_KEY` (or a localhost dev key for local use). After this runs, open DIM and your weapons will show:

- ⭐ `favorite` — god roll in PvP or PvE
- 👍 `keep` — close (3/4 columns) in at least one mode
- Detailed notes on which columns matched or are missing

Re-running `npm run apply` is safe — all annotations are overwritten, so stale tags from previous runs are always cleared.

---

## Project structure

```
src/
  auth.js       — Bungie.net OAuth flow; saves .token.json
  bungie.js     — Bungie Platform API client (inventory + manifest)
  dim-api.js    — DIM Sync API client (write annotations)
  evaluate.js   — God roll comparison logic
  god-rolls.js  — PvP + PvE god roll definitions (all weapons from the TRUE Gaming guides)
  index.js      — Main entry point / pipeline orchestrator
```

## Customising god roll definitions

Edit `src/god-rolls.js`. Each entry:

```js
"Eyasluna": {
  col1: ["SureShot IS", "TrueSight IS"],  // any of these are acceptable
  col2: ["Rangefinder"],
  col3: ["Rifled Barrel"],
  col4: ["Hidden Hand"],
},
```

Multiple values per column mean **any one** is acceptable. Adjust `CLOSE_THRESHOLD` (default `3`) to change how many columns must match for a "close" result.

## Getting a production DIM API key

For use outside of localhost you need a DIM Sync API key:

1. Join the [DIM Discord](https://t.co/70AKGCbEM5)
2. Message `bhollis` explaining what you're building
3. Set the returned key as `D1_GOD_ROLL_EVALUATOR_DIM_API_KEY`

For local development the Bungie API key is accepted as a fallback automatically.
