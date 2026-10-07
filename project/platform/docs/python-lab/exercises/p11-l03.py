# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
yy, xx = np.mgrid[-1:1:60j, -1:1:80j]
r2 = xx ** 2 + yy ** 2
depth = np.where(r2 <= 1, 6 * (1 - r2), np.nan)
pixel_m = 20
valid = np.isfinite(depth)
area = valid.sum() * pixel_m ** 2
volume = np.nansum(depth) * pixel_m ** 2
summary = pd.DataFrame({'показатель': ['площадь, га', 'объём, м³', 'средняя глубина, м'], 'значение': [area / 10000, volume, np.nanmean(depth)]})
display(summary)
fig, ax = plt.subplots(figsize=(6, 4))
im = ax.imshow(depth, cmap='viridis_r')
fig.colorbar(im, ax=ax, label='Глубина, м')
ax.set_title('Синтетическая чаша')
print('Учебный метод призм. Точность реального объёма зависит от промеров и интерполяции.')
