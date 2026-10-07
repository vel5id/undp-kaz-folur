# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import rasterio
from rasterio.transform import from_origin
if not os.path.exists('input.tif'):
    yy, xx = np.mgrid[-1:1:60j, -1:1:80j]
    r2 = xx ** 2 + yy ** 2
    arr = np.where(r2 <= 1, 6 * (1 - r2), -9999).astype('float32')
    with rasterio.open('synthetic.tif', 'w', driver='GTiff', width=80, height=60, count=1, dtype='float32', transform=from_origin(0, 1200, 20, 20), nodata=-9999) as dst:
        dst.write(arr, 1)
    filename = 'synthetic.tif'
    print('Синтетический растр в локальной сетке, без реальной геопривязки.')
else:
    filename = 'input.tif'
with rasterio.open(filename) as src:
    raw = src.read(1)
    masked = src.read(1, masked=True)
    cell_area = abs(src.transform.a * src.transform.e - src.transform.b * src.transform.d)
    print('CRS:', src.crs, 'NoData:', src.nodata, 'размер:', src.shape)
summary = pd.DataFrame({'статистика': ['среднее без маски', 'среднее с маской', 'валидных ячеек'], 'значение': [raw.mean(), masked.mean(), masked.count()]})
display(summary)
fig, ax = plt.subplots(figsize=(6, 4))
im = ax.imshow(masked, cmap='viridis_r')
fig.colorbar(im, ax=ax, label='Значение')
ax.set_title('GeoTIFF с NoData')
summary.to_csv('raster-statistics.csv', index=False)
print('Площадь и объём считают после проверки единиц CRS и смысла значений.')
