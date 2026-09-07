# ZockZone — Setup Guide

This guide explains step by step how to get ZockZone running on a new server after cloning.

---

## Prerequisites

The following software must be installed on the server:

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y \
  apache2 \
  php8.2 php8.2-curl php8.2-mbstring php8.2-json \
  nodejs npm \
  docker.io docker-compose-plugin \
  git certbot python3-certbot-apache
```

Node.js 20+ recommended:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs
```

---

## Step 1 — Clone the Repository

```bash
git clone https://github.com/your-username/zockzone.git /home/csurlee/zockzone
cd /home/csurlee/zockzone
```

---

## Step 2 — Start Supabase (Database)

ZockZone requires Supabase as its backend (database, auth, realtime).

```bash
# Download the Supabase repo
git clone --depth 1 https://github.com/supabase/supabase /opt/supabase
cd /opt/supabase/docker

# Create configuration
cp .env.example .env
nano .env
```

At minimum, update:
- `POSTGRES_PASSWORD` — secure database password
- `JWT_SECRET` — long random string (at least 32 characters)
- `ANON_KEY` and `SERVICE_ROLE_KEY` — generated from the JWT secret  
  → Tool: https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys
- `SITE_URL` — public URL of the website, e.g. `https://zockzone.example.com`
- `API_EXTERNAL_URL` — public URL of Supabase, e.g. `https://supabase.example.com`
- SMTP settings for email confirmation (Resend recommended, see Step 6)

```bash
# Start Supabase
docker compose up -d

# Check status (all containers should be "healthy")
docker compose ps
```

Supabase Studio is now available at `http://SERVER-IP:8000`.

---

## Step 3 — Create Database Schema

In Supabase Studio → SQL Editor, run the full schema from [BOT_EN.md](BOT_EN.md) (section "Create Database Schema"). This creates all required tables and triggers.

Also run `bot/migration-add-lang.sql` if the `lang` column doesn't exist yet.

**Enable Realtime for chat:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
```

---

## Step 4 — Configure the Admin Panel

```bash
cd /home/csurlee/zockzone/admin/includes

# Create the configuration file (never committed)
cp config.php.example config.php
nano config.php
```

Fill in the following values:

| Field | Where to find it |
|---|---|
| `SUPABASE_URL` | Public URL of your Supabase instance |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Studio → Settings → API → service_role |
| `ADMIN_PASSWORD_HASH` | Generate yourself (see below) |
| `VISITOR_HASH_SALT` | Any random string |

Generate the admin password hash:
```bash
php -r "echo password_hash('YOUR_DESIRED_PASSWORD', PASSWORD_DEFAULT) . PHP_EOL;"
```
Copy the output hash into `config.php` under `ADMIN_PASSWORD_HASH`.

---

## Step 5 — Deploy the Website

```bash
# Create webroot
sudo mkdir -p /var/www/zockzone
sudo chown csurlee:www-data /var/www/zockzone
sudo chmod 755 /var/www/zockzone

# Create Apache virtual host
sudo nano /etc/apache2/sites-available/zockzone.conf
```

Content:
```apache
<VirtualHost *:80>
    ServerName zockzone.example.com
    DocumentRoot /var/www/zockzone
    DirectoryIndex index.html

    <Directory /var/www/zockzone>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

```bash
sudo a2ensite zockzone
sudo a2enmod rewrite
sudo systemctl reload apache2

# Copy files to webroot
cd /home/csurlee/zockzone
bash deploy.sh
```

**Set up HTTPS** (recommended):
```bash
sudo certbot --apache -d zockzone.example.com
```

---

## Step 6 — Set Up Email (Resend)

1. Create a free account at [resend.com](https://resend.com)
2. Verify your domain (add DNS records)
3. Create an API key
4. In Supabase Studio → Authentication → Settings → SMTP:
   - **Host:** `smtp.resend.com`
   - **Port:** `465`
   - **User:** `resend`
   - **Password:** your Resend API key
   - **Sender Name:** ZockZone
   - **Sender Email:** `noreply@zockzone.example.com`

---

## Step 7 — Cloudflare Turnstile (CAPTCHA)

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → Turnstile → Add Site
2. Enter your domain, choose widget type "Managed"
3. Copy **Site Key** → paste into `js/auth.js` (search for `data-sitekey`)
4. Copy **Secret Key** → paste into `captcha-verify.php` at `$secret`
5. After changes: run `bash deploy.sh`

---

## Step 8 — Enter Supabase URL in the Frontend

In `js/auth.js` and `js/chat.js`, update the Supabase URL and anon key to match your instance:

```js
const SUPABASE_URL = 'https://supabase.example.com';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

The anon key is found at: Supabase Studio → Settings → API → `anon` (public).

After changes, deploy:
```bash
bash deploy.sh
```

---

## Step 9 — Create Log Directory

```bash
sudo mkdir -p /var/log/zockzone-chat
sudo chown csurlee:www-data /var/log/zockzone-chat
sudo chmod 775 /var/log/zockzone-chat
```

---

## Step 10 — Set Up and Start the Bot

```bash
cd /home/csurlee/zockzone/bot

# Install dependencies
npm install

# Create configuration
cp .env.example .env
nano .env
```

Fill in the following values:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Public URL of your Supabase instance |
| `SUPABASE_SERVICE_KEY` | service_role key from Supabase Studio |
| `OPENAI_API_KEY` | API key from platform.openai.com |
| `MUTE_MINUTES` | Mute duration in minutes (default: 60) |
| `VIOLATION_LIMIT` | Violations until auto-ban (default: 10) |
| `VIOLATION_WINDOW_HOURS` | Time window for violations (default: 24) |
| `LOG_DIR` | `/var/log/zockzone-chat` |

Install the bot as a systemd service:
```bash
sudo cp zockzone-chatbot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable zockzone-chatbot
sudo systemctl start zockzone-chatbot

# Check if the bot is running
sudo systemctl status zockzone-chatbot
journalctl -u zockzone-chatbot -n 50
```

---

## Step 11 — Set Up Cron Job for Account Cleanup

```bash
crontab -e
```

Add the following line:
```cron
# Delete inactive and permanently banned accounts (daily at 3:00 AM)
0 3 * * * php /var/www/zockzone/admin/cron/delete_accounts.php >> /var/log/zockzone-cron.log 2>&1
```

---

## Step 12 — Test First Login

1. Open the website: `https://zockzone.example.com`
2. Register with a real email address
3. Confirmation email arrives → click the link
4. Log in, play a game, set a highscore
5. Admin panel: `https://zockzone.example.com/admin` → log in with the configured password

---

## Checklist

- [ ] Supabase is running and accessible
- [ ] Database schema created, Realtime enabled
- [ ] `admin/includes/config.php` filled in
- [ ] Apache virtual host active, HTTPS configured
- [ ] `deploy.sh` executed, website loads
- [ ] SUPABASE_URL and ANON_KEY in the frontend are correct
- [ ] Email sending works (test registration)
- [ ] Cloudflare Turnstile keys entered
- [ ] Log directory created (`/var/log/zockzone-chat`)
- [ ] Bot is running (`systemctl status zockzone-chatbot`)
- [ ] Cron job added
- [ ] Chat moderation tested (test message with a banned word)
- [ ] Admin panel accessible and working

---

## Troubleshooting

**Bot doesn't start:**
```bash
journalctl -u zockzone-chatbot -n 100
# Common causes: .env missing, Node.js too old, Supabase unreachable
```

**Chat doesn't load / no real-time updates:**
- Is Supabase Realtime running? `docker compose ps` in `/opt/supabase/docker`
- Is the anon key in the frontend correct?
- Did you run `ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;`?

**Admin panel shows "403 Forbidden":**
- Does `config.php` exist? (not copied by `deploy.sh`)
- Is the Apache `rewrite` module active? (`sudo a2enmod rewrite && sudo systemctl reload apache2`)

**Emails are not arriving:**
- Check SMTP settings in Supabase Studio
- Check Resend Dashboard → Logs
- Is domain verification complete?

**Logs don't appear in the admin panel:**
- Check directory permissions: `ls -la /var/log/zockzone-chat`
- Is the bot running and writing logs? `journalctl -u zockzone-chatbot -f`
