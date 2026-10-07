# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
CHECKLIST_ITEMS = ['История участка', 'Журнал операций', 'Раздельное хранение', 'Подтверждение происхождения']
items = pd.DataFrame({'пункт': CHECKLIST_ITEMS, 'статус': ['есть', 'нет', 'есть', 'нет'], 'подтверждение': ['журнал.csv', '', 'план.pdf', '']})
items['готово'] = items.статус.eq('есть') & items.подтверждение.ne('')
display(items)
share = items.готово.mean()
print(f'Подтверждено {items.готово.sum()} из {len(items)} ({share:.0%})')
fig, ax = plt.subplots(figsize=(5, 3))
ax.bar(['подтверждено', 'дополнить'], [items.готово.sum(), (~items.готово).sum()])
ax.set(ylabel='Пункты', title='Полнота пакета')
items.to_csv('checklist.csv', index=False)
