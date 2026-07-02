#!/usr/bin/env bash
# Публикация платформы в публичный репозиторий vel5id/folur-platform.
# В публичный репо уходит ТОЛЬКО project/platform (+ сгенерированные PDF);
# тендерные документы, внутренние планы и сырые данные монорепо не публикуются.
set -euo pipefail

PLATFORM="/home/h621l/undp-fable-5/project/platform"
STAGE="$(mktemp -d)"
REPO="vel5id/folur-platform"

rsync -a --delete \
  --exclude ".venv" --exclude "site" --exclude "offline" \
  --exclude "node_modules" --exclude ".git" --exclude "__pycache__" \
  "$PLATFORM/" "$STAGE/"

cd "$STAGE"
git init -q -b main
git add -A
git -c user.name="KRU FOLUR" -c user.email="vel5id@users.noreply.github.com" \
  commit -q -m "Platform snapshot $(date -u +%Y-%m-%dT%H:%MZ)"
git remote add origin "https://github.com/$REPO.git"
git push -q --force origin main
echo "OK: pushed to https://github.com/$REPO"
rm -rf "$STAGE"
