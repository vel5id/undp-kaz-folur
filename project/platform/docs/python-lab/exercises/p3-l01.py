# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import rasterio
if os.path.exists('B04.tif') and os.path.exists('B08.tif'):
    with rasterio.open('B04.tif') as r:
        red = r.read(1, masked=True).astype(float).filled(np.nan)
        profile = r.profile
    with rasterio.open('B08.tif') as r:
        assert r.shape == red.shape and r.crs == profile['crs'] and (r.transform == profile['transform']), 'Согласуйте сетки и CRS'
        nir = r.read(1, masked=True).astype(float).filled(np.nan)
    scl = np.zeros(red.shape, dtype=int)
    if os.path.exists('SCL.tif'):
        with rasterio.open('SCL.tif') as r:
            assert r.shape == red.shape and r.crs == profile['crs'] and (r.transform == profile['transform'])
            scl = r.read(1)
else:
    yy, xx = np.mgrid[0:80, 0:120]
    red = 0.15 + 0.04 * np.sin(xx / 10)
    nir = 0.45 + 0.1 * np.cos(yy / 15)
    scl = np.full(red.shape, 4)
    scl[10:25, 25:55] = 9
    print('Синтетические каналы отражения и маска.')
den = nir + red
ndvi = np.divide(nir - red, den, out=np.full(red.shape, np.nan), where=np.isfinite(den) & (den != 0))
ndvi[np.isin(scl, [3, 8, 9, 10, 11])] = np.nan
threshold = 0.45
valid = np.isfinite(ndvi)
problem = valid & (ndvi < threshold)
summary = pd.DataFrame({'показатель': ['чистые пиксели', 'средний NDVI', 'доля ниже порога'], 'значение': [valid.sum(), np.nanmean(ndvi), problem.sum() / valid.sum()]})
display(summary)
fig, axs = plt.subplots(1, 2, figsize=(9, 3.7))
im = axs[0].imshow(ndvi, vmin=-1, vmax=1, cmap='RdYlGn')
fig.colorbar(im, ax=axs[0], label='NDVI')
axs[0].set_title('NDVI без облаков')
axs[1].imshow(np.where(valid, problem, np.nan))
axs[1].set_title(f'Учебный порог {threshold}')
fig.tight_layout()
summary.to_csv('ndvi-summary.csv', index=False)
print('Порог иллюстративный; причина низкого NDVI проверяется в поле.')
