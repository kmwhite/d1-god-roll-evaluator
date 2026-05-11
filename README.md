# D1 God Roll Evaluator

A web app for evaluating your Destiny 1 weapon rolls against community god roll definitions. Connect your Bungie account and see your entire inventory — characters and vault — scored against PvP and PvE god roll guides from TRUEGaming and Reddit.

Live at **[d1armory.net](https://d1armory.net)**

---

## Features

- Bungie OAuth login — reads your real D1 inventory
- Evaluates every weapon against PvP and PvE god roll definitions simultaneously
- God roll definitions sourced from two independent guides:
  - **TRUEGaming** (truegaming.boards.net)
  - **Reddit** (u/ebolaxb — r/DestinyTheGame)
  - Where guides agree, weapons are labelled `TRUEGaming + Reddit`
  - Where guides differ, both definitions are kept separately — a weapon must satisfy all four columns of one definition to count; mixing columns across sources is not allowed
- Result badges show which source produced the result, e.g. `★ GOD ROLL (Reddit)`
- Paired PvE/PvP rows per weapon in a single table
- Filters: Result, Mode, Tag, Slot, Type, Rarity, Damage
- Tags (Favorite, Keep, Upgrade, Evaluate, Infuse, Junk, Archive) — stored in localStorage
- Detail modal with stats, perk columns, and god roll evaluation breakdown
- Item transfers and equips between characters and vault
- Vendor tab — evaluates weapons currently sold by all Tower, Reef, and Xur vendors
- Platform switcher for multi-platform Bungie accounts

---

## Stack

- **Node.js 24** with built-in `node:sqlite` (no native compilation)
- **Express** + `express-session` + `session-file-store`
- **Bungie API** — D1 manifest (SQLite), character inventories, vault, vendors, transfers

---

## Local Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd d1-god-roll-evaluator
npm install
```

### 2. Create a Bungie application

Go to [bungie.net/en/Application](https://www.bungie.net/en/Application) and create an application with:

- **OAuth Client Type**: Confidential
- **Redirect URL**: `http://localhost:3000/callback` (for local dev)
- **Scope**: `MoveEquipDestinyItems`, `ReadDestinyVendorsAndAdvisors`

Note your **API Key**, **OAuth Client ID**, and **OAuth Client Secret**.

### 3. Configure environment

Create a `.env` file in the project root:

```
D1_GOD_ROLL_EVALUATOR_PLATFORM=psn
D1_GOD_ROLL_EVALUATOR_CLIENT_ID=your_client_id
D1_GOD_ROLL_EVALUATOR_CLIENT_SECRET=your_client_secret
D1_GOD_ROLL_EVALUATOR_API_KEY=your_api_key
D1_GOD_ROLL_EVALUATOR_SESSION_SECRET=your_session_secret
```

Generate a session secret with:

```bash
openssl rand -hex 32
```

`PLATFORM` should be `xbox`, `psn`, or `pc` — this sets the default platform when a user first logs in.

### 4. Run

```bash
npm start
```

Open http://localhost:3000, click **Connect to Bungie.net**, and authorise.

On first load the server downloads the D1 manifest (~15 MB) to `.cache/manifest.content`. Subsequent starts use the cached file and only re-download if Bungie publishes a new manifest version.

---

## God Roll Sources

God roll definitions live in `src/god-rolls.js`. Each weapon entry is either:

- A single definition object with `source: 'TRUEGaming + Reddit'` — both guides agree
- A single definition with `source: 'TRUEGaming'` or `source: 'Reddit'` — only one guide covers this weapon
- An array of two definitions — the guides differ meaningfully; each is evaluated independently

The evaluator (`src/evaluate.js`) scores each definition separately and returns the best result. No mixing of columns between definitions is allowed.

---

## Diagnostic Scripts

```bash
npm run diagnose        # Dumps raw API and manifest data to .cache/ for debugging
npm run diag:instance   # Shows perk nodes for a specific weapon instance
```

These require the env vars above to be set, and a valid Bungie session token cached locally.

---

## Project Structure

```
src/
  server.js        — Express server, OAuth, API routes, evaluation pipeline
  bungie.js        — Bungie API wrapper, manifest loading and parsing
  evaluate.js      — God roll scoring logic
  god-rolls.js     — PvP and PvE god roll definitions (TRUEGaming + Reddit)
  diagnose.js      — Diagnostic script (raw API dump)
  instance-diag.js — Diagnostic script (single weapon instance inspection)
public/
  index.html       — Single-page frontend (vanilla JS, no framework)
.cache/            — Manifest SQLite cache (gitignored)
.sessions/         — Session file store (gitignored)
.env               — Local environment config (gitignored)
```
