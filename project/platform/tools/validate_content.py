# -*- coding: utf-8 -*-
"""Валидация контента модулей: quiz-JSON, обязательные секции лекций, плейсхолдеры.

Выход 0 — всё чисто; 1 — есть ошибки (печатаются построчно).
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent / "docs" / "modules"
errors = []

def check_quiz_blocks(text: str, rel: str) -> int:
    n = 0
    for m in re.finditer(r"```quiz\s*\n(.*?)```", text, re.S):
        n += 1
        try:
            data = json.loads(m.group(1))
            assert isinstance(data, list) and data, "пустой массив"
            for i, q in enumerate(data):
                for key in ("q", "options", "answer", "explain"):
                    assert key in q, f"вопрос {i}: нет поля {key}"
                assert isinstance(q["options"], list) and len(q["options"]) >= 2, f"вопрос {i}: <2 опций"
                assert isinstance(q["answer"], int) and 0 <= q["answer"] < len(q["options"]), \
                    f"вопрос {i}: answer вне диапазона"
        except (json.JSONDecodeError, AssertionError) as e:
            errors.append(f"{rel}: quiz-блок #{n}: {e}")
    return n

LECTURE_REQUIRED = [
    (r"⏱", "метка трудозатрат ⏱"),
    (r"```mermaid", "Mermaid-диаграмма"),
    (r"##\s*Региональный кейс", "секция «Региональный кейс»"),
    (r"##\s*Закрепление и применение", "секция «Закрепление и применение»"),
]

for md in sorted(ROOT.rglob("*.md")):
    rel = str(md.relative_to(ROOT.parent.parent))
    text = md.read_text(encoding="utf-8")
    nquiz = check_quiz_blocks(text, rel)
    if md.parent.name == "lectures":
        for pat, name in LECTURE_REQUIRED:
            if not re.search(pat, text):
                errors.append(f"{rel}: нет: {name}")
        if nquiz == 0:
            errors.append(f"{rel}: нет quiz-блока самопроверки")
    # реальные координаты водоёма не должны попасть в контент (правовой режим);
    # строки, явно помеченные как условный пример, пропускаем
    for line in text.splitlines():
        if re.search(r"\b5[23]\.\d{3,}\s*[,;]\s*6[23]\.\d{3,}", line) and \
                not re.search(r"пример|например", line, re.I):
            errors.append(f"{rel}: похоже на реальные координаты (lat, lon) — проверить правовой режим")

if errors:
    print(f"ОШИБКИ ({len(errors)}):")
    print("\n".join(errors))
    sys.exit(1)
print(f"OK: {sum(1 for _ in ROOT.rglob('*.md'))} md-файлов, ошибок нет")
