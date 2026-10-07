# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.spatial.distance import cdist
points = np.array([[100, 100], [250, 150], [480, 180], [800, 500], [820, 700]])
threshold = 300
distance = cdist(points, points)
edges = [(i, j) for i in range(len(points)) for j in range(i + 1, len(points)) if distance[i, j] <= threshold]
table = pd.DataFrame([{'от': i + 1, 'до': j + 1, 'расстояние_м': distance[i, j]} for i, j in edges])
display(table)
fig, ax = plt.subplots(figsize=(6, 4))
ax.scatter(*points.T, s=100)
for i, j in edges:
    ax.plot(points[[i, j], 0], points[[i, j], 1], color='#66995d')
for i, (x, y) in enumerate(points):
    ax.text(x + 10, y + 10, str(i + 1))
ax.set_aspect('equal')
ax.set(xlabel='x, м', ylabel='y, м', title='Учебная связность')
print('Связей:', len(edges))
