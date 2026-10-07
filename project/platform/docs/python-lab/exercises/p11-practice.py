# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.spatial import cKDTree
from scipy.interpolate import LinearNDInterpolator
if os.path.exists('points.csv'):
    df = pd.read_csv('points.csv').dropna(subset=['x_m', 'y_m', 'depth_m'])
    df = df[df.depth_m.between(0, 20)].drop_duplicates(['x_m', 'y_m'])
else:
    rng = np.random.default_rng(12)
    xy = rng.uniform(0, 1000, (240, 2))
    df = pd.DataFrame({'x_m': xy[:, 0], 'y_m': xy[:, 1], 'depth_m': 1 + 6 * np.exp(-((xy[:, 0] - 500) ** 2 + (xy[:, 1] - 500) ** 2) / 180000)})
    print('240 точек синтетической поверхности, не реальный водоём.')
assert len(df) >= 30, 'Нужно не менее 30 точек'
test = df.iloc[::5]
train = df.drop(test.index)
coords = train[['x_m', 'y_m']].to_numpy()
tree = cKDTree(coords)
power = 2

def idw(target):
    distance, index = tree.query(target, k=min(8, len(train)))
    weight = 1 / np.maximum(distance, 1e-06) ** power
    return (weight * train.depth_m.to_numpy()[index]).sum(axis=1) / weight.sum(axis=1)
pred = idw(test[['x_m', 'y_m']])
linear = LinearNDInterpolator(coords, train.depth_m)(test[['x_m', 'y_m']])
valid = np.isfinite(linear)
metrics = pd.DataFrame({'метод': ['IDW', 'линейная триангуляция'], 'MAE_м': [np.abs(pred - test.depth_m).mean(), np.abs(linear[valid] - test.depth_m.to_numpy()[valid]).mean()]})
display(metrics)
xx, yy = np.meshgrid(np.linspace(train.x_m.min(), train.x_m.max(), 60), np.linspace(train.y_m.min(), train.y_m.max(), 60))
grid = idw(np.c_[xx.ravel(), yy.ravel()]).reshape(xx.shape)
inside = np.isfinite(LinearNDInterpolator(coords, np.ones(len(train)))(xx, yy))
grid[~inside] = np.nan
fig, ax = plt.subplots(figsize=(6, 4))
im = ax.pcolormesh(xx, yy, grid, cmap='viridis_r', shading='auto')
ax.scatter(test.x_m, test.y_m, c='white', s=8)
ax.set_aspect('equal')
ax.set(xlabel='x, м', ylabel='y, м', title='Интерполяция и проверочные точки')
fig.colorbar(im, ax=ax, label='Глубина, м')
metrics.to_csv('validation.csv', index=False)
