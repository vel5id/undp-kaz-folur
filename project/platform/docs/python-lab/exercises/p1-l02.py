# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
if os.path.exists('journal.csv'):
    journal = pd.read_csv('journal.csv')
else:
    journal = pd.DataFrame({'id': ['T1', 'T2', 'T2', 'T4'], 'date': ['2025-06-01', '2025-06-02', 'bad-date', '2025-06-04'], 'x_m': [10, 20, 20, np.nan], 'y_m': [15, 25, 25, 40], 'value': [2.1, 3, 3, 2.8]})
journal['date_ok'] = pd.to_datetime(journal.date, errors='coerce').notna()
journal['coordinates_ok'] = journal[['x_m', 'y_m']].notna().all(axis=1)
journal['duplicate_id'] = journal.id.duplicated(keep=False)
journal['review'] = ~journal.date_ok | ~journal.coordinates_ok | journal.duplicate_id
display(journal)
print('На проверку:', journal.review.sum())
journal.to_csv('journal-audit.csv', index=False)
