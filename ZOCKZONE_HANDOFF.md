# ZockZone — Projekt-Handoff für Claude Code   -= claude --resume a72a729a-c6e3-4796-b50c-131e978c0df8 =-

## Was das ist
Single-File HTML/CSS/JS Browsergame-Portal, deutschsprachig, im Stil von Poki/CrazyGames.
Dark-Arcade-Ästhetik: Violett (`--violet: #7C3AED`) + Lime Green (`--lime: #C6FF3D`) Akzente,
Font "Fredoka" für Headlines, "Inter" für Body, "JetBrains Mono" für Zahlen/Code-artige Anzeigen.

- **Datei:** `index.html` (~3700 Zeilen, eine einzige Datei, kein Build-Step, kein npm)
- **Aktueller Stand:** 47 spielbare Mini-Games, Supabase Auth (nur E-Mail+Passwort) + Postgres für
  Highscores (5 von 47 Spielen angebunden)
- **Live und deployed:** `http://10.0.10.10:8090` (Apache-vHost auf dem Heimserver von csurlee, Port 8090,
  getrennt vom bestehenden Grav-Blog auf Port 80). Backend läuft als selbstgehosteter Supabase-Docker-Stack
  auf demselben Server (siehe unten) — keine Cloud-Abhängigkeit mehr.

## Architektur (wichtig für Weiterarbeit)

### Spiele-Katalog
```js
const GAMES = [ {id, title, icon, cat, tag, rating, plays}, ... ]  // 47 Einträge
```
- `cat` ist eine von: `arcade`, `puzzle`, `reflex`, `2player`
- `tag` ist `''`, `'new'` oder `'hot'` (zeigt Badge auf der Karte)
- Kartenfarbe kommt aus `thumbBg(id)` — Funktion mit `map` Objekt, ein Eintrag pro Spiel-ID

### Spiel-Loader
```js
const builders = { snake: buildSnake, twenty48: build2048, ... }  // 47 Einträge, 1:1 zu GAMES ids
```
`openGame(id)` → `loadGame(id)` → ruft `builders[id]()` auf, die Funktion baut das Spiel-UI in `#playerBody`
und gibt eine Cleanup-Funktion zurück (Event-Listener entfernen, `clearInterval`/`cancelAnimationFrame`).

### Jedes Spiel folgt demselben Muster
```js
function buildXYZ(){
  const scoreEl = hud(['Label','elementId'], ...);          // HUD-Zeile oben
  const wrap = document.createElement('div'); wrap.className='canvas-wrap';
  // ... Canvas oder Grid-Div aufbauen ...
  playerBody.append(scoreEl, wrap, mkHint('Anleitungstext'));
  const over = overMsg(wrap, 'Game Over Text', start);       // Overlay bei Spielende, Restart-Button
  // ... Spiellogik: start(), Event-Handler, draw()/render() ...
  window.__restartCurrent = start;                            // für den Restart-Button oben rechts
  start();
  return () => { /* cleanup: clearInterval, removeEventListener etc. */ };
}
```

### Wichtige Helper-Funktionen (global, im `<script>`-Block ohne `type="module"`)
- `hud(...)` — baut die Stats-Zeile oben im Spiel
- `overMsg(wrap, text, onRestart)` — Overlay bei Sieg/Niederlage
- `mkHint(text)` — grauer Hinweistext unter dem Spiel
- `mkButton(label, bg, color)` — einheitlich gestylter Button
- `addLeaderboardUI(gameId, gameTitle)` — fügt "🏆 Bestenliste"-Button + Panel hinzu (ruft `window.zzShowLeaderboard`)

## Supabase-Integration (Stand: live, selbstgehostet)

Bewusst **kein Firebase** (Nutzerentscheidung) — stattdessen Supabase (Postgres + Auth), da SQL-basiert
und einfacher selbst zu hosten/exportieren. Ursprünglich mit einem Supabase-Cloud-Projekt begonnen,
dann aber komplett auf **selbstgehostet** umgestellt (Nutzer hat einen eigenen Server) und das
Cloud-Projekt gelöscht.

**Wo im Code:** `<script type="module">`-Block direkt vor `</body>`, komplett getrennt vom
Haupt-Script (Modul-Scope, deshalb werden alle Funktionen die von außen (onclick-Handlern) aufgerufen
werden müssen explizit auf `window` gehängt: `window.zzOpenAuth`, `window.zzSubmitAuth`,
`window.zzLogOut`, `window.zzSaveHighScore`, `window.zzShowLeaderboard`).

**SDK:** `@supabase/supabase-js@2`, per ESM-Import von `esm.sh` — kein npm, kein Bundler nötig
(passt zum Single-File-Ansatz).

**Config im Code** (`SUPABASE_URL`, `SUPABASE_ANON_KEY` im `<script type="module">`-Block):
- `SUPABASE_URL = 'http://10.0.10.10:8000'`
- `SUPABASE_ANON_KEY` = der `SUPABASE_PUBLISHABLE_KEY` (Format `sb_publishable_...`) aus dem
  selbstgehosteten Stack — sicher fürs Frontend, siehe unten.

### Selbstgehosteter Supabase-Stack (auf csurlees Server, 10.0.10.10)
- **Projektverzeichnis:** `~/zockzone-supabase/supabase-project` (User `csurlee`), Docker-Compose-Stack
  aus dem offiziellen `supabase/supabase` Repo (`docker/`-Verzeichnis, sparse-cloned, Tag `self-hosted/v0.8.0`)
- **Bootstrap:** via `setup.sh` aus dem Supabase-Repo — generiert alle Secrets automatisch
  (`.env` im Projektverzeichnis, dort liegen `POSTGRES_PASSWORD`, `DASHBOARD_PASSWORD`,
  `SUPABASE_SECRET_KEY`, `SERVICE_ROLE_KEY` etc. — **niemals** in `index.html` oder sonstwo committen)
- **API-Gateway:** Envoy-basiert (Container `supabase-envoy`, Service-Name `api-gw`), Port **8000**
  (erreichbar unter `http://10.0.10.10:8000`), Port 8443 für HTTPS (ungenutzt)
- **Studio (Admin-UI):** ebenfalls über Port 8000 erreichbar, Login-User `supabase`,
  Passwort = `DASHBOARD_PASSWORD` aus der `.env` auf dem Server
- **Postgres:** Container `supabase-db`, intern Port 5432, nicht nach außen exponiert
- **Ports auf dem Server, die NICHT belegt werden dürfen** (dort laufen andere Dienste — IRC-Bots,
  Mail, FTP, DNS, Webmin, MySQL, n8n, etc.): 21, 22, 53, 80, 113, 442, 631, 853, 1234, 2112, 2222,
  3306, 8080, 8081, 9090, 10000, 20000, 20241, 33060
- **Stack neu starten:** `cd ~/zockzone-supabase/supabase-project && docker compose up -d`
- **Stack stoppen:** `docker compose down` (Daten bleiben in Docker-Volumes erhalten)

### Was funktioniert
- Login/Registrierung per E-Mail+Passwort (Tabs im Auth-Modal) via `supabase.auth.signUp` / `signInWithPassword`
  (Google Sign-in wurde bewusst entfernt — nur E-Mail+Passwort, kein OAuth)
- Bei Registrierung: Zeile in Tabelle `profiles` wird angelegt
- Highscore speichern + Bestenliste (Top 10) für **5 von 47 Spielen**: `snake`, `twenty48`, `flappy`, `runner`, `invaders`
  - Eine gemeinsame Tabelle `highscores` (statt Firestore-Collections pro Spiel) mit Spalte `game_id` —
    in Postgres kein Composite-Index-Problem wie bei Firestore, ein einfacher Index auf `(game_id, score)` reicht
- Schema (`profiles`, `highscores`, RLS-Policies, Grants für `anon`/`authenticated`) ist bereits live
  auf dem selbstgehosteten Postgres angewendet — siehe SQL unten, falls der Stack mal neu aufgesetzt
  werden muss:
  ```sql
  create table profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text, display_name text, created_at timestamptz default now()
  );
  create table highscores (
    user_id uuid references auth.users(id) on delete cascade,
    game_id text not null, game_title text, display_name text, score integer not null,
    updated_at timestamptz default now(), primary key (user_id, game_id)
  );
  create index highscores_game_score_idx on highscores (game_id, score desc);
  alter table profiles enable row level security;
  alter table highscores enable row level security;
  create policy "Profile: eigenes lesen" on profiles for select using (auth.uid() = id);
  create policy "Profile: eigenes anlegen" on profiles for insert with check (auth.uid() = id);
  create policy "Highscores: alle duerfen lesen" on highscores for select using (true);
  create policy "Highscores: nur eigene schreiben" on highscores for insert with check (auth.uid() = user_id);
  create policy "Highscores: nur eigene updaten" on highscores for update using (auth.uid() = user_id);
  grant usage on schema public to anon, authenticated;
  grant select on public.highscores to anon, authenticated;
  grant insert, update on public.highscores to authenticated;
  grant select, insert on public.profiles to authenticated;
  ```

### Apache-vHost für die Webseite (auf demselben Server)
- Config: `/etc/apache2/sites-available/zockzone.conf`, aktiviert via `a2ensite zockzone.conf`
- `Listen 8090` + `VirtualHost *:8090`, `DocumentRoot /var/www/zockzone`
- Datei aktualisieren: lokale `index.html` per `scp` nach `/var/www/zockzone/index.html` kopieren,
  danach `chmod 644` nicht vergessen (sonst 403 — `scp` übernimmt sonst die lokalen, meist restriktiveren
  Dateirechte 1:1)

### Um Highscores auf weitere Spiele auszuweiten
Pro Spiel zwei Ergänzungen nötig, **keine** Schema-Änderung mehr nötig (eine Tabelle für alle Spiele):
1. `addLeaderboardUI('gameId', 'Anzeigename')` direkt nach dem `playerBody.append(...)`-Aufruf einfügen
2. `if(window.zzSaveHighScore) window.zzSaveHighScore('gameId','Anzeigename',score);` an der Stelle
   einfügen, wo das Spiel endet (meist in einer `die()`/`finish()`-Funktion oder beim Game-Over-Check)

## Bekannte Einschränkungen / technische Schulden
- **Dame (Checkers):** nur Einzelsprung-Zwangsschlag, keine Mehrfachsprung-Ketten
- **Mini-Sudoku:** Rätsel-Generierung garantiert keine eindeutige Lösung (mathematisch aufwendiger),
  aber immer lösbar und spielbar
- **Tetris Mini:** kein Wall-Kick-System, kann in Ecken/an Rändern beim Drehen leicht hakeln
- **Nicht jedes Spiel wurde manuell durchgespielt** — Syntax und Struktur sind vollständig verifiziert
  (Node-Syntax-Check, Cross-Check GAMES-Array ↔ builders-Map ↔ Funktionsdefinitionen ↔ thumbBg-Map,
  alle 47 konsistent, keine Duplikate/Lücken), aber Spiellogik-Bugs in einzelnen der 47 Spiele sind
  bei diesem Umfang nicht auszuschließen
- **Klicker-Fabrik & Einarmiger Bandit:** reiner Filler ohne echten Skill-Anteil (bewusst so, auf
  Wunsch "ist egal, welche Spiele")

## Deployment
**Live** unter `http://10.0.10.10:8090` (nur im lokalen Netz von csurlee erreichbar, keine öffentliche
Domain/Portweiterleitung eingerichtet). Sowohl Frontend (Apache-vHost) als auch Backend
(selbstgehostetes Supabase) laufen auf demselben Server — siehe Abschnitte oben.

Für öffentliche Erreichbarkeit außerhalb des lokalen Netzes wäre zusätzlich nötig:
- Portweiterhabe/Reverse-Proxy für Port 8090 (Website) und 8000 (Supabase-API) am Router/Firewall
- Danach `SITE_URL`, `SUPABASE_PUBLIC_URL`, `API_EXTERNAL_URL` und `ADDITIONAL_REDIRECT_URLS` in der
  Supabase-`.env` auf die echte öffentliche Domain umstellen (aktuell auf `10.0.10.10` gesetzt)
- Empfehlenswert: HTTPS via Caddy oder nginx-Reverse-Proxy davor (das Supabase-Repo bringt dafür
  fertige Overlays mit, `docker-compose.caddy.yml` / `docker-compose.nginx.yml`)

## Vorschläge für sinnvolle nächste Schritte
- Highscore-System auf weitere Spiele ausweiten (siehe Muster oben)
- Falls öffentlicher Zugriff gewünscht ist: Portweiterleitung + HTTPS wie oben beschrieben einrichten
- Ggf. die Datei aufteilen (HTML/CSS/JS in separate Dateien), falls Claude Code das für einfachere
  Weiterentwicklung bevorzugt — aktuell ist alles bewusst in einer Datei für Portabilität
