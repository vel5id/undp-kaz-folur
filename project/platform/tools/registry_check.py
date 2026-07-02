# -*- coding: utf-8 -*-
"""Батч-проверка кодов результатов/сертификатов для KPI-реестра (KPI 2.12 ПРООН).

Координатор собирает коды слушателей (текстом, по одному в строке) и получает
CSV-строки для вставки в реестр. Контрольная сумма (FNV-1a + соль платформы)
отсекает опечатки и порченые коды; итоговая верификация — сверка с подписанными
листами регистрации.

Использование:
    python3 registry_check.py codes.txt > registry_rows.csv
    echo "<код>" | python3 registry_check.py -
"""
import base64
import json
import sys

CERT_SALT = "folur-kaz-30c9f7cea8ba8869"  # синхронизировано с javascripts/quiz-engine.js


def fnv1a(s: str) -> str:
    h = 0x811C9DC5
    for ch in s:
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return format(h, "x")


def js_stringify(obj: dict) -> str:
    # эквивалент JSON.stringify: без пробелов, порядок ключей — как в объекте
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))


def check(code: str):
    b64 = code.strip().replace("-", "+").replace("_", "/")
    b64 += "=" * (-len(b64) % 4)
    obj = json.loads(base64.b64decode(b64).decode("utf-8"))
    ok = fnv1a(js_stringify(obj["j"]) + CERT_SALT) == obj["k"]
    return ok, obj["j"]


def main() -> None:
    src = sys.stdin if sys.argv[1:] == ["-"] else open(sys.argv[1], encoding="utf-8")
    print("статус;тип;режим;слушатель;аттестация;процент;счёт;дата")
    bad = 0
    for line in src:
        code = line.strip()
        if not code:
            continue
        try:
            ok, d = check(code)
        except Exception:
            ok, d = False, {}
        if not ok:
            bad += 1
            print(f"ИСПОРЧЕН;;;;;;;{code[:24]}…", file=sys.stderr)
            continue
        kind = "результат" if d.get("t") == "result" else "сертификат"
        print(";".join(str(x) for x in (
            "OK", kind, d.get("mode", "final"), d.get("s", ""), d.get("m", ""),
            d.get("p", ""), d.get("r", ""), d.get("d", ""))))
    if bad:
        print(f"# порченых кодов: {bad} (см. stderr)", file=sys.stderr)


if __name__ == "__main__":
    main()
