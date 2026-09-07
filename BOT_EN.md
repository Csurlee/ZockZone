# ZockZone — Chat Moderation Bot & Server Setup

This guide describes the chat moderation bot and explains how to set up the entire platform on a new server.

---

## What the Bot Does

The bot (`bot/chat-moderator.js`) is a Node.js process that runs permanently in the background, monitoring the public chat and private rooms in real time.

### AI Moderation (OpenAI)
- Every new message is sent to the OpenAI Moderation API (`omni-moderation-latest`)
- Detects: hate speech, harassment, violence, sexual content, self-harm, and more
- On a hit: the message is immediately deleted from the database
- For severe categories (threats, child sexual abuse material, graphic violence): the user is additionally muted temporarily

### Local Word Filter (Fallback)
- Always active, independent of OpenAI
- Two lists:
  - **Base list** (hardcoded in the bot): common profanity in EN+DE
  - **DB list** (table `chat_banned_words`): extendable via the admin panel
- Kicks in even when OpenAI is unavailable or rate-limited

### Violation Tracking & Auto-Ban
- Every deletion writes an entry to `chat_violations`
- At **10 violations within 24 hours**: full account deletion via Supabase Admin API
- Affected users see an orange notice in the chat (in their language DE/EN)

### Chat Logs
- All public messages are logged to daily files:  
  `/var/log/zockzone-chat/YYYY-MM-DD.log`
- Format: `[HH:MM:SS] [LOBBY/ROOM ] username (uuid8): "message"`
- Moderated messages get an additional line: `[🚨 MODERATED: reason]`
- Logs are automatically rotated after **365 days** (on startup + daily)

### User Cleanup
- On startup and daily at midnight:
  - Accounts that **never logged in** and are **older than 90 days** → deleted
  - Accounts that are **permanently banned** (deactivated) and **older than 90 days** → deleted

### Muting
- Muted users cannot send messages for a defined period
- Stored in the `chat_muted_users` table with an expiry timestamp
- Default: 60 minutes (configurable via `.env`)

---

## Configuration (`.env`)

Copy `.env.example` → `.env` and fill in the values:

```env
SUPABASE_URL=https://your-supabase-url.example.com
SUPABASE_SERVICE_KEY=your-service-role-key

OPENAI_API_KEY=sk-proj-...

# Mute duration in minutes on first violation
MUTE_MINUTES=60

# Auto-ban: number of violations within the time window
VIOLATION_LIMIT=10
VIOLATION_WINDOW_HOURS=24

# Path for daily log files
LOG_DIR=/var/log/zockzone-chat
```

---

## Full Server Setup (New Server)

### Prerequisites

| Component | Version |
|---|---|
| Ubuntu/Debian | 22.04+ recommended |
| Apache2 | 2.4+ |
| PHP | 8.1+ with `curl`, `json`, `mbstring` |
| Node.js | 20+ |
| Docker & Docker Compose | current |
| Supabase (self-hosted) | running in Docker |

---

### 1. Set Up Supabase (self-hosted)

```bash
# Clone the Supabase repo
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker

# Copy and edit configuration
cp .env.example .env
nano .env
# Important: set SITE_URL, API_EXTERNAL_URL, JWT secret, SMTP settings

# Start Supabase
docker compose up -d

# Wait until all containers are healthy
docker compose ps
```

Supabase will then be available at `http://localhost:8000` (Studio) and `http://localhost:8000/rest/v1/` (API).

---

### 2. Create Database Schema

In Supabase Studio (SQL Editor) or via `psql`, create the following tables:

```sql
-- User profiles (auto-populated by Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  avatar       TEXT,
  role         TEXT NOT NULL DEFAULT 'user',
  active       BOOLEAN NOT NULL DEFAULT true,
  hide_from_ranking BOOLEAN NOT NULL DEFAULT false,
  lang         VARCHAR(5) NOT NULL DEFAULT 'de' CHECK (lang IN ('de','en')),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Highscores
CREATE TABLE IF NOT EXISTS highscores (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  game_id    TEXT NOT NULL,
  score      INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chat messages (lobby)
CREATE TABLE IF NOT EXISTS chat_messages (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  username   TEXT NOT NULL,
  avatar     TEXT,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Room chat
CREATE TABLE IF NOT EXISTS room_messages (
  id         BIGSERIAL PRIMARY KEY,
  room_id    TEXT NOT NULL,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  username   TEXT NOT NULL,
  avatar     TEXT,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Muted users
CREATE TABLE IF NOT EXISTS chat_muted_users (
  user_id    UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  muted_until TIMESTAMPTZ NOT NULL,
  reason     TEXT
);

-- Violations (for auto-ban counting)
CREATE TABLE IF NOT EXISTS chat_violations (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reason     TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Banned words (extendable via admin)
CREATE TABLE IF NOT EXISTS chat_banned_words (
  id   BIGSERIAL PRIMARY KEY,
  word TEXT UNIQUE NOT NULL
);

-- Visitor tracking (anonymous, day-based)
CREATE TABLE IF NOT EXISTS visitor_counts (
  day   DATE PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);

-- Friends list
CREATE TABLE IF NOT EXISTS friendships (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Trigger: automatically create profile on registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar, role)
  VALUES (new.id, new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'avatar', 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

**Enable Realtime** (for chat):
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
```

**Row Level Security** — example for `chat_messages`:
```sql
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Logged-in users can write" ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```
Set similar policies for all other tables.

---

### 3. Deploy the Website

```bash
# Clone the repository
git clone https://github.com/your-username/zockzone.git /home/csurlee/zockzone
cd /home/csurlee/zockzone

# Create admin configuration
cp admin/includes/config.php.example admin/includes/config.php
nano admin/includes/config.php
# Enter: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD_HASH, VISITOR_HASH_SALT

# Generate admin password hash
php -r "echo password_hash('YOUR_PASSWORD', PASSWORD_DEFAULT);"

# Create webroot and set permissions
sudo mkdir -p /var/www/zockzone
sudo chown -R csurlee:www-data /var/www/zockzone
sudo chmod 755 /var/www/zockzone

# Deploy
bash deploy.sh
```

**Apache Virtual Host** (`/etc/apache2/sites-available/zockzone.conf`):
```apache
<VirtualHost *:80>
    ServerName zockzone.example.com
    DocumentRoot /var/www/zockzone
    DirectoryIndex index.html

    <Directory /var/www/zockzone>
        AllowOverride All
        Require all granted
    </Directory>

    <Directory /var/www/zockzone/admin>
        Options -Indexes
    </Directory>
</VirtualHost>
```

```bash
sudo a2ensite zockzone
sudo a2enmod rewrite
sudo systemctl reload apache2
```

For HTTPS: Let's Encrypt via `certbot --apache`.

---

### 4. Create Log Directory

```bash
sudo mkdir -p /var/log/zockzone-chat
sudo chown csurlee:www-data /var/log/zockzone-chat
sudo chmod 775 /var/log/zockzone-chat
```

Both the bot (runs as `csurlee`) and PHP/Apache (runs as `www-data`) need read and write access.

---

### 5. Set Up and Start the Bot

```bash
cd /home/csurlee/zockzone/bot

# Install dependencies
npm install

# Create configuration
cp .env.example .env
nano .env
# Enter: SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY

# Install systemd service
sudo cp zockzone-chatbot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable zockzone-chatbot
sudo systemctl start zockzone-chatbot

# Check status
sudo systemctl status zockzone-chatbot
journalctl -u zockzone-chatbot -f
```

---

### 6. Set Up Cron Jobs

```bash
crontab -e
```

Add the following line:

```cron
# Clean up inactive / permanently banned accounts (daily at 3:00 AM)
0 3 * * * php /var/www/zockzone/admin/cron/delete_accounts.php >> /var/log/zockzone-cron.log 2>&1
```

The bot handles log rotation and user cleanup internally on startup and daily — no separate cron job needed for those.

---

### 7. Cloudflare Turnstile (CAPTCHA)

1. Create a Turnstile site at [dash.cloudflare.com](https://dash.cloudflare.com)
2. Enter your domain, choose widget type "Managed"
3. Copy the **Site Key** (public) → paste it into `js/auth.js` (look for `data-sitekey`)
4. Copy the **Secret Key** (private) → paste it into `captcha-verify.php`

---

### 8. Email (Resend)

1. Create an account at [resend.com](https://resend.com) and verify your domain
2. In Supabase Studio → Settings → Auth → SMTP:
   - Host: `smtp.resend.com`
   - Port: `465`
   - User: `resend`
   - Password: your Resend API key
   - Sender: `noreply@your-domain.com`
3. Customize email templates under `mail/templates/`

---

## Bot Maintenance

| Task | Command |
|---|---|
| Restart bot | `sudo systemctl restart zockzone-chatbot` |
| Live bot logs | `journalctl -u zockzone-chatbot -f` |
| Stop bot | `sudo systemctl stop zockzone-chatbot` |
| Bot status | `sudo systemctl status zockzone-chatbot` |
| View chat logs | `ls /var/log/zockzone-chat/` |
| View a day's log | `cat /var/log/zockzone-chat/2026-09-07.log` |
| Add banned word | Admin Panel → Moderation → Words |

---

## Files That Must NEVER Be Committed

| File | Reason |
|---|---|
| `admin/includes/config.php` | Supabase service key + admin password hash |
| `bot/.env` | Supabase service key + OpenAI API key |

Both files are listed in `.gitignore`. Only the `.example` versions belong in the repository.
