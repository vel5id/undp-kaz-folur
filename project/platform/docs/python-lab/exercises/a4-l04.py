# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
series = pd.DataFrame({'месяц': ['апр', 'май', 'июн', 'июл', 'авг', 'сен'], 'площадь_га': [110, 125, 119, 108, 96, 91], 'уровень_м': [3.1, 3.5, 3.35, 3, 2.7, 2.6], 'температура_C': [5, 12, 19, 24, 22, 14]})
display(series)
fig, axs = plt.subplots(1, 2, figsize=(9, 3.5))
axs[0].plot(series.месяц, series.площадь_га, 'o-')
axs[0].set(ylabel='Площадь, га', title='Сезон')
axs[1].scatter(series.уровень_м, series.площадь_га)
axs[1].set(xlabel='Уровень, м', ylabel='Площадь, га')
fig.tight_layout()
series.to_csv('season.csv', index=False)
peak = series.loc[series.площадь_га.idxmax(), 'месяц']
print('Максимум:', peak)
