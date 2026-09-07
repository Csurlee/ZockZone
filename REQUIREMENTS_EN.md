# ZockZone — System Requirements & Packages

Overview of all packages, services, and accounts required to run ZockZone.

---

## Operating System

| Requirement | Recommendation |
|---|---|
| OS | Ubuntu 22.04 LTS or Debian 12 |
| Architecture | x86_64 (amd64) |
| RAM | at least 4 GB (Supabase + Bot + Apache) |
| Disk | at least 20 GB |
| CPU | at least 2 vCores |

---

## System Packages (via apt)

```bash
sudo apt update && sudo apt install -y \
  apache2 \
  php8.2 \
  php8.2-curl \
  php8.2-mbstring \
  php8.2-json \
  php8.2-xml \
  libapache2-mod-php8.2 \
  nodejs \
  npm \
  docker.io \
  docker-compose-plugin \
  git \
  certbot \
  python3-certbot-apache \
  curl \
  wget \
  rsync
```

### Apache Modules (enable)
```bash
sudo a2enmod rewrite ssl headers
```

---

## Node.js

| Package | Version |
|---|---|
| Node.js | **20.x** or newer (LTS) |
| npm | included with Node.js |

Install Node.js 20 (if the apt version is too old):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs
```

### npm Packages (Bot — installed automatically via `npm install`)

File: `bot/package.json`

| Package | Version | Purpose |
|---|---|---|
| `@supabase/supabase-js` | ^2.45.0 | Supabase client (Realtime, DB, Auth) |

```bash
cd bot && npm install
```

---

## PHP

| Requirement | Version |
|---|---|
| PHP | **8.1** or newer |
| Extensions | `curl`, `json`, `mbstring`, `xml` |

Check PHP version:
```bash
php --version
```

---

## Docker (for Supabase)

| Package | Note |
|---|---|
| `docker.io` | or `docker-ce` from the official Docker repo |
| `docker-compose-plugin` | `docker compose` (V2) — not the old `docker-compose` |

Run Docker without sudo:
```bash
sudo usermod -aG docker $USER
newgrp docker
```

Check Docker version:
```bash
docker --version
docker compose version
```

---

## Supabase (self-hosted via Docker)

Supabase runs as a Docker Compose stack and includes the following services:

| Service | Description |
|---|---|
| `supabase-db` | PostgreSQL 15 — main database |
| `supabase-auth` | GoTrue — authentication (JWT, email confirmation) |
| `supabase-rest` | PostgREST — REST API on top of the database |
| `supabase-realtime` | Elixir — WebSocket realtime (for chat) |
| `supabase-storage` | File storage (optionally used) |
| `supabase-studio` | Admin UI for the database |
| `supabase-kong` | API gateway — central entry point |

Supabase repo:
```bash
git clone --depth 1 https://github.com/supabase/supabase /opt/supabase
cd /opt/supabase/docker
cp .env.example .env
# Fill in .env, then:
docker compose up -d
```

---

## External Services (Accounts Required)

| Service | Purpose | Cost | URL |
|---|---|---|---|
| **OpenAI** | AI moderation of chat (`omni-moderation-latest`) | Paid (very cheap) | [platform.openai.com](https://platform.openai.com) |
| **Resend** | Transactional emails (registration, password reset) | Free up to 3,000 emails/month | [resend.com](https://resend.com) |
| **Cloudflare Turnstile** | CAPTCHA on registration | Free | [dash.cloudflare.com](https://dash.cloudflare.com) |
| **Let's Encrypt / Certbot** | HTTPS certificate | Free | automatic via `certbot` |

---

## Ports & Firewall

The following ports must be accessible through the firewall:

| Port | Protocol | Service |
|---|---|---|
| 80 | TCP | HTTP (Apache) — redirected to 443 |
| 443 | TCP | HTTPS (Apache + Let's Encrypt) |
| 8000 | TCP | Supabase Studio (internal only — do NOT expose!) |

Do **not** make Supabase Studio publicly accessible — restrict it to localhost or VPN via firewall.

UFW example:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 8000/tcp   # Supabase Studio: localhost only
sudo ufw enable
```

---

## Directories & Permissions

| Path | Owner | Permissions | Purpose |
|---|---|---|---|
| `/var/www/zockzone/` | `csurlee:www-data` | `755` | Webroot (Apache) |
| `/var/log/zockzone-chat/` | `csurlee:www-data` | `775` | Chat log files |
| `/home/csurlee/zockzone/bot/.env` | `csurlee` | `600` | Bot credentials |
| `/var/www/zockzone/admin/includes/config.php` | `csurlee:www-data` | `640` | Admin credentials |

```bash
sudo mkdir -p /var/www/zockzone /var/log/zockzone-chat
sudo chown csurlee:www-data /var/www/zockzone /var/log/zockzone-chat
sudo chmod 755 /var/www/zockzone
sudo chmod 775 /var/log/zockzone-chat
chmod 600 /home/csurlee/zockzone/bot/.env
```

---

## Summary — Quick Checklist

```
[ ] Ubuntu 22.04 / Debian 12
[ ] apache2 + libapache2-mod-php8.2
[ ] php8.2 + php8.2-curl + php8.2-mbstring + php8.2-json
[ ] node.js 20.x + npm
[ ] docker.io + docker-compose-plugin
[ ] git + rsync + certbot
[ ] Supabase Docker stack running
[ ] OpenAI API key available
[ ] Resend account + domain verified
[ ] Cloudflare Turnstile site and secret key available
[ ] Let's Encrypt certificate active
[ ] Directories created with correct permissions
[ ] bot/package.json → npm install executed
```
