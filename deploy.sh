#!/bin/bash
# Deploy: synct /home/csurlee/zockzone → /var/www/zockzone (Webserver-Root)
set -e

SRC="/home/csurlee/zockzone/"
DST="/var/www/zockzone/"

rsync -av --checksum --no-group --no-owner --no-perms --omit-dir-times \
  --exclude='.git' \
  --exclude='bot/' \
  --exclude='.gitignore' \
  --exclude='*.md' \
  --exclude='deploy.sh' \
  --exclude='admin/includes/config.php' \
  "$SRC" "$DST"

# Webroot muss für Apache lesbar bleiben
chmod 755 "$DST"

echo ""
echo "✅ Deploy abgeschlossen → $DST"
