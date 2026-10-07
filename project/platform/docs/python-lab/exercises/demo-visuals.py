# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from PIL import Image, ImageEnhance, ImageFilter
if os.path.exists('photo.png'):
    original = Image.open('photo.png').convert('RGB')
    original.thumbnail((640, 480))
else:
    yy, xx = np.mgrid[0:180, 0:260]
    rgb = np.stack([40 + xx * 0.7, 50 + yy * 0.9, 90 + 40 * np.sin(xx / 20)], axis=2)
    original = Image.fromarray(np.clip(rgb, 0, 255).astype('uint8'))
    print('Синтетическое RGB-изображение, не спутниковый снимок.')
processed = ImageEnhance.Contrast(original).enhance(1.8).filter(ImageFilter.GaussianBlur(1))
gray = np.array(processed.convert('L'))
threshold = 125
mask = Image.fromarray(np.where(gray >= threshold, 255, 0).astype('uint8'))
display(original, title='Исходное изображение')
display(processed, title='Контраст и сглаживание')
display(mask, title='Пороговая маска')
table = pd.DataFrame({'показатель': ['ширина, px', 'высота, px', 'средняя яркость', 'доля светлых'], 'значение': [gray.shape[1], gray.shape[0], gray.mean(), (gray >= threshold).mean()]})
display(table, title='Измерения изображения')
fig, ax = plt.subplots(figsize=(7, 3.5))
ax.hist(gray.ravel(), bins=32, color='#267655')
ax.axvline(threshold, color='#bd6929')
ax.set(xlabel='Яркость, 0–255', ylabel='Пиксели', title='Распределение яркости')
processed.save('processed.png')
mask.save('mask.png')
table.to_csv('image-statistics.csv', index=False)
