# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
yy, xx = np.mgrid[0:60, 0:80]
classes = np.where(xx < 40, 1, 2)
classes[(xx - 55) ** 2 + (yy - 30) ** 2 < 120] = 3
classes[yy < 8] = 4
names = {1: 'пашня', 2: 'луг', 3: 'вода', 4: 'лесополоса'}
pixel_m = 10
summary = pd.DataFrame([{'класс': name, 'пиксели': int((classes == code).sum()), 'площадь_га': (classes == code).sum() * pixel_m ** 2 / 10000} for code, name in names.items()])
display(summary)
fig, ax = plt.subplots(figsize=(6, 4))
im = ax.imshow(classes, vmin=1, vmax=4, cmap='tab10')
fig.colorbar(im, ax=ax, ticks=list(names), label='Код класса')
ax.set_title('Учебная карта классов')
summary.to_csv('landcover.csv', index=False)
