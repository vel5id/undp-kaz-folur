# -*- coding: utf-8 -*-
"""Обезличивание батиметрических промеров: уровень A (учебный датасет).

Вход:  сырые промеры (Data_ID, Latitude, Longitude, Depth) с реальной геопривязкой.
Выход: точки в локальной системе координат (x_m, y_m, depth_m) без возможности
восстановления местоположения: начало отсчёта сохраняется отдельным файлом
SECRET-origin.json, который НЕ публикуется и хранится офлайн у исполнителя.

Опционально: --exclude-cx/--exclude-cy/--exclude-r — буферное исключение точек
вокруг ГТС (плотина, водозабор), координаты центра в исходной СК (lat, lon).
"""
import argparse
import json
import pathlib

import numpy as np
import pandas as pd
from pyproj import Transformer

def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("src", help="CSV с колонками Data_ID,Latitude,Longitude,Depth")
    p.add_argument("outdir", help="каталог результата")
    p.add_argument("--utm", default="EPSG:32641", help="метрическая СК (UTM 41N)")
    p.add_argument("--round", type=float, default=0.1, help="шаг округления, м")
    p.add_argument("--seed", type=int, default=20260702, help="зерно перемешивания")
    p.add_argument("--exclude-lat", type=float, help="широта центра буфера ГТС")
    p.add_argument("--exclude-lon", type=float, help="долгота центра буфера ГТС")
    p.add_argument("--exclude-r", type=float, default=500.0, help="радиус буфера, м")
    args = p.parse_args()

    outdir = pathlib.Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(args.src)
    n_src = len(df)
    tr = Transformer.from_crs("EPSG:4326", args.utm, always_xy=True)
    x, y = tr.transform(df.Longitude.values, df.Latitude.values)

    if args.exclude_lat is not None and args.exclude_lon is not None:
        cx, cy = tr.transform(args.exclude_lon, args.exclude_lat)
        keep = np.hypot(x - cx, y - cy) > args.exclude_r
        x, y, df = x[keep], y[keep], df[keep]
        print(f"Буфер ГТС {args.exclude_r} м: исключено {n_src - len(df)} точек")

    # локальное начало: юго-западный угол охвата, округлённый до километра
    ox = float(np.floor(x.min() / 1000) * 1000)
    oy = float(np.floor(y.min() / 1000) * 1000)

    q = args.round
    out = pd.DataFrame({
        "x_m": (np.round((x - ox) / q) * q).round(1),
        "y_m": (np.round((y - oy) / q) * q).round(1),
        "depth_m": df.Depth.values,
    })
    # перемешать порядок (порядок следования = траектория судна) и выдать новые ID
    out = out.sample(frac=1, random_state=args.seed).reset_index(drop=True)
    out.insert(0, "point_id", np.arange(1, len(out) + 1))
    out.to_csv(outdir / "bathymetry-training-set.csv", index=False)

    # секретный файл восстановления — НЕ публиковать, хранить офлайн
    (outdir / "SECRET-origin.json").write_text(json.dumps({
        "crs": args.utm, "origin_x": ox, "origin_y": oy,
        "note": "НЕ ПУБЛИКОВАТЬ. Восстановление геопривязки: X = x_m + origin_x, Y = y_m + origin_y.",
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    (outdir / "README.md").write_text(f"""# Учебный батиметрический датасет (обезличенный)

{len(out)} промеров глубин пресноводного водохранилища степной зоны Казахстана
(эхолотная съёмка; исходный объём {n_src}). Координаты — **локальная система** в метрах
(начало отсчёта удалено), округление {q} м, порядок точек перемешан.
Датасет не содержит геопривязки, названий объектов и персональных данных.

Колонки: `point_id, x_m, y_m, depth_m`.

Назначение: практикумы П11/А4 платформы FOLUR Казахстан — фильтрация выбросов,
интерполяция, карта глубин, расчёт объёма.

Лицензия: CC-BY 4.0. Публикация: Zenodo (DOI назначается на Этапе 2 после
прохождения чек-листа `plans/stage-1/05_data-legal-compliance.md`).
""", encoding="utf-8")
    print(f"OK: {len(out)} точек -> {outdir}/bathymetry-training-set.csv")

if __name__ == "__main__":
    main()
