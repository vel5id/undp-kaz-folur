# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
fields = pd.DataFrame({'поле': ['А', 'Б', 'В'], 'покрытие_проц': [65, 15, 50], 'сорняки_балл': [1, 3, 2], 'техника': ['есть', 'есть', 'нет']})
fields['готовность'] = (fields.покрытие_проц >= 40) & (fields.сорняки_балл <= 2) & fields.техника.eq('есть')
display(fields)
print('Предварительно готовые:', fields.loc[fields.готовность, 'поле'].tolist())
fields.to_csv('readiness.csv', index=False)
