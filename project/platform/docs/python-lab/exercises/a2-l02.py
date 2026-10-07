# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from shapely.geometry import LineString, box
roads = [('primary', LineString([(-200, 100), (1200, 100)])), ('secondary', LineString([(300, -100), (300, 900)])), ('track', LineString([(0, 0), (1000, 800)]))]
boundary = box(0, 0, 1000, 800)
result = pd.DataFrame([{'класс': kind, 'до_м': line.length, 'после_м': line.intersection(boundary).length} for kind, line in roads])
display(result)
fig, ax = plt.subplots(figsize=(5, 4))
x, y = boundary.exterior.xy
ax.plot(x, y, 'k--')
for kind, line in roads:
    x, y = line.intersection(boundary).xy
    ax.plot(x, y, label=kind)
ax.legend()
ax.set_aspect('equal')
ax.set(xlabel='x, м', ylabel='y, м', title='Обрезка дорог')
result.to_csv('roads.csv', index=False)
