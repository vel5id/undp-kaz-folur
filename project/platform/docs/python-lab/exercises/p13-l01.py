# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
observations = pd.DataFrame({'место': ['лесополоса', 'лесополоса', 'луг', 'луг', 'водоём', 'водоём', 'луг'], 'группа': ['птицы', 'опылители', 'птицы', 'опылители', 'птицы', 'амфибии', 'опылители'], 'число': [8, 5, 6, 12, 15, 4, 3]})
summary = observations.pivot_table(index='место', columns='группа', values='число', aggfunc='sum', fill_value=0)
display(observations)
display(summary)
fig, ax = plt.subplots(figsize=(7, 3.5))
summary.plot.bar(ax=ax)
ax.set(ylabel='Условные регистрации', title='Учебный учёт')
fig.tight_layout()
summary.to_csv('habitats.csv')
