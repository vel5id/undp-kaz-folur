# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
area_ha, width_m, speed, battery = (200, 1000, 8, 30)
rows = []
for gsd_cm in [1, 2, 3, 4, 5, 7, 10]:
    height = gsd_cm / 100 * 0.008 / 3e-06
    spacing = 4000 * gsd_cm / 100 * 0.3
    lines = int(np.ceil(width_m / spacing)) + 1
    minutes = lines * (area_ha * 10000 / width_m) / speed / 60 + (lines - 1) * 0.3
    rows.append([gsd_cm, height, spacing, lines, minutes, int(np.ceil(minutes / battery))])
result = pd.DataFrame(rows, columns=['GSD, см', 'высота, м', 'шаг, м', 'линии', 'время, мин', 'вылеты'])
display(result.round(2))
fig, ax = plt.subplots(figsize=(7, 3.5))
ax.plot(result.iloc[:, 0], result.iloc[:, 4], 'o-')
ax.axhline(battery, color='r')
ax.set(xlabel='GSD, см/px', ylabel='Время, мин', title='Учебная миссия')
print('Геометрическая оценка: ветер, резервы и ограничения полёта учитываются отдельно.')
