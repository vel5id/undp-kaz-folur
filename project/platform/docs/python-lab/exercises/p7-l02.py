# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
if os.path.exists('monitoring.csv'):
    data = pd.read_csv('monitoring.csv')
else:
    data = pd.DataFrame({'date': pd.date_range('2025-05-01', periods=8, freq='14D'), 'field': [0.25, 0.38, 0.52, 0.68, 0.73, 0.65, 0.48, 0.3], 'zone': [0.23, 0.33, 0.44, 0.54, 0.58, 0.5, 0.39, 0.27], 'clear_fraction': [0.95, 0.92, 0.2, 0.85, 0.9, 0.3, 0.92, 0.95]})
data['date'] = pd.to_datetime(data.date)
valid = data[data.clear_fraction >= 0.7].copy()
valid['difference'] = valid.zone - valid.field
display(data)
display(valid, title='После контроля качества')
fig, ax = plt.subplots(figsize=(7, 3.5))
ax.plot(valid.date, valid.field, 'o-', label='поле')
ax.plot(valid.date, valid.zone, 'o-', label='зона')
ax.legend()
ax.set(ylabel='NDVI', title='Ряд после отбора')
fig.autofmt_xdate()
valid.to_csv('monitoring-clean.csv', index=False)
