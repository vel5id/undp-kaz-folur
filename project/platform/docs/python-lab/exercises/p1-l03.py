# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import hashlib, json
text = 'id,value\nT1,2.1\nT2,3.0\n'
open('master.csv', 'w').write(text)
open('copy.csv', 'w').write(text)

def checksum(name):
    return hashlib.sha256(open(name, 'rb').read()).hexdigest()
checks = pd.DataFrame([{'файл': name, 'SHA256': checksum(name)} for name in ['master.csv', 'copy.csv']])
display(checks)
identical = checks.SHA256.nunique() == 1
print('Копии совпадают:', identical)
json.dump({'files': checks.to_dict('records'), 'note': 'Две копии в памяти браузера не выполняют правило 3-2-1.'}, open('manifest.json', 'w'), ensure_ascii=False, indent=2)
