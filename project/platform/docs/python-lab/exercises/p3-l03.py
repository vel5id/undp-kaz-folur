# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
observed = np.array([2.1, 2.5, 3, 3.4, 2.8, 3.8, 4, 2.2])
predicted = observed + np.array([0.1, -0.2, 0.4, 0.2, -0.1, 0.3, 0.5, 0])
error = predicted - observed
mae = np.abs(error).mean()
bias = error.mean()
rows = pd.DataFrame({'измерено': observed, 'прогноз': predicted, 'ошибка': error})
display(rows)
print('MAE:', round(mae, 3), 'bias:', round(bias, 3), 'условных т/га')
fig, ax = plt.subplots(figsize=(5, 4))
ax.scatter(observed, predicted)
ax.plot([2, 4.5], [2, 4.5], 'k--')
ax.set(xlabel='Контроль, т/га', ylabel='Прогноз, т/га', title='Синтетическая проверка')
rows.to_csv('prediction-check.csv', index=False)
