# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
yy, xx = np.mgrid[0:80, 0:100]
truth = ((xx - 50) / 30) ** 2 + ((yy - 40) / 22) ** 2 < 1
green = np.where(truth, 0.2, 0.13)
nir = np.where(truth, 0.05, 0.4)
swir = np.where(truth, 0.03, 0.25)
ndwi = (green - nir) / (green + nir)
mndwi = (green - swir) / (green + swir)
threshold = 0
water = mndwi > threshold
pixel_m = 10
summary = pd.DataFrame({'индекс': ['NDWI', 'MNDWI'], 'площадь_га': [(ndwi > threshold).sum() * pixel_m ** 2 / 10000, water.sum() * pixel_m ** 2 / 10000]})
display(summary)
fig, axs = plt.subplots(1, 3, figsize=(9, 3))
for ax, arr, title in zip(axs, [ndwi, mndwi, water], ['NDWI', 'MNDWI', 'Маска воды']):
    ax.imshow(arr, cmap='Blues')
    ax.set_title(title)
fig.tight_layout()
print('Оптический пример. Радар Sentinel-1 обрабатывается другим алгоритмом.')
