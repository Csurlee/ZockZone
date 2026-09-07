# ZockZone — Setup-Anleitung

Diese Anleitung erklärt Schritt für Schritt, wie ZockZone nach dem Klonen auf einem neuen Server zum Laufen gebracht wird.

---

## Voraussetzungen

Folgende Software muss auf dem Server installiert sein:

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y \
  apache2 \
  php8.2 php8.2-curl php8.2-mbstring php8.2-json \
  nodejs npm \
  docker.io docker-compose-plugin \
  git certbot python3-certbot-apache
```

Node.js 20+ empfohlen:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs
```

---

## Schritt 1 — Repository klonen

```bash
git clone https://github.com/dein-username/zockzone.git /home/[LINUX_USER]/zockzone
cd /home/[LINUX_USER]/zockzone
```

---

## Schritt 2 — Supabase (Datenbank) starten

ZockZone benötigt Supabase als Backend (Datenbank, Auth, Realtime).

```bash
# Supabase-Repo herunterladen
git clone --depth 1 https://github.com/supabase/supabase /opt/supabase
cd /opt/supabase/docker

# Konfiguration anlegen
cp .env.example .env
nano .env
```

In der `.env` mindestens anpassen:
- `POSTGRES_PASSWORD` — sicheres Datenbankpasswort
- `JWT_SECRET` — langer zufälliger String (mind. 32 Zeichen)
- `ANON_KEY` und `SERVICE_ROLE_KEY` — werden aus dem JWT Secret generiert  
  → Tool: https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys
- `SITE_URL` — öffentliche URL der Webseite, z.B. `https://zockzone.example.com`
- `API_EXTERNAL_URL` — öffentliche URL von Supabase, z.B. `https://supabase.example.com`
- SMTP-Daten für E-Mail-Bestätigung (Resend empfohlen, siehe Schritt 6)

```bash
# Supabase starten
docker compose up -d

# Status prüfen (alle Container sollten "healthy" sein)
docker compose ps
```

Supabase Studio ist jetzt unter `http://SERVER-IP:8000` erreichbar.

---

## Schritt 3 — Datenbank-Schema anlegen

Im Supabase Studio → SQL Editor den Inhalt aus `bot/migration-add-lang.sql` ausführen.

Dann das vollständige Schema aus [BOT.md](BOT.md) (Abschnitt „Datenbank-Schema anlegen") einfügen und ausführen. Das legt alle benötigten Tabellen und Trigger an.

**Realtime für Chat aktivieren:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
```

---

## Schritt 4 — Admin-Panel konfigurieren

```bash
cd /home/[LINUX_USER]/zockzone/admin/includes

# Konfigurationsdatei anlegen (wird nie committet)
cp config.php.example config.php
nano config.php
```

Folgende Werte eintragen:

| Feld | Wo zu finden |
|---|---|
| `SUPABASE_URL` | Öffentliche URL deiner Supabase-Instanz |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Studio → Settings → API → service_role |
| `ADMIN_PASSWORD_HASH` | Selbst generieren (siehe unten) |
| `VISITOR_HASH_SALT` | Beliebiger zufälliger String |

Admin-Passwort-Hash generieren:
```bash
php -r "echo password_hash('DEIN_WUNSCHPASSWORT', PASSWORD_DEFAULT) . PHP_EOL;"
```
Den ausgegebenen Hash in `config.php` bei `ADMIN_PASSWORD_HASH` eintragen.

---

## Schritt 5 — Webseite deployen

```bash
# Webroot anlegen
sudo mkdir -p /var/www/zockzone
sudo chown [LINUX_USER]:www-data /var/www/zockzone
sudo chmod 755 /var/www/zockzone

# Apache Virtual Host anlegen
sudo nano /etc/apache2/sites-available/zockzone.conf
```

Inhalt:
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

# Dateien in den Webroot kopieren
cd /home/[LINUX_USER]/zockzone
bash deploy.sh
```

**HTTPS einrichten** (empfohlen):
```bash
sudo certbot --apache -d zockzone.example.com
```

---

## Schritt 6 — E-Mail (Resend) einrichten

1. Kostenlosen Account auf [resend.com](https://resend.com) erstellen
2. Domain verifizieren (DNS-Einträge setzen)
3. API-Key erstellen
4. In Supabase Studio → Authentication → Settings → SMTP eintragen:
   - **Host:** `smtp.resend.com`
   - **Port:** `465`
   - **User:** `resend`
   - **Password:** dein Resend-API-Key
   - **Sender Name:** ZockZone
   - **Sender Email:** `noreply@zockzone.example.com`

---

## Schritt 7 — Cloudflare Turnstile (CAPTCHA)

1. Auf [dash.cloudflare.com](https://dash.cloudflare.com) → Turnstile → Site hinzufügen
2. Domain eintragen, Widget-Typ „Managed" wählen
3. **Site Key** kopieren → in `js/auth.js` beim Turnstile-Widget eintragen  
   (Suche nach `data-sitekey`)
4. **Secret Key** kopieren → in `captcha-verify.php` bei `$secret` eintragen
5. Nach Änderungen: `bash deploy.sh` ausführen

---

## Schritt 8 — Supabase-URL im Frontend eintragen

In `js/auth.js` und `js/chat.js` die Supabase-URL und den Anon-Key auf deine Instanz anpassen:

```js
const SUPABASE_URL = 'https://supabase.example.com';
const SUPABASE_ANON_KEY = 'dein-anon-key';
```

Den Anon-Key findest du in: Supabase Studio → Settings → API → `anon` (public).

Nach der Änderung deployen:
```bash
bash deploy.sh
```

---

## Schritt 9 — Chat-Log-Verzeichnis anlegen

```bash
sudo mkdir -p /var/log/zockzone-chat
sudo chown [LINUX_USER]:www-data /var/log/zockzone-chat
sudo chmod 775 /var/log/zockzone-chat
```

---

## Schritt 10 — Bot einrichten und starten

```bash
cd /home/[LINUX_USER]/zockzone/bot

# Abhängigkeiten installieren
npm install

# Konfiguration anlegen
cp .env.example .env
nano .env
```

Folgende Werte eintragen:

| Variable | Wert |
|---|---|
| `SUPABASE_URL` | Öffentliche URL deiner Supabase-Instanz |
| `SUPABASE_SERVICE_KEY` | service_role Key aus Supabase Studio |
| `OPENAI_API_KEY` | API-Key von platform.openai.com |
| `MUTE_MINUTES` | Mute-Dauer in Minuten (Standard: 60) |
| `VIOLATION_LIMIT` | Verstöße bis Auto-Ban (Standard: 10) |
| `VIOLATION_WINDOW_HOURS` | Zeitfenster für Verstöße (Standard: 24) |
| `LOG_DIR` | `/var/log/zockzone-chat` |

Bot als systemd-Dienst einrichten:
```bash
sudo cp zockzone-chatbot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable zockzone-chatbot
sudo systemctl start zockzone-chatbot

# Prüfen ob der Bot läuft
sudo systemctl status zockzone-chatbot
journalctl -u zockzone-chatbot -n 50
```

---

## Schritt 11 — Cron-Job für Konten-Bereinigung

```bash
crontab -e
```

Zeile hinzufügen:
```cron
# Inaktive und dauerhaft gesperrte Konten löschen (täglich 03:00 Uhr)
0 3 * * * php /var/www/zockzone/admin/cron/delete_accounts.php >> /var/log/zockzone-cron.log 2>&1
```

---

## Schritt 12 — Erster Login testen

1. Webseite aufrufen: `https://zockzone.example.com`
2. Registrieren mit einer echten E-Mail-Adresse
3. Bestätigungs-E-Mail kommt → Link klicken
4. Einloggen, Spiel spielen, Highscore setzen
5. Admin-Panel: `https://zockzone.example.com/admin` → Login mit dem konfigurierten Passwort

---

## Checkliste

- [ ] Supabase läuft und ist erreichbar
- [ ] Datenbank-Schema angelegt, Realtime aktiviert
- [ ] `admin/includes/config.php` ausgefüllt
- [ ] Apache Virtual Host aktiv, HTTPS eingerichtet
- [ ] `deploy.sh` ausgeführt, Webseite lädt
- [ ] SUPABASE_URL und ANON_KEY im Frontend stimmen
- [ ] E-Mail-Versand funktioniert (Test-Registrierung)
- [ ] Cloudflare Turnstile eingetragen
- [ ] Log-Verzeichnis angelegt (`/var/log/zockzone-chat`)
- [ ] Bot läuft (`systemctl status zockzone-chatbot`)
- [ ] Cron-Job eingetragen
- [ ] Chat-Moderation getestet (Test-Nachricht mit Schimpfwort)
- [ ] Admin-Panel zugänglich und funktionierend

---

## Troubleshooting

**Bot startet nicht:**
```bash
journalctl -u zockzone-chatbot -n 100
# Häufige Ursachen: .env fehlt, Node.js zu alt, Supabase nicht erreichbar
```

**Chat lädt nicht / keine Realtime-Updates:**
- Supabase Realtime läuft? `docker compose ps` in `/opt/supabase/docker`
- Anon-Key im Frontend korrekt?
- `ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;` ausgeführt?

**Admin-Panel zeigt "403 Forbidden":**
- `config.php` vorhanden? (wird nicht durch `deploy.sh` kopiert)
- Apache-Modul `rewrite` aktiv? (`sudo a2enmod rewrite && sudo systemctl reload apache2`)

**E-Mails kommen nicht an:**
- SMTP-Einstellungen in Supabase Studio prüfen
- Resend Dashboard → Logs checken
- Domain-Verifizierung abgeschlossen?

**Logs erscheinen nicht im Admin-Panel:**
- Verzeichnis-Rechte prüfen: `ls -la /var/log/zockzone-chat`
- Bot läuft und schreibt Logs? `journalctl -u zockzone-chatbot -f`
