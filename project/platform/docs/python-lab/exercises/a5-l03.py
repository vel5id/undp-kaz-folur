# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
practices = pd.DataFrame({'вариант': ['отвальная', 'минимальная', 'прямой посев'], 'покрытие_проц': [10, 40, 70], 'затраты_условн': [100, 90, 85]})
practices['открытая_почва'] = 1 - practices.покрытие_проц / 100
display(practices)
fig, ax = plt.subplots(figsize=(7, 3.5))
ax.bar(practices.вариант, practices.открытая_почва)
ax.set(ylabel='Доля открытой почвы', title='Условное сравнение')
fig.tight_layout()
