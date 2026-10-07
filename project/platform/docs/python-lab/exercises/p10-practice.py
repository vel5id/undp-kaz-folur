# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
PLAN_ITEMS = ['Инвентаризация', 'План изменений', 'Подготовка записей', 'Проверка полноты']
plan = pd.DataFrame({'работа': PLAN_ITEMS, 'начало_месяц': [0, 2, 5, 8], 'длительность_месяц': [2, 3, 3, 4], 'затраты_млн': [1, 3, 2, 1]})
plan['завершение'] = plan.начало_месяц + plan.длительность_месяц
display(plan)
fig, ax = plt.subplots(figsize=(8, 3.5))
ax.barh(plan.работа, plan.длительность_месяц, left=plan.начало_месяц)
ax.invert_yaxis()
ax.set(xlabel='Месяц', title='Учебный план')
fig.tight_layout()
print('Всего:', plan.затраты_млн.sum(), 'млн тг')
plan.to_csv('roadmap.csv', index=False)
