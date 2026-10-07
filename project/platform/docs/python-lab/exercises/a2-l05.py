# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
areas = pd.DataFrame({'участок': ['А', 'Б', 'В'], 'площадь_га': [120, 80, 100], 'масса_кг_га': [900, 700, 1100], 'изъятие': [0.35, 0.3, 0.4]})
days, need_kg_day = (90, 10)
areas['доступно_кг'] = areas.площадь_га * areas.масса_кг_га * areas.изъятие
areas['условных_голов'] = np.floor(areas.доступно_кг / (days * need_kg_day)).astype(int)
display(areas)
fig, ax = plt.subplots(figsize=(6, 3.5))
ax.bar(areas.участок, areas.условных_голов)
ax.set(xlabel='Участок', ylabel='Условные головы', title='Учебная ёмкость')
