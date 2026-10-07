# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
scenarios = pd.DataFrame({'сценарий': ['база', 'засуха', 'влажный'], 'осадки_мм': [260, 180, 380], 'ET_мм': [320, 370, 300]})
scenarios['баланс_мм'] = scenarios.осадки_мм - scenarios.ET_мм
scenarios['дефицит_мм'] = (-scenarios.баланс_мм).clip(lower=0)
display(scenarios)
fig, ax = plt.subplots(figsize=(6, 3.5))
ax.bar(scenarios.сценарий, scenarios.баланс_мм)
ax.axhline(0, color='k')
ax.set(ylabel='P − ET, мм', title='Учебные сценарии')
print('Упражнение не является прогнозом или полным балансом почвы.')
