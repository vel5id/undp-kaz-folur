# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
flows = pd.DataFrame([['Спутниковые сцены', 'Sentinel-2', 'UTM', 'GeoTIFF', 'Архив + копия', 'Маска облаков'], ['Агрохимия', 'Лаборатория', '', 'PDF', 'Папка', 'Дубли проб'], ['Треки', 'Терминал', 'WGS84', 'CSV', '', '']], columns=['поток', 'источник', 'геопривязка', 'формат', 'хранение', 'контроль'])
missing = flows.set_index('поток').eq('').sum(axis=1)
display(flows)
display(missing.rename('пропуски'))
print('PDF без таблицы — отдельная проблема даже при заполненных полях.')
flows.to_csv('passports.csv', index=False)
