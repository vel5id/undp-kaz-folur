# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.signal import convolve2d
rng = np.random.default_rng(7)
image = np.zeros((64, 64))
image[15:48, 18:50] = 1
image += rng.normal(0, 0.15, image.shape)
features = convolve2d(image, np.ones((3, 3)) / 9, mode='same', boundary='symm')
truth = np.zeros(image.shape, dtype=bool)
truth[15:48, 18:50] = True
threshold = 0.5
pred = features >= threshold
iou = (pred & truth).sum() / (pred | truth).sum()
display(pd.DataFrame({'метрика': ['IoU', 'доля точных пикселей'], 'значение': [iou, (pred == truth).mean()]}))
fig, axs = plt.subplots(1, 3, figsize=(9, 3))
for ax, arr, title in zip(axs, [image, features, pred], ['Вход с шумом', 'Свёртка 3×3', 'Маска']):
    ax.imshow(arr, cmap='gray')
    ax.set_title(title)
    ax.axis('off')
fig.tight_layout()
print('Обучение CNN требует отдельного конвейера; здесь показаны свёртка и контроль маски.')
