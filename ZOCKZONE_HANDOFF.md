# ZockZone — Projekt-Handoff für Claude Code   -= claude --resume a72a729a-c6e3-4796-b50c-131e978c0df8 =-

## Was das ist
Deutschsprachiges Browsergame-Portal im Stil von Poki/CrazyGames, 47 spielbare Mini-Games.
Dark-Arcade-Ästhetik: Violett (`--violet: #7C3AED`) + Lime Green (`--lime: #C6FF3D`) Akzente,
Font "Fredoka" für Headlines, "Inter" für Body, "JetBrains Mono" für Zahlen/Code-artige Anzeigen.

- **Live:** `https://zockzone.hackthelab.uk` (öffentlich erreichbar via Cloudflare Tunnel,
  siehe unten) — auch direkt im LAN unter `http://10.0.10.10:8090`
- **Aktueller Stand:** 47 spielbare Mini-Games, Supabase Auth (nur E-Mail+Passwort) + Postgres für
  Highscores (5 von 47 Spielen angebunden), Admin-Backend (PHP) für Nutzer-/Spiele-/Score-Verwaltung
  und Besucherstatistik

## Dateistruktur (seit der Modularisierung, kein Single-File mehr)
```
index.html              Shell: Head, Header, Hero, Katalog-Grid-Container, Auth-Modal, Footer
css/style.css           komplettes Stylesheet
js/core.js              GAMES-Katalog, renderGrid, thumbBg, Suche/Filter, openGame/loadGame,
                         hud/overMsg/mkHint/mkButton/addLeaderboardUI (alle als named exports)
js/auth.js              Supabase-Client + zzOpenAuth/zzSubmitAuth/zzLogOut/zzSaveHighScore/
                         zzShowLeaderboard (window.zz*-Bindings), lädt zusätzlich die
                         Sichtbarkeits-Flags aus der `games`-Tabelle
js/games/<id>.js         ein Modul pro Spiel (47 Dateien), `export function build(){...}`,
                         lazy-geladen per `import()` beim ersten Öffnen (Performance: der Browser
                         parsed nicht mehr alle 47 Spiele beim Laden der Seite, nur core+auth+das
                         eine gerade geöffnete Spiel)
admin/                  PHP-Admin-Backend, siehe eigener Abschnitt unten
track.php               öffentlicher, unauthentifizierter Besucher-Tracking-Endpunkt
```

### Spiele-Katalog (`js/core.js`)
```js
const GAMES = [ {id, title, icon, cat, tag, rating, plays}, ... ]  // 47 Einträge
```
- `cat` ist eine von: `arcade`, `puzzle`, `reflex`, `2player`
- `tag` ist `''`, `'new'` oder `'hot'` (zeigt Badge auf der Karte)
- Kartenfarbe kommt aus `thumbBg(id)`

### Spiel-Loader (lazy-loading)
```js
const builders = { snake: () => import('./games/snake.js'), ... }  // 47 Einträge
```
`openGame(id)` → `loadGame(id)` → `await builders[id]()` importiert das Modul beim ersten Öffnen
(danach vom Browser gecacht) → `mod.build()` baut das Spiel-UI in `#playerBody` und gibt eine
Cleanup-Funktion zurück (Event-Listener entfernen, `clearInterval`/`cancelAnimationFrame`).

### Jedes Spielmodul folgt demselben Muster
```js
import { hud, overMsg, mkHint, mkButton, addLeaderboardUI, playerBody } from '../core.js';

export function build(){
  const scoreEl = hud(['Label','elementId'], ...);
  const wrap = document.createElement('div'); wrap.className='canvas-wrap';
  // ... Canvas oder Grid-Div aufbauen ...
  playerBody.append(scoreEl, wrap, mkHint('Anleitungstext'));
  const over = overMsg(wrap, 'Game Over Text', start);
  // ... Spiellogik: start(), Event-Handler, draw()/render() ...
  window.__restartCurrent = start;
  start();
  return () => { /* cleanup: clearInterval, removeEventListener etc. */ };
}
```

### Wichtige Helper (Exports aus `js/core.js`)
- `hud(...)` — baut die Stats-Zeile oben im Spiel
- `overMsg(wrap, text, onRestart)` — Overlay bei Sieg/Niederlage
- `mkHint(text)` — grauer Hinweistext unter dem Spiel
- `mkButton(label, bg, color)` — einheitlich gestylter Button
- `addLeaderboardUI(gameId, gameTitle)` — fügt "🏆 Bestenliste"-Button + Panel hinzu (ruft `window.zzShowLeaderboard`)

### Spiele-Sichtbarkeit (Katalog-Karten je nach Login-Status/Admin-Einstellung)
`js/auth.js` lädt beim Start die `games`-Tabelle (`enabled_guest`, `enabled_registered` pro Spiel-ID).
`renderGrid()` in `core.js` graut eine Karte aus:
- **"Vorübergehend deaktiviert"**, wenn `enabled_registered=false` (Admin-Killswitch, gilt für alle)
- **"🔒 Login erforderlich"**, wenn `enabled_guest=false` und kein Nutzer eingeloggt ist (Klick öffnet
  `zzOpenAuth()` statt das Spiel zu starten)
- Fehlt die Sichtbarkeits-Info (Fetch fehlgeschlagen, Spiel nicht in der Tabelle) → Spiel gilt als
  voll aktiviert (fail-open, kein Spiel wird versehentlich gesperrt)

## Supabase-Integration (selbstgehostet, öffentlich erreichbar)

Bewusst **kein Firebase** (Nutzerentscheidung) — stattdessen Supabase (Postgres + Auth), selbstgehostet
per Docker auf csurlees eigenem Server (kein Cloud-Projekt mehr).

**Wo im Code:** `js/auth.js` (ES-Modul, per `<script type="module" src="js/auth.js">` in `index.html`
geladen). Alle von außen (onclick-Handlern) aufgerufenen Funktionen hängen auf `window`:
`window.zzOpenAuth`, `window.zzSubmitAuth`, `window.zzLogOut`, `window.zzSaveHighScore`,
`window.zzShowLeaderboard`. Google-Sign-in wurde bewusst entfernt — nur E-Mail+Passwort.

**SDK:** `@supabase/supabase-js@2`, per ESM-Import von `esm.sh`.

**Config in `js/auth.js`:**
- `SUPABASE_URL = 'https://supabase.hackthelab.uk'` (öffentlicher Cloudflare-Tunnel-Hostname,
  NICHT die interne `10.0.10.10:8000` — die ist von außerhalb des LANs nicht erreichbar)
- `SUPABASE_ANON_KEY` = der `SUPABASE_PUBLISHABLE_KEY` (Format `sb_publishable_...`) — sicher fürs
  Frontend

### Cloudflare Tunnel (macht Server-Dienste öffentlich erreichbar, ohne Portfreigabe am Router)
`cloudflared` läuft als systemd-Service auf dem Server, Tunnel-Konfiguration liegt im Cloudflare
Zero-Trust-Dashboard (nicht lokal einsehbar), aktuelle Ingress-Regeln (Stand dieser Session):
- `zockzone.hackthelab.uk` → `http://10.0.10.10:8090` (die Webseite)
- `supabase.hackthelab.uk` → `http://10.0.10.10:8000` (die Supabase-API)
- weitere, projektfremde Hostnamen für andere Dienste auf demselben Server (znc, etc.)

**Wichtige Cloudflare-Sicherheitsregel:** `hackthelab.uk` → Security → Security rules → Custom rule
**"Supabase API - skip security level"** (Hostname equals `supabase.hackthelab.uk` → Skip → Security
Level). Ohne diese Regel challenged Cloudflares automatisches "Security Level" jeden Cross-Origin
`fetch()`-Aufruf von der Webseite zur API mit einem Managed Challenge, was zu einem generischen
"Failed to fetch" im Browser führt (Full-Page-Loads sind nicht betroffen, nur XHR/fetch) — **falls
das je wieder auftritt, zuerst hier nachsehen.**

### Selbstgehosteter Supabase-Stack (auf csurlees Server, 10.0.10.10)
- **Projektverzeichnis:** `~/zockzone-supabase/supabase-project` (User `csurlee`), Docker-Compose-Stack
  aus dem offiziellen `supabase/supabase` Repo (`docker/`-Verzeichnis, sparse-cloned, Tag `self-hosted/v0.8.0`)
- **`.env`** enthält alle Secrets (`POSTGRES_PASSWORD`, `DASHBOARD_PASSWORD`, `SUPABASE_SECRET_KEY`,
  `SERVICE_ROLE_KEY` etc.) sowie `SITE_URL`/`SUPABASE_PUBLIC_URL`/`API_EXTERNAL_URL` (auf die
  öffentlichen Tunnel-Hostnamen gesetzt) und `ENABLE_EMAIL_AUTOCONFIRM=true` (kein echter SMTP-Server
  konfiguriert — Bestätigungsmails würden sonst fehlschlagen; für eine Spiele-Seite ohne
  sicherheitskritische Inhalte ist Autoconfirm die pragmatische Wahl) — **niemals committen**
- **API-Gateway:** Envoy-basiert (Container `supabase-envoy`, Service-Name `api-gw`), Port **8000**
- **Studio (Admin-UI von Supabase selbst, nicht zu verwechseln mit `admin/` unten):** über Port 8000
  erreichbar, Login-User `supabase`, Passwort = `DASHBOARD_PASSWORD` aus der `.env`
- **Postgres:** Container `supabase-db`, intern Port 5432, nicht nach außen exponiert
- **Ports auf dem Server, die NICHT belegt werden dürfen** (dort laufen andere Dienste — IRC-Bots,
  Mail, FTP, DNS, Webmin, MySQL, n8n, etc.): 21, 22, 53, 80, 113, 442, 631, 853, 1234, 2112, 2222,
  3306, 8080, 8081, 9090, 10000, 20000, 20241, 33060
- **Stack neu starten:** `cd ~/zockzone-supabase/supabase-project && docker compose up -d`
- **Stack stoppen:** `docker compose down` (Daten bleiben in Docker-Volumes erhalten)

### Datenbankschema (Postgres, self-hosted)
```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, display_name text, created_at timestamptz default now(),
  active boolean not null default true  -- Anzeige-Spiegel des GoTrue-Bann-Status, siehe admin/
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
);  -- mit allen 47 Spielen geseedet

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

create policy "Profile: eigenes lesen" on profiles for select using (auth.uid() = id);
create policy "Profile: eigenes anlegen" on profiles for insert with check (auth.uid() = id);
create policy "Highscores: alle duerfen lesen" on highscores for select using (true);
create policy "Highscores: nur eigene schreiben" on highscores for insert with check (auth.uid() = user_id);
create policy "Highscores: nur eigene updaten" on highscores for update using (auth.uid() = user_id);
create policy "Games: alle duerfen lesen" on games for select using (true);
-- page_visits: keine anon/authenticated-Policies -- nur service_role (Admin-Backend, track.php)

grant usage on schema public to anon, authenticated;
grant select on public.highscores to anon, authenticated;
grant insert, update on public.highscores to authenticated;
grant select, insert on public.profiles to authenticated;
grant select on public.games to anon, authenticated;
```

### Was funktioniert
- Login/Registrierung per E-Mail+Passwort via `supabase.auth.signUp` / `signInWithPassword`
- Highscore speichern + Bestenliste (Top 10) für **5 von 47 Spielen**: `snake`, `twenty48`, `flappy`, `runner`, `invaders`
- Nutzer-Deaktivierung: Admin-Backend bannt via GoTrue Admin-API (`ban_duration`), echte
  Durchsetzung auf Auth-Ebene (nicht nur ein Client-Flag)

### Um Highscores auf weitere Spiele auszuweiten
Pro Spiel zwei Ergänzungen nötig, **keine** Schema-Änderung nötig:
1. `addLeaderboardUI('gameId', 'Anzeigename')` im entsprechenden `js/games/<id>.js` einfügen
2. `if(window.zzSaveHighScore) window.zzSaveHighScore('gameId','Anzeigename',score);` an der Stelle
   einfügen, wo das Spiel endet

## Admin-Backend (`admin/`, PHP)

Passwortgeschütztes Verwaltungs-Panel, unabhängig vom Supabase-Auth der Spieler (eigener,
session-basierter Login). Erreichbar unter `/admin/` auf demselben Apache-vHost.

- **Login:** `admin/index.php`, Username in `ADMIN_USERNAME`, bcrypt-Hash in `ADMIN_PASSWORD_HASH`
  (beides in `admin/includes/config.php`, **gitignored**, Vorlage in `config.php.example`)
- **`admin/includes/supabase_client.php`**: `sb_request()` — ruft PostgREST/GoTrue-Admin-API mit dem
  `SUPABASE_SERVICE_ROLE_KEY` auf (umgeht RLS komplett, daher darf dieser Key niemals ins Frontend
  oder Repo gelangen)
- **Nutzer** (`admin/users.php` + `admin/api/users.php`): Liste (gejoint mit `profiles` + Highscore-
  Anzahl), Anlegen, E-Mail/Passwort ändern, Aktivieren/Deaktivieren (GoTrue `ban_duration`), Löschen
  (kaskadiert zu `profiles`/`highscores`)
- **Spiele** (`admin/games.php`): pro Spiel `enabled_guest`/`enabled_registered` togglen — wirkt
  sofort auf der Live-Seite (siehe "Spiele-Sichtbarkeit" oben)
- **Highscores** (`admin/scores.php`): einzelnen Score zurücksetzen oder ganze Bestenliste eines
  Spiels löschen
- **Besucher** (`admin/visitors.php`): Besuche/Unique-Visitors (heute/7d/30d/gesamt), Top-Länder,
  Top-Seiten, Karte (Leaflet + CartoDB Dark-Tiles) — Datenquelle ist `page_visits`

### Besucher-Tracking (`track.php`)
Öffentlicher, unauthentifizierter Endpunkt, per fire-and-forget `fetch()` aus `js/core.js` bei jedem
Seitenaufruf angesprochen. Ermittelt die echte Besucher-IP über den `CF-Connecting-IP`-Header —
**aber nur, wenn die Anfrage tatsächlich von einer Cloudflare-Edge-IP kommt** (geprüft gegen
Cloudflares veröffentlichte IP-Bereiche in `admin/includes/trusted_proxy.php`), sonst wird der
Header ignoriert und `REMOTE_ADDR` verwendet (sonst könnte jeder im selben Netz die Adresse fälschen,
die direkt an Port 8090 vorbeigeht). GeoIP-Auflösung für öffentliche IPs über die kostenlose
`ip-api.com`-API (kein Account nötig, kein Key), private/LAN-IPs werden nicht aufgelöst.

### Sicherheitshinweis (aus einem Code-Review behoben, Stand dieser Session)
Ein früherer Entwurf von `admin/users.php` baute Zeilen per String-Template mit
`onclick="deleteUser('${id}', '${escapeHtml(email)}')"` — `escapeHtml()` escaped HTML-Sonderzeichen,
aber **kein Apostroph**, wodurch eine E-Mail-Adresse mit `'` (z. B. `o'brien@example.com`, ein ganz
normaler, gültiger Wert) aus dem einfach gequoteten JS-String ausbrechen und beliebigen Code in der
eingeloggten Admin-Session ausführen konnte (Stored XSS → voller Admin-Panel-Übernahme, auslösbar
durch jede unauthentifizierte Selbstregistrierung). **Fix:** Zeilen werden jetzt per
`createElement`/`textContent`/`addEventListener` gebaut, nie mehr durch String-Interpolation in
JS-Kontext. Beim Ändern von `admin/*.php`-Dateien: **niemals** Nutzerdaten in einen
`onclick="..."`-String einbauen, egal wie escaped — Event-Listener stattdessen per JS anhängen.

## Bekannte Einschränkungen / technische Schulden
- **Dame (Checkers):** nur Einzelsprung-Zwangsschlag, keine Mehrfachsprung-Ketten
- **Mini-Sudoku:** Rätsel-Generierung garantiert keine eindeutige Lösung, aber immer lösbar
- **Tetris Mini:** kein Wall-Kick-System
- **Klicker-Fabrik & Einarmiger Bandit:** reiner Filler ohne echten Skill-Anteil (bewusst so)
- 10 Spiellogik-Bugs wurden im Zuge der Modularisierung gefunden und gefixt (Blackjack
  Dealer-Blackjack-Push, 15-Puzzle-Lösbarkeit, Maze/Timingbar Timer-Leaks, Wordle
  Doppelbuchstaben-Zählung, Minesweeper-Flaggenzähler, Flappy Doppel-`die()`, RPS Match-Ende,
  Asteroids Doppel-Lebensabzug) — Details siehe Commit-Historie

## Vorschläge für sinnvolle nächste Schritte
- Highscore-System auf weitere Spiele ausweiten (siehe Muster oben)
- HTTPS/Reverse-Proxy vor Apache (aktuell reines HTTP auf Port 8090, der Cloudflare-Tunnel liefert
  aber bereits HTTPS nach außen)
- Regelmäßige Bereinigung alter `page_visits`-Zeilen einplanen, falls die Tabelle groß wird
