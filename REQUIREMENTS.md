# ZockZone — Systemanforderungen & Pakete

Übersicht aller Pakete, Dienste und Zugänge die für den Betrieb von ZockZone benötigt werden.

---

## Betriebssystem

| Anforderung | Empfehlung |
|---|---|
| OS | Ubuntu 22.04 LTS oder Debian 12 |
| Architektur | x86_64 (amd64) |
| RAM | mind. 4 GB (Supabase + Bot + Apache) |
| Disk | mind. 20 GB |
| CPU | mind. 2 vCores |

---

## System-Pakete (via apt)

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

### Apache-Module (aktivieren)
```bash
sudo a2enmod rewrite ssl headers
```

---

## Node.js

| Paket | Version |
|---|---|
| Node.js | **20.x** oder neuer (LTS) |
| npm | wird mit Node.js mitgeliefert |

Node.js 20 installieren (falls apt-Version zu alt):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs
```

### npm-Pakete (Bot — automatisch via `npm install`)

Datei: `bot/package.json`

| Paket | Version | Zweck |
|---|---|---|
| `@supabase/supabase-js` | ^2.45.0 | Supabase-Client (Realtime, DB, Auth) |

```bash
cd bot && npm install
```

---

## PHP

| Anforderung | Version |
|---|---|
| PHP | **8.1** oder neuer |
| Erweiterungen | `curl`, `json`, `mbstring`, `xml` |

PHP-Version prüfen:
```bash
php --version
```

---

## Docker (für Supabase)

| Paket | Hinweis |
|---|---|
| `docker.io` | oder `docker-ce` aus dem offiziellen Docker-Repo |
| `docker-compose-plugin` | `docker compose` (V2) — nicht das alte `docker-compose` |

Docker ohne sudo nutzen:
```bash
sudo usermod -aG docker $USER
newgrp docker
```

Docker-Version prüfen:
```bash
docker --version
docker compose version
```

---

## Supabase (self-hosted via Docker)

Supabase wird als Docker-Compose-Stack betrieben und bringt folgende Dienste mit:

| Dienst | Beschreibung |
|---|---|
| `supabase-db` | PostgreSQL 15 — Hauptdatenbank |
| `supabase-auth` | GoTrue — Authentifizierung (JWT, E-Mail-Bestätigung) |
| `supabase-rest` | PostgREST — REST-API über die Datenbank |
| `supabase-realtime` | Elixir — WebSocket-Realtime (für Chat) |
| `supabase-storage` | Dateispeicher (optional genutzt) |
| `supabase-studio` | Admin-UI für die Datenbank |
| `supabase-kong` | API-Gateway — zentraler Einstiegspunkt |

Supabase-Repo:
```bash
git clone --depth 1 https://github.com/supabase/supabase /opt/supabase
cd /opt/supabase/docker
cp .env.example .env
# .env ausfüllen, dann:
docker compose up -d
```

---

## Externe Dienste (Accounts erforderlich)

| Dienst | Zweck | Kosten | URL |
|---|---|---|---|
| **OpenAI** | KI-Moderation des Chats (`omni-moderation-latest`) | Kostenpflichtig (sehr günstig) | [platform.openai.com](https://platform.openai.com) |
| **Resend** | Transaktions-E-Mails (Registrierung, Passwort-Reset) | Kostenlos bis 3.000 E-Mails/Monat | [resend.com](https://resend.com) |
| **Cloudflare Turnstile** | CAPTCHA beim Registrieren | Kostenlos | [dash.cloudflare.com](https://dash.cloudflare.com) |
| **Let's Encrypt / Certbot** | HTTPS-Zertifikat | Kostenlos | automatisch via `certbot` |

---

## Ports & Firewall

Folgende Ports müssen in der Firewall erreichbar sein:

| Port | Protokoll | Dienst |
|---|---|---|
| 80 | TCP | HTTP (Apache) — wird auf 443 weitergeleitet |
| 443 | TCP | HTTPS (Apache + Let's Encrypt) |
| 8000 | TCP | Supabase Studio (nur intern, nicht öffentlich!) |

Supabase Studio **nicht** öffentlich erreichbar machen — per Firewall auf Localhost oder VPN beschränken.

UFW-Beispiel:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 8000/tcp   # Supabase Studio nur lokal
sudo ufw enable
```

---

## Verzeichnisse & Berechtigungen

| Pfad | Eigentümer | Berechtigungen | Zweck |
|---|---|---|---|
| `/var/www/zockzone/` | `csurlee:www-data` | `755` | Webroot (Apache) |
| `/var/log/zockzone-chat/` | `csurlee:www-data` | `775` | Chat-Log-Dateien |
| `/home/csurlee/zockzone/bot/.env` | `csurlee` | `600` | Bot-Zugangsdaten |
| `/var/www/zockzone/admin/includes/config.php` | `csurlee:www-data` | `640` | Admin-Zugangsdaten |

```bash
sudo mkdir -p /var/www/zockzone /var/log/zockzone-chat
sudo chown csurlee:www-data /var/www/zockzone /var/log/zockzone-chat
sudo chmod 755 /var/www/zockzone
sudo chmod 775 /var/log/zockzone-chat
chmod 600 /home/csurlee/zockzone/bot/.env
```

---

## Zusammenfassung — Schnell-Checkliste

```
[ ] Ubuntu 22.04 / Debian 12
[ ] apache2 + libapache2-mod-php8.2
[ ] php8.2 + php8.2-curl + php8.2-mbstring + php8.2-json
[ ] node.js 20.x + npm
[ ] docker.io + docker-compose-plugin
[ ] git + rsync + certbot
[ ] Supabase Docker-Stack läuft
[ ] OpenAI API-Key vorhanden
[ ] Resend Account + Domain verifiziert
[ ] Cloudflare Turnstile Site- und Secret-Key vorhanden
[ ] Let's Encrypt Zertifikat aktiv
[ ] Verzeichnisse angelegt mit richtigen Rechten
[ ] bot/package.json → npm install ausgeführt
```
