# ZockZone — Chat-Moderationsbot & Server-Setup

Dieser Guide beschreibt den Chat-Moderationsbot und erklärt, wie die gesamte Plattform auf einem neuen Server aufgesetzt wird.

---

## Was der Bot macht

Der Bot (`bot/chat-moderator.js`) ist ein Node.js-Prozess, der dauerhaft im Hintergrund läuft und den öffentlichen Chat sowie private Räume in Echtzeit überwacht.

### KI-Moderation (OpenAI)
- Jede neue Nachricht wird an die OpenAI Moderation API (`omni-moderation-latest`) gesendet
- Erkennt: Hate Speech, Belästigung, Gewalt, sexuelle Inhalte, Selbstgefährdung u.a.
- Bei einem Treffer: Nachricht wird sofort aus der Datenbank gelöscht
- Bei schweren Kategorien (Drohungen, sexueller Kindesmissbrauch, grafische Gewalt): User wird zusätzlich temporär gemutet

### Lokaler Wort-Filter (Fallback)
- Läuft immer, unabhängig von OpenAI
- Zwei Listen:
  - **Basis-Liste** (hardcodiert im Bot): häufige Schimpfwörter EN+DE
  - **DB-Liste** (Tabelle `chat_banned_words`): erweiterbar über Admin-Panel
- Greift auch wenn OpenAI nicht erreichbar oder rate-limitet ist

### Verstoß-Tracking & Auto-Ban
- Jeder Löschvorgang schreibt einen Eintrag in `chat_violations`
- Bei **10 Verstößen innerhalb von 24 Stunden**: vollständige Konto-Löschung via Supabase Admin API
- Betroffene Nutzer sehen im Chat eine orangefarbene Hinweismeldung (in ihrer Sprache DE/EN)

### Chat-Logs
- Alle öffentlichen Nachrichten werden in Tages-Dateien protokolliert:  
  `/var/log/zockzone-chat/YYYY-MM-DD.log`
- Format: `[HH:MM:SS] [LOBBY/RAUM ] username (uuid8): "Nachricht"`
- Moderierte Nachrichten erhalten eine zusätzliche Zeile: `[🚨 MODERIERT: Grund]`
- Logs werden nach **365 Tagen** automatisch rotiert (beim Start + täglich)

### Nutzer-Bereinigung
- Beim Start und täglich um Mitternacht:
  - Konten die **nie eingeloggt** waren und **älter als 90 Tage** sind → gelöscht
  - Konten die **permanent gesperrt** (Deaktiviert) und **älter als 90 Tage** sind → gelöscht

### Muting
- Gemutete User können für einen definierten Zeitraum keine Nachrichten schreiben
- Gespeichert in Tabelle `chat_muted_users` mit Ablaufzeit
- Standard: 60 Minuten (konfigurierbar per `.env`)

---

## Konfiguration (`.env`)

Kopiere `.env.example` → `.env` und fülle die Werte aus:

```env
SUPABASE_URL=https://deine-supabase-url.example.com
SUPABASE_SERVICE_KEY=dein-service-role-key

OPENAI_API_KEY=sk-proj-...

# Mute-Dauer in Minuten beim ersten Verstoß
MUTE_MINUTES=60

# Auto-Ban: Anzahl Verstöße innerhalb des Zeitfensters
VIOLATION_LIMIT=10
VIOLATION_WINDOW_HOURS=24

# Pfad zu den täglichen Log-Dateien
LOG_DIR=/var/log/zockzone-chat
```

---

## Vollständiges Server-Setup (neuer Server)

### Voraussetzungen

| Komponente | Version |
|---|---|
| Ubuntu/Debian | 22.04+ empfohlen |
| Apache2 | 2.4+ |
| PHP | 8.1+ mit `curl`, `json`, `mbstring` |
| Node.js | 20+ |
| Docker & Docker Compose | aktuell |
| Supabase (self-hosted) | läuft in Docker |

---

### 1. Supabase (self-hosted) einrichten

```bash
# Supabase-Repo klonen
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker

# Konfiguration kopieren und anpassen
cp .env.example .env
nano .env
# Wichtig: SITE_URL, API_EXTERNAL_URL, JWT-Secret, SMTP-Daten setzen

# Supabase starten
docker compose up -d

# Warten bis alle Container healthy sind
docker compose ps
```

Supabase ist danach erreichbar unter `http://localhost:8000` (Studio) und `http://localhost:8000/rest/v1/` (API).

---

### 2. Datenbank-Schema anlegen

Im Supabase Studio (SQL Editor) oder per `psql` folgende Tabellen anlegen:

```sql
-- Nutzer-Profile (wird automatisch von Supabase Auth befüllt)
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

-- Chat-Nachrichten (Lobby)
CREATE TABLE IF NOT EXISTS chat_messages (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  username   TEXT NOT NULL,
  avatar     TEXT,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Raum-Chat
CREATE TABLE IF NOT EXISTS room_messages (
  id         BIGSERIAL PRIMARY KEY,
  room_id    TEXT NOT NULL,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  username   TEXT NOT NULL,
  avatar     TEXT,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Gemutete Nutzer
CREATE TABLE IF NOT EXISTS chat_muted_users (
  user_id    UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  muted_until TIMESTAMPTZ NOT NULL,
  reason     TEXT
);

-- Verstöße (für Auto-Ban-Zählung)
CREATE TABLE IF NOT EXISTS chat_violations (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reason     TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Verbotene Wörter (erweiterbar über Admin)
CREATE TABLE IF NOT EXISTS chat_banned_words (
  id   BIGSERIAL PRIMARY KEY,
  word TEXT UNIQUE NOT NULL
);

-- Besucher-Tracking (anonym, tagesbasiert)
CREATE TABLE IF NOT EXISTS visitor_counts (
  day   DATE PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);

-- Freundesliste
CREATE TABLE IF NOT EXISTS friendships (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Trigger: Profil automatisch anlegen bei Registrierung
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

**Realtime aktivieren** (für Chat):
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
```

**Row Level Security** — Beispiel für `chat_messages`:
```sql
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Alle können lesen" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Eingeloggte können schreiben" ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```
Ähnliche Policies für alle anderen Tabellen setzen.

---

### 3. Webseite deployen

```bash
# Repository klonen
git clone https://github.com/dein-username/zockzone.git /home/[LINUX_USER]/zockzone
cd /home/[LINUX_USER]/zockzone

# Admin-Konfiguration anlegen
cp admin/includes/config.php.example admin/includes/config.php
nano admin/includes/config.php
# Werte eintragen: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD_HASH, VISITOR_HASH_SALT

# Admin-Passwort-Hash generieren
php -r "echo password_hash('DEIN_PASSWORT', PASSWORD_DEFAULT);"

# Webroot anlegen und Rechte setzen
sudo mkdir -p /var/www/zockzone
sudo chown -R [LINUX_USER]:www-data /var/www/zockzone
sudo chmod 755 /var/www/zockzone

# Deployen
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

    # Admin-Panel: PHP aktivieren
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

Für HTTPS: Let's Encrypt via `certbot --apache`.

---

### 4. Log-Verzeichnis anlegen

```bash
sudo mkdir -p /var/log/zockzone-chat
sudo chown [LINUX_USER]:www-data /var/log/zockzone-chat
sudo chmod 775 /var/log/zockzone-chat
```

Sowohl der Bot (läuft als `[LINUX_USER]`) als auch PHP/Apache (läuft als `www-data`) brauchen Lese- und Schreibzugriff.

---

### 5. Bot einrichten und starten

```bash
cd /home/[LINUX_USER]/zockzone/bot

# Abhängigkeiten installieren
npm install

# Konfiguration anlegen
cp .env.example .env
nano .env
# SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY eintragen

# systemd-Dienst installieren
sudo cp zockzone-chatbot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable zockzone-chatbot
sudo systemctl start zockzone-chatbot

# Status prüfen
sudo systemctl status zockzone-chatbot
journalctl -u zockzone-chatbot -f
```

---

### 6. Cron-Jobs einrichten

```bash
crontab -e
```

Folgende Zeilen hinzufügen:

```cron
# Inaktive/gesperrte Konten bereinigen (täglich 03:00 Uhr)
0 3 * * * php /var/www/zockzone/admin/cron/delete_accounts.php >> /var/log/zockzone-cron.log 2>&1
```

Der Bot erledigt Log-Rotation und Nutzerbereinigung intern beim Start und täglich — kein separater Cron nötig.

---

### 7. Cloudflare Turnstile (CAPTCHA)

1. Turnstile-Site unter [dash.cloudflare.com](https://dash.cloudflare.com) anlegen
2. **Site Key** (öffentlich) in `js/auth.js` eintragen (Zeile mit `data-sitekey`)
3. **Secret Key** (privat) in `captcha-verify.php` eintragen

---

### 8. E-Mail (Resend)

1. Account bei [resend.com](https://resend.com) erstellen, Domain verifizieren
2. In Supabase Studio → Settings → Auth → SMTP:
   - Host: `smtp.resend.com`
   - Port: `465`
   - User: `resend`
   - Password: Resend API Key
   - Sender: `noreply@deine-domain.com`
3. E-Mail-Templates anpassen unter `mail/templates/`

---

## Bot-Wartung

| Aufgabe | Befehl |
|---|---|
| Bot neu starten | `sudo systemctl restart zockzone-chatbot` |
| Bot-Logs live | `journalctl -u zockzone-chatbot -f` |
| Bot stoppen | `sudo systemctl stop zockzone-chatbot` |
| Bot-Status | `sudo systemctl status zockzone-chatbot` |
| Chat-Logs ansehen | `ls /var/log/zockzone-chat/` |
| Log eines Tages | `cat /var/log/zockzone-chat/2026-09-07.log` |
| Verbotenes Wort hinzufügen | Admin-Panel → Moderation → Wörter |

---

## Dateien die NICHT committet werden dürfen

| Datei | Grund |
|---|---|
| `admin/includes/config.php` | Supabase-Service-Key + Admin-Passwort-Hash |
| `bot/.env` | Supabase-Service-Key + OpenAI API Key |

Beide Dateien sind in `.gitignore` eingetragen. Nur die `.example`-Versionen gehören ins Repository.
