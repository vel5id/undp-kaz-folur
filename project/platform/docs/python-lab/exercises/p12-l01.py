# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
phases = pd.DataFrame({'фаза': ['начальная', 'развитие', 'середина', 'поздняя'], 'дни': [20, 30, 40, 25], 'Kc': [0.4, 0.75, 1.1, 0.65], 'ETo_мм_сут': [3.2, 4.5, 5.4, 4.1], 'эфф_осадки_мм': [22, 35, 41, 18]})
phases['ETc_мм'] = phases.дни * phases.Kc * phases.ETo_мм_сут
phases['дефицит_мм'] = (phases.ETc_мм - phases.эфф_осадки_мм).clip(lower=0)
area_ha = 10
volume = phases.дефицит_мм.sum() * area_ha * 10
display(phases)
print('Чистая потребность:', round(volume), 'м³ на', area_ha, 'га')
fig, ax = plt.subplots(figsize=(7, 3.5))
ax.bar(phases.фаза, phases.дефицит_мм)
ax.set(ylabel='мм', title='Учебный дефицит')
phases.to_csv('water-demand.csv', index=False)
print('Kc и климат условные. Для проекта укажите источники, почвенный запас и эффективность системы.')
