#!/bin/bash
# Deploy: synct /home/luki/zockzone → /var/www/zockzone (Webserver-Root)
set -e

SRC="/home/luki/zockzone/"
DST="/var/www/zockzone/"

rsync -av --checksum --no-group --no-owner --no-perms --omit-dir-times --no-times \
  --exclude='.git' \
  --exclude='bot/' \
  --exclude='.gitignore' \
  --exclude='*.md' \
  --exclude='deploy.sh' \
  --exclude='admin/includes/config.php' \
  --exclude='admin/includes/mail_settings.secret.php' \
  --exclude='admin/includes/mail_settings.json' \
  --exclude='.claude/' \
  "$SRC" "$DST"

# Webroot muss für Apache lesbar bleiben
chmod 755 "$DST"

echo ""
echo "✅ Deploy abgeschlossen → $DST"
