# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
measures = pd.DataFrame({'мера': ['залужение', 'лесополоса', 'буфер', 'ремонт водопоя'], 'стоимость_млн': [4, 6, 2, 3], 'польза_балл': [7, 8, 5, 4]})
budget = 10
measures['балл_на_млн'] = measures.польза_балл / measures.стоимость_млн
ordered = measures.sort_values('балл_на_млн', ascending=False).copy()
remaining = budget
chosen = []
for _, r in ordered.iterrows():
    take = r.стоимость_млн <= remaining
    chosen.append(take)
    if take:
        remaining -= r.стоимость_млн
ordered['выбрано'] = chosen
display(ordered)
print('Остаток:', remaining, 'млн тг')
fig, ax = plt.subplots(figsize=(7, 3.5))
ax.bar(ordered.мера, ordered.балл_на_млн)
ax.set(ylabel='Учебные баллы / млн', title='Простой рейтинг')
fig.tight_layout()
ordered.to_csv('restoration.csv', index=False)
