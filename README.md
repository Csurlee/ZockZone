# ZockZone

Eine browserbasierte Multiplayer-Gaming-Plattform mit über 50 Spielen, Live-Chat, Freundesliste, Rangliste und KI-gestützter Chat-Moderation.

---

## Überblick

ZockZone ist eine vollständige Web-Anwendung auf dem eigenen Server. Nutzer können sich registrieren, Spiele spielen, Highscores erzielen, im Chat miteinander schreiben und Freunde hinzufügen. Ein automatischer Moderationsbot überwacht den öffentlichen Chat und entfernt regelwidrige Nachrichten.

---

## Features

### Spieler-Frontend
- **50+ Browser-Spiele** — alle in Vanilla JavaScript, kein Plugin nötig
- **Highscores & Rangliste** — globale Bestenliste pro Spiel, persönliche Spielhistorie
- **Live-Chat** (Lobby & private Räume) — Echtzeit via Supabase Realtime
- **Freundesliste** — Freunde hinzufügen, Online-Status sehen, private Räume erstellen
- **Spieler-Profile** — Avatar, Anzeigename, Sprache (DE/EN), Sichtbarkeit in Rangliste
- **Zweisprachig** — Deutsch / Englisch, Umschaltung per Klick
- **Mobile-optimiert** — responsive Layout, Touch-Steuerung in Spielen
- **Dark-Mode-Design** — durchgängiges dunkles UI

### Sicherheit & Recht
- **Cloudflare Turnstile** — CAPTCHA-Schutz beim Registrieren
- **E-Mail-Bestätigung** — Konto erst nach Link-Klick aktiv (Resend SMTP)
- **DSGVO-Banner** — Cookie-Consent mit Tracking-Opt-in
- **Chat-Moderation** — KI-gestützter Bot löscht regelwidrige Nachrichten automatisch

### Admin-Panel (`/admin`)
- **Nutzer-Verwaltung** — anlegen, Rolle ändern, Passwort setzen, deaktivieren, löschen; Suche nach Name/E-Mail/UUID
- **Spiele-Verwaltung** — Spiele aktivieren/deaktivieren, Reihenfolge anpassen
- **Highscores** — alle Einträge einsehen und löschen
- **Besucher-Tracking** — tägliche anonyme Besucherzahlen (kein Cookie nötig)
- **E-Mail-Versand** — manuell E-Mails an einzelne Nutzer senden
- **Broadcast** — Systemmeldung an alle eingeloggten Nutzer
- **Moderation** — Verbotene-Wörter-Liste verwalten, aktive Sperren einsehen
- **Chat-Logs** — tägliche Log-Dateien mit Kalender-Navigation, Volltextsuche, Nutzer-Suche über alle Logs

---

## Tech-Stack

| Schicht | Technologie |
|---|---|
| Frontend | Vanilla JS (ES Modules), HTML5, CSS3 |
| Backend/DB | Supabase (self-hosted) — PostgreSQL + Auth + Realtime + Storage |
| Admin-Panel | PHP 8 + Apache |
| Chat-Bot | Node.js 20 (ESM) |
| KI-Moderation | OpenAI `omni-moderation-latest` API |
| E-Mail | Resend (SMTP) |
| CAPTCHA | Cloudflare Turnstile |
| Deploy | rsync via `deploy.sh` |
| Prozessmanager | systemd (Bot-Dienst) |

---

## Verzeichnisstruktur

```
zockzone/
├── index.html              # Haupt-App (SPA)
├── css/style.css           # Globales Stylesheet
├── js/
│   ├── auth.js             # Login, Registrierung, Profil, Rangliste
│   ├── chat.js             # Lobby-Chat + Raum-Chat
│   ├── core.js             # Spiel-Engine, HUD, Overlay
│   ├── games-list.js       # Spieleliste + Registry
│   ├── i18n.js             # Übersetzungen DE/EN
│   ├── online.js           # Online-Status, Freundesliste
│   ├── sfx.js              # Sound-Effekte
│   ├── consent.js          # DSGVO-Consent-Banner
│   └── games/              # ~50 Spiele als ES-Module
├── admin/                  # Admin-Panel (PHP)
│   ├── includes/
│   │   ├── config.php      # Zugangsdaten (NICHT committen!)
│   │   └── config.php.example
│   ├── api/                # REST-Endpunkte (PHP)
│   └── cron/               # Cron-Jobs (Konten-Bereinigung)
├── bot/                    # Chat-Moderationsbot
│   ├── chat-moderator.js
│   ├── .env                # Bot-Zugangsdaten (NICHT committen!)
│   ├── .env.example
│   └── zockzone-chatbot.service  # systemd-Unit
├── mail/templates/         # HTML-E-Mail-Vorlagen
├── captcha-verify.php      # Turnstile-Verifikation (serverseitig)
├── track.php               # Anonymes Besucher-Tracking
└── deploy.sh               # Deployment-Skript
```

---

## Spiele (Auswahl)

Snake, Tetris, Pong, Breakout, Space Invaders, Flappy Bird, Minesweeper, Sudoku, Wordle, Anagram, Simon Says, Memory, Blackjack, Schach-Dame, Reversi, Connect 4, Battleship, Türme von Hanoi, 2048, Sliding Puzzle, Lights Out, Nim, Hangman, Quiz, Reaction Time, Stroop Test, Math Blitz, Typing Test, Rhythm Game, Fruit Slice, Bubble Pop, Match-3, Slots, Dice, Darts, Billiard, Air Hockey, Kart Clash (3D), Turbo Racer, Traffic Rush, Whack-a-Mole, Clicker, Maze, Runner und mehr.

---

## Setup (neuer Server)

Siehe [BOT.md](BOT.md) für den vollständigen Setup-Guide inkl. Supabase, Apache, Bot und Cron-Jobs.

---

## Lizenz

Siehe [LICENSE](LICENSE).
