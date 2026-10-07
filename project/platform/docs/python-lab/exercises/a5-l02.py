# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
years = np.arange(2018, 2026)
field = np.array([0.61, 0.6, 0.57, 0.55, 0.56, 0.51, 0.5, 0.48])
control = np.array([0.63, 0.62, 0.61, 0.6, 0.64, 0.61, 0.62, 0.61])
difference = field - control
slope = np.polyfit(years, difference, 1)[0]
table = pd.DataFrame({'год': years, 'участок': field, 'контроль': control, 'разность': difference})
display(table)
fig, ax = plt.subplots(figsize=(7, 3.5))
ax.plot(years, field, 'o-', label='участок')
ax.plot(years, control, 'o-', label='контроль')
ax.legend()
ax.set(xlabel='Год', ylabel='NDVI', title='Синтетические ряды')
print('Тренд разности:', round(slope, 4), 'NDVI/год — сигнал проверки, не доказательство причины.')
