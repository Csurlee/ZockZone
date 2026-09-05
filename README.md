# ZockZone

Ein deutschsprachiges Browserspiele-Portal im Stil von Poki/CrazyGames — **47 spielbare Mini-Games**,
eine einzige `index.html`-Datei, kein Build-Step, kein npm.

## Features

- **47 Mini-Games** in vier Kategorien: Arcade (14), Puzzle (18), Reflex (9), 2-Spieler (6)
- Dark-Arcade-Design (Violett + Lime Green), responsive, Suchleiste, Kategorie-Filter
- Nutzerkonten (E-Mail + Passwort) über [Supabase](https://supabase.com) Auth
- Persistente Highscores + Bestenlisten (Top 10) für 5 der 47 Spiele: Snake, 2048, Flappy Block,
  Runner Jump, Space Invaders

## Tech-Stack

- Reines HTML/CSS/JavaScript, keine Frameworks, keine Abhängigkeiten zum Bauen
- Backend: Supabase (Postgres + Auth), per ESM-Import direkt im Browser eingebunden
- Kann selbstgehostet (Docker) oder mit einem Supabase-Cloud-Projekt betrieben werden

## Lokal starten

Die Datei braucht keinen Build-Schritt — ein beliebiger statischer Webserver reicht:

```bash
python3 -m http.server 8080
# oder
npx serve
```

Danach im Browser `http://localhost:8080` öffnen.

## Backend einrichten

`index.html` erwartet eine laufende Supabase-Instanz (Cloud oder selbstgehostet). Die Zugangsdaten
werden im `<script type="module">`-Block direkt vor `</body>` eingetragen (`SUPABASE_URL`,
`SUPABASE_ANON_KEY`). Das benötigte Datenbankschema (Tabellen `profiles` und `highscores` inkl. Row
Level Security Policies) sowie Details zur Architektur, den Spiel-Mustern und weiteren
Einrichtungsschritten stehen in [`ZOCKZONE_HANDOFF.md`](./ZOCKZONE_HANDOFF.md).

## Lizenz

[MIT](./LICENSE)
