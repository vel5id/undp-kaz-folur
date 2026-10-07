# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
balance = pd.DataFrame({'статья': ['приток', 'осадки', 'испарение', 'забор', 'отток'], 'тыс_м3': [120, 18, -35, -22, -40]})
observed = 38
calculated = balance.тыс_м3.sum()
residual = observed - calculated
display(balance)
print('Расчёт:', calculated, 'наблюдение:', observed, 'невязка:', residual, 'тыс. м³')
fig, ax = plt.subplots(figsize=(7, 3.5))
ax.bar(balance.статья, balance.тыс_м3)
ax.axhline(0, color='k')
ax.set(ylabel='тыс. м³', title='Условный баланс')
fig.tight_layout()
