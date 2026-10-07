# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
width, length, speed = (800, 1200, 2)
steps = np.array([25, 50, 100, 200])
lines = np.ceil(width / steps).astype(int) + 1
distance = lines * length + width * 2
result = pd.DataFrame({'шаг_м': steps, 'галсы': lines, 'путь_м': distance, 'время_ч': distance / speed / 3600})
display(result)
fig, ax = plt.subplots(figsize=(6, 4))
for x in np.linspace(0, width, int(lines[2])):
    ax.plot([x, x], [0, length], color='#357f69')
ax.set_aspect('equal')
ax.set(xlabel='x, м', ylabel='y, м', title='Учебная схема: шаг 100 м')
