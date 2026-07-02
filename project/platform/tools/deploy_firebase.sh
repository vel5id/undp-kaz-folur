#!/usr/bin/env bash
# Деплой платформы на Firebase Hosting (https://folur-kaz-platform.web.app/).
# Требует firebase login (или FIREBASE_TOKEN в окружении для CI).
set -euo pipefail

PLATFORM="/home/h621l/undp-fable-5/project/platform"
cd "$PLATFORM"

.venv/bin/python tools/validate_content.py
.venv/bin/mkdocs build --strict
npx -y firebase-tools deploy --only hosting --project folur-kaz-platform --non-interactive
echo "OK: https://folur-kaz-platform.web.app/"
