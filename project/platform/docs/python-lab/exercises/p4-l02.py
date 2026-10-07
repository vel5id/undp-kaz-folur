# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import hashlib, json
if os.path.exists('points.csv'):
    raw = pd.read_csv('points.csv')
    print('Загружено', len(raw), 'строк')
else:
    rng = np.random.default_rng(42)
    x = rng.uniform(0, 1000, 250)
    y = rng.uniform(0, 800, 250)
    raw = pd.DataFrame({'x_m': x, 'y_m': y, 'depth_m': 2 + 5 * np.exp(-((x - 500) ** 2 + (y - 400) ** 2) / 150000)})
    raw.loc[0, 'depth_m'] = np.nan
    raw.loc[1, 'depth_m'] = -2
    raw.loc[2, 'depth_m'] = 30
    raw = pd.concat([raw, raw.iloc[[10]]], ignore_index=True)
    print('251 синтетическая запись: пропуск, выбросы, дубликат.')
required = ['x_m', 'y_m', 'depth_m']
assert set(required) <= set(raw.columns), 'Нужны x_m, y_m, depth_m'
dedup = raw.drop_duplicates()
clean = dedup.dropna(subset=required)
clean = clean[clean.depth_m.between(0, 20)].copy()
assert len(clean) > 0
report = pd.DataFrame({'этап': ['исходные', 'без дубликатов', 'после контроля'], 'строк': [len(raw), len(dedup), len(clean)]})
display(report)
display(clean.head(12))
display(clean[required].describe())
fig, axs = plt.subplots(1, 2, figsize=(9, 4))
axs[0].hist(clean.depth_m, bins=20)
axs[0].set(xlabel='Глубина, м', ylabel='Промеры')
sc = axs[1].scatter(clean.x_m, clean.y_m, c=clean.depth_m, s=10)
axs[1].set_aspect('equal')
axs[1].set(xlabel='x, м', ylabel='y, м', title='Локальные координаты')
fig.colorbar(sc, ax=axs[1], label='Глубина, м')
fig.tight_layout()
clean.to_csv('clean.csv', index=False)
meta = {'rows': len(clean), 'sha256': hashlib.sha256(open('clean.csv', 'rb').read()).hexdigest(), 'coordinates': 'локальные, не накладывать на реальную карту'}
json.dump(meta, open('metadata.json', 'w'), ensure_ascii=False, indent=2)
