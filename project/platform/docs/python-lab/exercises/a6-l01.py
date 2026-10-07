# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
assets = pd.DataFrame({'объект': ['пашня', 'лесополосы', 'луг', 'водоём'], 'площадь_га': [500, 25, 120, 15], 'услуга': ['производство', 'защита от ветра', 'опыление и корм', 'удержание воды']})
assets['доля'] = assets.площадь_га / assets.площадь_га.sum()
display(assets)
fig, ax = plt.subplots(figsize=(7, 3.5))
ax.bar(assets.объект, assets.площадь_га)
ax.set(ylabel='га', title='Модельная инвентаризация')
print('Площадь — характеристика территории, не денежная стоимость услуги.')
assets.to_csv('natural-capital.csv', index=False)
