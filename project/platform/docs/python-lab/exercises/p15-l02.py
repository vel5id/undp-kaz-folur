# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
lots = pd.DataFrame({'партия': ['L01', 'L02', 'L03'], 'поле': ['А', 'Б', 'А'], 'сбор_т': [120, 90, 80], 'документ': ['DOC1', '', 'DOC3']})
docs = pd.DataFrame({'документ': ['DOC1', 'DOC3'], 'тип': ['журнал', 'акт']})
audit = lots.merge(docs, on='документ', how='left')
audit['подтверждено'] = audit.тип.notna()
display(audit)
print('Без подтверждения:', audit.loc[~audit.подтверждено, 'партия'].tolist())
audit.to_csv('traceability.csv', index=False)
