# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import json
if os.path.exists('scenes.json'):
    features = json.load(open('scenes.json'))['features']
    scenes = pd.DataFrame([{'id': f['id'], 'date': f['properties']['datetime'], 'cloud': f['properties']['eo:cloud_cover']} for f in features])
else:
    scenes = pd.DataFrame({'id': [f'demo-{i:02}' for i in range(18)], 'date': pd.date_range('2025-05-01', periods=18, freq='7D'), 'cloud': [5, 60, 12, 8, 40, 70, 10, 18, 2, 90, 35, 15, 5, 45, 12, 11, 20, 80]})
    print('Синтетический каталог: запрос к спутниковому архиву не выполняется.')
scenes['date'] = pd.to_datetime(scenes.date, utc=True)
max_cloud = 20
useful = scenes[scenes.cloud <= max_cloud].copy()
monthly = useful.groupby(useful.date.dt.strftime('%Y-%m')).size().rename('полезных сцен')
display(useful)
display(monthly)
fig, ax = plt.subplots(figsize=(7, 3.5))
monthly.plot.bar(ax=ax)
ax.set(xlabel='Месяц', ylabel='Число сцен', title='Отбор сцен')
fig.tight_layout()
useful.to_csv('selected-scenes.csv', index=False)
