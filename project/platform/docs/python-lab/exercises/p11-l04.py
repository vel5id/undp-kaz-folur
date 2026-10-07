# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.interpolate import RegularGridInterpolator
axis = np.linspace(0, 1000, 101)
xx, yy = np.meshgrid(axis, axis, indexing='ij')
surface = 2 + 5 * np.exp(-((xx - 500) ** 2 + (yy - 500) ** 2) / 100000) + 0.2 * np.sin(xx / 45)
rng = np.random.default_rng(6)
target = rng.uniform(0, 1000, (400, 2))
truth = 2 + 5 * np.exp(-((target[:, 0] - 500) ** 2 + (target[:, 1] - 500) ** 2) / 100000) + 0.2 * np.sin(target[:, 0] / 45)
rows = []
for skip in [1, 2, 5, 10, 20]:
    selected = axis[::skip]
    model = RegularGridInterpolator((selected, selected), surface[::skip, ::skip])
    pred = model(target)
    rows.append([10 * skip, len(selected) ** 2, np.abs(pred - truth).mean()])
metrics = pd.DataFrame(rows, columns=['шаг_м', 'точек', 'MAE_м'])
display(metrics)
fig, ax = plt.subplots(figsize=(6, 3.5))
ax.plot(metrics.шаг_м, metrics.MAE_м, 'o-')
ax.set(xlabel='Шаг, м', ylabel='MAE, м', title='Разрежение модельной поверхности')
