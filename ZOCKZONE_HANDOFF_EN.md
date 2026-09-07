# ZockZone — Project Handoff for Claude Code

## What This Is
A German-language browser game portal in the style of Poki/CrazyGames, with 47 playable mini-games.
Dark arcade aesthetic: Violet (`--violet: #7C3AED`) + Lime Green (`--lime: #C6FF3D`) accents,
"Fredoka" font for headlines, "Inter" for body text, "JetBrains Mono" for numbers and code-like displays.

- **Live:** `https://zockzone.hackthelab.uk` (publicly accessible via Cloudflare Tunnel, see below)
  — also directly on LAN at `http://10.0.10.10:8090`
- **Current state:** 47 playable mini-games, Supabase Auth (email+password only) + Postgres for
  highscores (5 of 47 games connected), PHP admin backend for user/game/score management and
  visitor statistics

## File Structure (after modularization — no longer a single file)
```
index.html              Shell: head, header, hero, catalog grid container, auth modal, footer
css/style.css           complete stylesheet
js/core.js              GAMES catalog, renderGrid, thumbBg, search/filter, openGame/loadGame,
                         hud/overMsg/mkHint/mkButton/addLeaderboardUI (all named exports)
js/auth.js              Supabase client + zzOpenAuth/zzSubmitAuth/zzLogOut/zzSaveHighScore/
                         zzShowLeaderboard (window.zz* bindings), also loads visibility
                         flags from the `games` table
js/games/<id>.js         one module per game (47 files), `export function build(){...}`,
                         lazy-loaded via `import()` on first open (performance: the browser
                         no longer parses all 47 games on page load — only core+auth+the
                         one currently open game)
admin/                  PHP admin backend, see dedicated section below
track.php               public, unauthenticated visitor-tracking endpoint
```

### Games Catalog (`js/core.js`)
```js
const GAMES = [ {id, title, icon, cat, tag, rating, plays}, ... ]  // 47 entries
```
- `cat` is one of: `arcade`, `puzzle`, `reflex`, `2player`
- `tag` is `''`, `'new'` or `'hot'` (shows a badge on the card)
- Card color comes from `thumbBg(id)`

### Game Loader (lazy-loading)
```js
const builders = { snake: () => import('./games/snake.js'), ... }  // 47 entries
```
`openGame(id)` → `loadGame(id)` → `await builders[id]()` imports the module on first open
(then cached by the browser) → `mod.build()` builds the game UI inside `#playerBody` and returns
a cleanup function (removes event listeners, clears `clearInterval`/`cancelAnimationFrame`).

### Every Game Module Follows the Same Pattern
```js
import { hud, overMsg, mkHint, mkButton, addLeaderboardUI, playerBody } from '../core.js';

export function build(){
  const scoreEl = hud(['Label','elementId'], ...);
  const wrap = document.createElement('div'); wrap.className='canvas-wrap';
  // ... build canvas or grid div ...
  playerBody.append(scoreEl, wrap, mkHint('Instructions text'));
  const over = overMsg(wrap, 'Game Over Text', start);
  // ... game logic: start(), event handlers, draw()/render() ...
  window.__restartCurrent = start;
  start();
  return () => { /* cleanup: clearInterval, removeEventListener etc. */ };
}
```

### Key Helpers (exports from `js/core.js`)
- `hud(...)` — builds the stats bar at the top of the game
- `overMsg(wrap, text, onRestart)` — overlay for win/loss
- `mkHint(text)` — gray hint text below the game
- `mkButton(label, bg, color)` — consistently styled button
- `addLeaderboardUI(gameId, gameTitle)` — adds a "🏆 Leaderboard" button + panel (calls `window.zzShowLeaderboard`)

### Game Visibility (catalog cards depending on login status / admin setting)
`js/auth.js` loads the `games` table at startup (`enabled_guest`, `enabled_registered` per game ID).
`renderGrid()` in `core.js` grays out a card:
- **"Temporarily disabled"** when `enabled_registered=false` (admin killswitch, affects everyone)
- **"🔒 Login required"** when `enabled_guest=false` and no user is logged in (clicking opens
  `zzOpenAuth()` instead of starting the game)
- If visibility info is missing (fetch failed, game not in table) → game is treated as fully enabled
  (fail-open — no game is accidentally locked out)

## Supabase Integration (self-hosted, publicly accessible)

Deliberately **not Firebase** (user decision) — instead Supabase (Postgres + Auth), self-hosted
via Docker on the owner's own server (no cloud project).

**Where in the code:** `js/auth.js` (ES module, loaded via `<script type="module" src="js/auth.js">` in `index.html`).
All functions called from outside (onclick handlers) are attached to `window`:
`window.zzOpenAuth`, `window.zzSubmitAuth`, `window.zzLogOut`, `window.zzSaveHighScore`,
`window.zzShowLeaderboard`. Google sign-in was deliberately removed — email+password only.

**SDK:** `@supabase/supabase-js@2`, imported via ESM.

**Config in `js/auth.js`:**
- `SUPABASE_URL = 'https://supabase.hackthelab.uk'` (public Cloudflare Tunnel hostname —
  NOT the internal `10.0.10.10:8000`, which is not reachable from outside the LAN)
- `SUPABASE_ANON_KEY` = the `SUPABASE_PUBLISHABLE_KEY` (format `sb_publishable_...`) — safe for the frontend

### Cloudflare Tunnel (makes server services publicly accessible without router port forwarding)
`cloudflared` runs as a systemd service on the server; tunnel configuration lives in the Cloudflare
Zero Trust dashboard (not locally visible). Current ingress rules:
- `zockzone.hackthelab.uk` → `http://10.0.10.10:8090` (the website)
- `supabase.hackthelab.uk` → `http://10.0.10.10:8000` (the Supabase API)
- additional hostnames for other services on the same server (znc, etc.)

**Important Cloudflare security rule:** `hackthelab.uk` → Security → Security Rules → Custom Rule
**"Supabase API - skip security level"** (Hostname equals `supabase.hackthelab.uk` → Skip → Security
Level). Without this rule, Cloudflare's automatic "Security Level" challenges every cross-origin
`fetch()` call from the website to the API with a Managed Challenge, resulting in a generic
"Failed to fetch" in the browser (full-page loads are not affected, only XHR/fetch) — **if this
ever happens again, check here first.**

### Self-hosted Supabase Stack (on the server, 10.0.10.10)
- **Project directory:** `~/zockzone-supabase/supabase-project`, Docker Compose stack
  from the official `supabase/supabase` repo (`docker/` directory, sparse-cloned, tag `self-hosted/v0.8.0`)
- **`.env`** contains all secrets (`POSTGRES_PASSWORD`, `DASHBOARD_PASSWORD`, `SUPABASE_SECRET_KEY`,
  `SERVICE_ROLE_KEY`, etc.) as well as `SITE_URL`/`SUPABASE_PUBLIC_URL`/`API_EXTERNAL_URL` (set to
  the public tunnel hostnames) and `ENABLE_EMAIL_AUTOCONFIRM=true` (no real SMTP server configured —
  confirmation emails would otherwise fail; for a gaming site without security-critical content,
  auto-confirm is the pragmatic choice) — **never commit**
- **API Gateway:** Envoy-based (container `supabase-envoy`, service name `api-gw`), port **8000**
- **Studio (Supabase's own admin UI — not to be confused with `admin/` below):** accessible on port 8000,
  login user `supabase`, password = `DASHBOARD_PASSWORD` from `.env`
- **Postgres:** container `supabase-db`, internal port 5432, not exposed externally
- **Ports on the server that must NOT be used** (other services run there — IRC bots, mail, FTP,
  DNS, Webmin, MySQL, n8n, etc.): 21, 22, 53, 80, 113, 442, 631, 853, 1234, 2112, 2222, 3306,
  8080, 8081, 9090, 10000, 20000, 20241, 33060
- **Restart the stack:** `cd ~/zockzone-supabase/supabase-project && docker compose up -d`
- **Stop the stack:** `docker compose down` (data is preserved in Docker volumes)

### Database Schema (Postgres, self-hosted)
```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, display_name text, created_at timestamptz default now(),
  active boolean not null default true  -- display mirror of GoTrue ban status, see admin/
);

create table highscores (
  user_id uuid references auth.users(id) on delete cascade,
  game_id text not null, game_title text, display_name text, score integer not null,
  updated_at timestamptz default now(), primary key (user_id, game_id)
);
create index highscores_game_score_idx on highscores (game_id, score desc);

create table games (
  id text primary key, title text not null,
  enabled_guest boolean not null default true,
  enabled_registered boolean not null default true,
  updated_at timestamptz not null default now()
);  -- seeded with all 47 games

create table page_visits (
  id bigserial primary key, visitor_hash text not null, ip_address text,
  country text, region text, city text, lat double precision, lon double precision,
  path text, user_agent text, referrer text, created_at timestamptz not null default now()
);
create index page_visits_created_idx on page_visits (created_at desc);

alter table profiles enable row level security;
alter table highscores enable row level security;
alter table games enable row level security;
alter table page_visits enable row level security;

create policy "Profile: read own" on profiles for select using (auth.uid() = id);
create policy "Profile: insert own" on profiles for insert with check (auth.uid() = id);
create policy "Highscores: everyone can read" on highscores for select using (true);
create policy "Highscores: insert own only" on highscores for insert with check (auth.uid() = user_id);
create policy "Highscores: update own only" on highscores for update using (auth.uid() = user_id);
create policy "Games: everyone can read" on games for select using (true);
-- page_visits: no anon/authenticated policies — service_role only (admin backend, track.php)

grant usage on schema public to anon, authenticated;
grant select on public.highscores to anon, authenticated;
grant insert, update on public.highscores to authenticated;
grant select, insert on public.profiles to authenticated;
grant select on public.games to anon, authenticated;
```

### What Works
- Login/registration via email+password using `supabase.auth.signUp` / `signInWithPassword`
- Saving highscores + leaderboard (top 10) for **5 of 47 games**: `snake`, `twenty48`, `flappy`, `runner`, `invaders`
- User deactivation: admin backend bans via GoTrue Admin API (`ban_duration`), enforced at the
  auth level (not just a client-side flag)

### To Extend Highscores to More Games
Two additions per game — **no** schema changes needed:
1. Add `addLeaderboardUI('gameId', 'Display Name')` in the corresponding `js/games/<id>.js`
2. Add `if(window.zzSaveHighScore) window.zzSaveHighScore('gameId','Display Name',score);` at the
   point where the game ends

## Admin Backend (`admin/`, PHP)

Password-protected management panel, independent of the players' Supabase Auth (separate
session-based login). Accessible at `/admin/` on the same Apache vHost.

- **Login:** `admin/index.php`, username in `ADMIN_USERNAME`, bcrypt hash in `ADMIN_PASSWORD_HASH`
  (both in `admin/includes/config.php`, **gitignored**, template in `config.php.example`)
- **`admin/includes/supabase_client.php`**: `sb_request()` — calls the PostgREST/GoTrue Admin API
  with the `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS entirely — this key must never reach the
  frontend or the repository)
- **Users** (`admin/users.php` + `admin/api/users.php`): list (joined with `profiles` + highscore
  count), create, change email/password, activate/deactivate (GoTrue `ban_duration`), delete
  (cascades to `profiles`/`highscores`)
- **Games** (`admin/games.php`): toggle `enabled_guest`/`enabled_registered` per game — takes
  effect immediately on the live site (see "Game Visibility" above)
- **Highscores** (`admin/scores.php`): reset an individual score or delete an entire game's leaderboard
- **Visitors** (`admin/visitors.php`): visits/unique visitors (today/7d/30d/total), top countries,
  top pages, map (Leaflet + CartoDB Dark Tiles) — data source is `page_visits`

### Visitor Tracking (`track.php`)
A public, unauthenticated endpoint, called fire-and-forget via `fetch()` from `js/core.js` on every
page load. Determines the real visitor IP from the `CF-Connecting-IP` header — **but only when the
request actually comes from a Cloudflare edge IP** (checked against Cloudflare's published IP ranges
in `admin/includes/trusted_proxy.php`), otherwise the header is ignored and `REMOTE_ADDR` is used
(otherwise anyone on the same network could spoof the address on direct connections to port 8090).
GeoIP resolution for public IPs via the free `ip-api.com` API (no account or key required);
private/LAN IPs are not resolved.

### Security Note (fixed during a code review, as of this session)
An earlier draft of `admin/users.php` built rows via string templates with
`onclick="deleteUser('${id}', '${escapeHtml(email)}')"` — `escapeHtml()` escapes HTML special
characters but **not single quotes**, meaning an email address containing `'` (e.g.
`o'brien@example.com`, a perfectly valid value) could break out of the single-quoted JS string and
execute arbitrary code in the logged-in admin session (stored XSS → full admin panel takeover,
triggerable by any unauthenticated self-registration). **Fix:** rows are now built using
`createElement`/`textContent`/`addEventListener` — never via string interpolation in a JS context.
When modifying `admin/*.php` files: **never** embed user data in an `onclick="..."` string,
no matter how escaped — attach event listeners via JS instead.

## Known Limitations / Technical Debt
- **Checkers:** single-jump forced capture only — no multi-jump chains
- **Mini Sudoku:** puzzle generation does not guarantee a unique solution, but always guarantees a solvable one
- **Tetris Mini:** no wall-kick system
- **Clicker Factory & One-Armed Bandit:** pure filler with no real skill component (intentional)
- 10 gameplay bugs were found and fixed during modularization (Blackjack dealer blackjack push,
  15-puzzle solvability, Maze/Timingbar timer leaks, Wordle double-letter counting, Minesweeper
  flag counter, Flappy double `die()`, RPS match end, Asteroids double life deduction) — see
  commit history for details

## Suggestions for Sensible Next Steps
- Extend the highscore system to more games (see pattern above)
- HTTPS/reverse proxy in front of Apache (currently plain HTTP on port 8090; the Cloudflare Tunnel
  already delivers HTTPS externally)
- Schedule regular cleanup of old `page_visits` rows if the table grows large
