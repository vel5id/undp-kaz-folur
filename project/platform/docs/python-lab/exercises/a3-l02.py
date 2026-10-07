# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split, GroupShuffleSplit
rng = np.random.default_rng(4)
data = pd.DataFrame({'field_id': np.repeat(np.arange(12), 30), 'ndvi': rng.uniform(0.2, 0.8, 360)})
data['class'] = data.field_id % 3
tr, te = train_test_split(np.arange(len(data)), test_size=0.25, random_state=42, stratify=data['class'])
overlap = set(data.iloc[tr].field_id) & set(data.iloc[te].field_id)
tr, te = next(GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42).split(data, groups=data.field_id))
train = data.iloc[tr]
test = data.iloc[te]
group_overlap = set(train.field_id) & set(test.field_id)
comparison = pd.DataFrame({'разбиение': ['пиксели', 'целые поля'], 'общих полей': [len(overlap), len(group_overlap)]})
display(comparison)
display(pd.crosstab(data['class'], np.where(data.index.isin(te), 'test', 'train')))
fig, ax = plt.subplots(figsize=(6, 3))
ax.bar(comparison.разбиение, comparison['общих полей'])
ax.set(ylabel='Общих полей', title='Контроль утечки')
train.to_csv('train.csv', index=False)
test.to_csv('test.csv', index=False)
