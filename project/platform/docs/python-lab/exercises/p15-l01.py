# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
chain = pd.DataFrame({'этап': ['производство', 'хранение', 'сертификация', 'логистика', 'сбыт'], 'тг_т': [120000, 7000, 4000, 12000, 5000]})
chain['доля'] = chain.тг_т / chain.тг_т.sum()
display(chain)
fig, ax = plt.subplots(figsize=(7, 3.5))
ax.barh(chain.этап, chain.тг_т)
ax.set(xlabel='тг/т', title='Учебная цепочка')
fig.tight_layout()
print('Всего:', chain.тг_т.sum(), 'тг/т')
chain.to_csv('value-chain.csv', index=False)
