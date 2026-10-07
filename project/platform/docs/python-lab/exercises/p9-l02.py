# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
herd, days, kg_day = (100, 180, 12)
loss = 0.15
yield_t_ha = 3
area_ha = 100
need = herd * days * kg_day / 1000
available = area_ha * yield_t_ha * (1 - loss)
required_area = need / (yield_t_ha * (1 - loss))
table = pd.DataFrame({'показатель': ['потребность, т', 'доступно, т', 'площадь, га', 'резерв, т'], 'значение': [need, available, required_area, available - need]})
display(table)
print('Нормы и урожайность условные; реальные рационы согласуются со специалистом.')
fig, ax = plt.subplots(figsize=(5, 3))
ax.bar(['нужно', 'доступно'], [need, available])
ax.set(ylabel='т', title='Учебный кормовой баланс')
