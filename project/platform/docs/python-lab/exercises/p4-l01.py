# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import statistics
values = [0.27, 2.87, 3.4, 16.1, 0.0]
threshold = 2
shallow = [x for x in values if x < threshold]
share = len(shallow) / len(values)
print('Измерений:', len(values), 'медиана:', statistics.median(values), 'мелководных:', f'{share:.0%}')
table = pd.DataFrame({'глубина_м': values})
display(table)
table.to_csv('measurements.csv', index=False)
fig, ax = plt.subplots(figsize=(6, 3))
ax.bar(range(1, len(values) + 1), values)
ax.axhline(threshold, color='r')
ax.set(xlabel='Измерение', ylabel='Глубина, м', title='Учебные измерения')
