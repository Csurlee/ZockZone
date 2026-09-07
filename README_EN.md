# ZockZone

A browser-based multiplayer gaming platform with 50+ games, live chat, friends list, leaderboard, and AI-powered chat moderation.

---

## Overview

ZockZone is a complete web application running on a self-hosted server. Users can register, play games, set highscores, chat with each other, and add friends. An automated moderation bot monitors the public chat and removes rule-breaking messages in real time.

---

## Features

### Player Frontend
- **50+ Browser Games** — all in Vanilla JavaScript, no plugin required
- **Highscores & Leaderboard** — global ranking per game, personal game history
- **Live Chat** (Lobby & private rooms) — real-time via Supabase Realtime
- **Friends List** — add friends, see online status, create private rooms
- **Player Profiles** — avatar, display name, language (DE/EN), leaderboard visibility toggle
- **Bilingual** — German / English, switch with one click
- **Mobile-Optimized** — responsive layout, touch controls in games
- **Dark Mode Design** — consistent dark UI throughout

### Security & Privacy
- **Cloudflare Turnstile** — CAPTCHA protection on registration
- **Email Confirmation** — account only active after clicking the confirmation link (Resend SMTP)
- **GDPR Banner** — cookie consent with tracking opt-in
- **Chat Moderation** — AI-powered bot automatically removes rule-breaking messages

### Admin Panel (`/admin`)
- **User Management** — create, change role, reset password, deactivate, delete; search by name/email/UUID
- **Game Management** — enable/disable games, adjust order
- **Highscores** — view and delete all entries
- **Visitor Tracking** — daily anonymous visitor counts (no cookie required)
- **Email Sending** — manually send emails to individual users
- **Broadcast** — system message to all logged-in users
- **Moderation** — manage banned word list, view active mutes
- **Chat Logs** — daily log files with calendar navigation, full-text search, user search across all logs

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS (ES Modules), HTML5, CSS3 |
| Backend / DB | Supabase (self-hosted) — PostgreSQL + Auth + Realtime + Storage |
| Admin Panel | PHP 8 + Apache |
| Chat Bot | Node.js 20 (ESM) |
| AI Moderation | OpenAI `omni-moderation-latest` API |
| Email | Resend (SMTP) |
| CAPTCHA | Cloudflare Turnstile |
| Deploy | rsync via `deploy.sh` |
| Process Manager | systemd (bot service) |

---

## Directory Structure

```
zockzone/
├── index.html              # Main app (SPA)
├── css/style.css           # Global stylesheet
├── js/
│   ├── auth.js             # Login, registration, profile, leaderboard
│   ├── chat.js             # Lobby chat + room chat
│   ├── core.js             # Game engine, HUD, overlay
│   ├── games-list.js       # Game list + registry
│   ├── i18n.js             # Translations DE/EN
│   ├── online.js           # Online status, friends list
│   ├── sfx.js              # Sound effects
│   ├── consent.js          # GDPR consent banner
│   └── games/              # ~50 games as ES modules
├── admin/                  # Admin panel (PHP)
│   ├── includes/
│   │   ├── config.php      # Credentials (NEVER commit!)
│   │   └── config.php.example
│   ├── api/                # REST endpoints (PHP)
│   └── cron/               # Cron jobs (account cleanup)
├── bot/                    # Chat moderation bot
│   ├── chat-moderator.js
│   ├── .env                # Bot credentials (NEVER commit!)
│   ├── .env.example
│   └── zockzone-chatbot.service  # systemd unit file
├── mail/templates/         # HTML email templates
├── captcha-verify.php      # Turnstile verification (server-side)
├── track.php               # Anonymous visitor tracking
└── deploy.sh               # Deployment script
```

---

## Games (Selection)

Snake, Tetris, Pong, Breakout, Space Invaders, Flappy Bird, Minesweeper, Sudoku, Wordle, Anagram, Simon Says, Memory, Blackjack, Checkers, Reversi, Connect 4, Battleship, Tower of Hanoi, 2048, Sliding Puzzle, Lights Out, Nim, Hangman, Quiz, Reaction Time, Stroop Test, Math Blitz, Typing Test, Rhythm Game, Fruit Slice, Bubble Pop, Match-3, Slots, Dice, Darts, Billiard, Air Hockey, Kart Clash (3D), Turbo Racer, Traffic Rush, Whack-a-Mole, Clicker, Maze, Runner and more.

---

## Setup

See [SETUP_EN.md](SETUP_EN.md) for the full step-by-step setup guide, and [BOT_EN.md](BOT_EN.md) for bot details and server setup including the database schema.

---

## License

See [LICENSE](LICENSE).
