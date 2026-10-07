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

# Верный ответ не должен угадываться по длине: он не длиннее самого длинного
# дистрактора более чем на 15 %, а по всему курсу оказывается самым длинным
# не чаще, чем в 40 % вопросов (случайный уровень при четырёх вариантах — 25 %).
LEN_RATIO = 1.15
LONGEST_SHARE = 0.40
length_stats = {"total": 0, "longest": 0}

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
                lens = [len(o) for o in q["options"]]
                right = lens[q["answer"]]
                wrong = max(l for j, l in enumerate(lens) if j != q["answer"])
                assert right <= LEN_RATIO * wrong, \
                    f"вопрос {i}: верный ответ ({right} зн.) заметно длиннее дистракторов (макс. {wrong} зн.)"
                length_stats["total"] += 1
                length_stats["longest"] += right == max(lens)
        except (json.JSONDecodeError, AssertionError) as e:
            errors.append(f"{rel}: quiz-блок #{n}: {e}")
    return n

LECTURE_REQUIRED = [
    (r"⏱", "метка трудозатрат ⏱"),
    (r'```mermaid|<figure\b[^>]*class="upgraded-figure"', "диаграмма Mermaid или иллюстрация"),
    (r"##[^\n]*[Рр]егиональный кейс", "секция «Региональный кейс»"),
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
    # обрывок таблицы: одиночная строка «| … |» без соседних строк таблицы
    # выводится на страницу сырым текстом с вертикальными чертами
    lines, fenced = text.splitlines(), False
    for i, line in enumerate(lines):
        if line.startswith("```"):
            fenced = not fenced
        if fenced or not re.match(r"^\|.*\|\s*$", line):
            continue
        before = lines[i - 1] if i else ""
        after = lines[i + 1] if i + 1 < len(lines) else ""
        if not before.startswith("|") and not after.startswith("|"):
            errors.append(f"{rel}:{i + 1}: одиночная строка таблицы (обрывок) — удалить или восстановить таблицу")
    # реальные координаты водоёма не должны попасть в контент (правовой режим);
    # строки, явно помеченные как условный пример, пропускаем
    for line in text.splitlines():
        if re.search(r"\b5[23]\.\d{3,}\s*[,;]\s*6[23]\.\d{3,}", line) and \
                not re.search(r"пример|например", line, re.I):
            errors.append(f"{rel}: похоже на реальные координаты (lat, lon) — проверить правовой режим")

if length_stats["total"] and length_stats["longest"] > LONGEST_SHARE * length_stats["total"]:
    errors.append("quiz: верный ответ — самый длинный в %d из %d вопросов (допустимо не более %d %%)" % (
        length_stats["longest"], length_stats["total"], round(100 * LONGEST_SHARE)))

if errors:
    print(f"ОШИБКИ ({len(errors)}):")
    print("\n".join(errors))
    sys.exit(1)
print(f"OK: {sum(1 for _ in ROOT.rglob('*.md'))} md-файлов, ошибок нет")
