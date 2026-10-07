# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
rotation = pd.DataFrame({'поле': ['А', 'Б', 'В'], 'площадь_га': [200, 200, 200], '2025': ['зерновые', 'бобовые', 'масличные'], '2026': ['бобовые', 'масличные', 'зерновые'], '2027': ['масличные', 'зерновые', 'бобовые']})
repeats = []
for _, row in rotation.iterrows():
    for left, right in [('2025', '2026'), ('2026', '2027')]:
        if row[left] == row[right]:
            repeats.append([row['поле'], left, right])
shares = rotation.groupby('2025').площадь_га.sum() / rotation.площадь_га.sum()
shannon = float(-(shares * np.log(shares)).sum())
display(rotation)
display(shares.rename('доля'))
print('Повторы:', repeats, 'Шеннон:', round(shannon, 3))
fig, ax = plt.subplots(figsize=(6, 3.5))
shares.plot.bar(ax=ax)
ax.set(ylabel='Доля площади', title='Учебная схема 1:1:1')
fig.tight_layout()
rotation.to_csv('rotation.csv', index=False)
