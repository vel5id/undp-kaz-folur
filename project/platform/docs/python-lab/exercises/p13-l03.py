# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
risks = pd.DataFrame({'риск': ['сток в водоём', 'утрата местообитаний', 'доступ к пастбищу'], 'вероятность': [3, 2, 2], 'последствие': [3, 3, 2], 'мера': ['буфер', 'обход участка', ''], 'ответственный': ['агроном', '', 'координатор']})
risks['приоритет'] = risks.вероятность * risks.последствие
risks['неполно'] = risks.мера.eq('') | risks.ответственный.eq('')
display(risks)
fig, ax = plt.subplots(figsize=(7, 3.5))
ax.barh(risks.риск, risks.приоритет)
ax.set(xlabel='Учебный балл', title='Приоритет проверки')
fig.tight_layout()
risks.to_csv('risk-register.csv', index=False)
