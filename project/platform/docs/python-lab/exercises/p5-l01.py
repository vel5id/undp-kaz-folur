# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
yy, xx = np.mgrid[0:60, 0:80]
zones = np.ones((60, 80), dtype=int)
zones[:, 35:41] = 2
zones[yy > 48] = 3
zones[(xx < 15) & (yy < 20)] = 4
names = {1: 'производство', 2: 'буфер', 3: 'восстановление', 4: 'местообитание'}
pixel_m = 20
areas = pd.DataFrame([{'зона': name, 'площадь_га': int((zones == v).sum()) * pixel_m ** 2 / 10000} for v, name in names.items()])
areas['доля'] = areas.площадь_га / areas.площадь_га.sum()
display(areas)
fig, ax = plt.subplots(figsize=(6, 4))
im = ax.imshow(zones, cmap='tab10', vmin=1, vmax=4)
fig.colorbar(im, ax=ax, ticks=list(names), label='Код зоны')
ax.set_title('Модельное зонирование')
areas.to_csv('zones.csv', index=False)
