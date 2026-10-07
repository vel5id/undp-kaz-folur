# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
samples = pd.DataFrame({'год': [2021, 2023, 2025, 2021, 2023, 2025], 'глубина_см': [20, 20, 10, 20, 20, 20], 'гумус_проц': [3, 3.1, 3.8, 2.7, 2.8, 2.9], 'участок': ['А'] * 3 + ['Б'] * 3})
comparable = samples[samples.глубина_см == 20]
display(samples)
display(comparable, title='Сопоставимые пробы')
fig, ax = plt.subplots(figsize=(7, 3.5))
for label, part in samples.groupby('участок'):
    ax.plot(part.год, part.гумус_проц, 'o-', label=label)
ax.set(xlabel='Год', ylabel='Гумус, %', title='Условные обследования')
ax.legend()
print('У А в 2025 изменилась глубина: рост нельзя автоматически считать восстановлением.')
