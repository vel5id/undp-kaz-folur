# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
price, cost, volume, logistics, fixed = (180000, 120000, 400, 12000, 1500000)

def margin(p, v):
    return p * v - (cost + logistics) * v - fixed
base = margin(price, volume)
rows = []
for name, p, v in [('база', price, volume), ('цена −10%', price * 0.9, volume), ('объём −20%', price, volume * 0.8), ('цена +10%', price * 1.1, volume)]:
    rows.append([name, p, v, margin(p, v)])
scenarios = pd.DataFrame(rows, columns=['сценарий', 'цена_тг_т', 'объём_т', 'маржа_тг'])
display(scenarios)
breakeven = cost + logistics + fixed / volume
print('Безубыточная цена:', breakeven, 'тг/т')
fig, ax = plt.subplots(figsize=(7, 3.5))
ax.bar(scenarios.сценарий, scenarios.маржа_тг / 1000000.0)
ax.set(ylabel='Маржа, млн тг', title='Учебные сценарии')
fig.tight_layout()
scenarios.to_csv('market.csv', index=False)
