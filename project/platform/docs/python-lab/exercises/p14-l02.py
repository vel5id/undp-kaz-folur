# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
practices = pd.DataFrame({'практика': ['no-till', 'покровные культуры', 'залужение'], 'площадь_га': [500, 200, 80], 'tC_га_год': [0.3, 0.45, 0.85]})
practices['tCO2_год'] = practices.площадь_га * practices.tC_га_год * 44 / 12
total = practices.tCO2_год.sum()
display(practices)
shares = np.array([1, 0.8, 0.6, 0.4])
scenarios = pd.DataFrame({'подтверждённая_доля': shares, 'объём_tCO2': total * shares})
display(scenarios)
fig, ax = plt.subplots(figsize=(6, 3.5))
ax.plot(shares, total * shares, 'o-')
ax.set(xlabel='Подтверждённая доля', ylabel='т CO₂/год', title='Учебная чувствительность')
print('Коэффициенты условные. Без методики, базовой линии, дополнительности и верификации это не зачтённое поглощение.')
