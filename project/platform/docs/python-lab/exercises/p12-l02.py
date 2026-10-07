# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
net = 30000
systems = pd.DataFrame({'система': ['поверхностный', 'дождевание', 'капельный'], 'эффективность': [0.55, 0.75, 0.9]})
systems['забор_м3'] = net / systems.эффективность
systems['потери_м3'] = systems.забор_м3 - net
display(systems.round(1))
fig, ax = plt.subplots(figsize=(7, 3.5))
ax.bar(systems.система, systems.забор_м3)
ax.axhline(net, color='r')
ax.set(ylabel='м³', title='Учебное сравнение')
fig.tight_layout()
print('Эффективности условные; выбор также зависит от поля, воды, обслуживания и затрат.')
