# -*- coding: utf-8 -*-
"""Перегенерация секции nav в mkdocs.yml из файловой системы docs/modules/.

Единая платформа: навигация всегда отражает фактический состав модулей.
Заголовки берутся из первого H1 каждого файла.
"""
import pathlib
import re

PLATFORM = pathlib.Path(__file__).resolve().parent.parent
DOCS = PLATFORM / "docs"
MK = PLATFORM / "mkdocs.yml"

def h1(path: pathlib.Path) -> str:
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("# "):
            t = re.sub(r"[*_`]", "", line[2:].strip())
            return t.replace(":", " —")  # двоеточие ломает yaml-ключ
    return path.stem

def module_nav(code: str, indent: str) -> list[str]:
    d = DOCS / "modules" / code
    lines = [f"{indent}- {h1(d / 'index.md')}:",
             f"{indent}    - Программа: modules/{code}/index.md"]
    for sub, label in (("lectures", None), ("practicum", None)):
        for f in sorted((d / sub).glob("*.md")) if (d / sub).is_dir() else []:
            lines.append(f"{indent}    - {h1(f)}: modules/{code}/{sub}/{f.name}")
    if (d / "ai-assistant.md").exists():
        lines.append(f"{indent}    - ИИ-ассистент в работе: modules/{code}/ai-assistant.md")
    for f in sorted((d / "assessment").glob("*.md")) if (d / "assessment").is_dir() else []:
        lines.append(f"{indent}    - Оценивание: modules/{code}/assessment/{f.name}")
    return lines

nav = ["nav:",
       "  - Главная: index.md",
       "  - Моё обучение: my-learning.md",
       "  - О платформе:",
       "      - Архитектура: about/platform.md",
       "      - Шаблон модуля: about/module-template.md",
       "  - ИИ-инструменты: ai-tools.md",
       "  - Датасеты: datasets.md",
       "  - Офлайн-материалы: offline.md",
       "  - Проверка сертификата: verify.md",
       "  - Для тренера: training/index.md",
       "  - Академические модули:",
       "      - Обзор: modules/index.md"]
for code in [f"a{i}" for i in range(1, 7)]:
    nav += module_nav(code, "      ")
nav.append("  - Профессиональные модули:")
nav.append("      - Обзор: modules/professional.md")
for code in [f"p{i}" for i in range(1, 16)]:
    nav += module_nav(code, "      ")
nav.append("  - Практикумы: practicums/index.md")

text = MK.read_text(encoding="utf-8")
text = re.sub(r"\nnav:.*\Z", "\n" + "\n".join(nav) + "\n", text, flags=re.S)
MK.write_text(text, encoding="utf-8")
print(f"nav обновлён: {len(nav)} строк")

# Манифест модулей для клиентского слоя (steppe.js): заголовок + число шагов.
manifest = {}
for code in [f"a{i}" for i in range(1, 7)] + [f"p{i}" for i in range(1, 16)]:
    d = DOCS / "modules" / code
    title = re.sub(r"^[АП]\d+\s*[.·—-]\s*", "", h1(d / "index.md"))
    total = 0
    for sub in ("lectures", "practicum", "assessment"):
        if (d / sub).is_dir():
            total += len(list((d / sub).glob("*.md")))
    if (d / "ai-assistant.md").exists():
        total += 1
    manifest[code] = {"title": title, "total": total}
import json
js = ("/* Автогенерируется tools/gen_nav.py — не править руками. */\n"
      "window.FOLUR_MODULES = " + json.dumps(manifest, ensure_ascii=False) + ";\n")
(PLATFORM / "docs" / "javascripts" / "modules-manifest.js").write_text(js, encoding="utf-8")
print(f"манифест модулей: {len(manifest)} записей")
