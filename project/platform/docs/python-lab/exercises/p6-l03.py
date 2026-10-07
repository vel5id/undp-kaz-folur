# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
investment, annual_saving, annual_cost, rate = (12000000, 3800000, 700000, 0.1)
years = np.arange(0, 6)
flow = np.r_[-investment, np.repeat(annual_saving - annual_cost, 5)]
discounted = flow / (1 + rate) ** years
npv = discounted.sum()
table = pd.DataFrame({'год': years, 'поток_тг': flow, 'дисконтированный_тг': discounted, 'накопленный_тг': flow.cumsum()})
display(table.round(2))
fig, ax = plt.subplots(figsize=(7, 3.5))
ax.bar(years, flow / 1000000.0)
ax.plot(years, flow.cumsum() / 1000000.0, 'o-', label='накопленный')
ax.axhline(0, color='k')
ax.legend()
ax.set(xlabel='Год', ylabel='млн тг', title='Учебные денежные потоки')
print('NPV:', round(npv), 'тг')
table.to_csv('cashflow.csv', index=False)
