# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from PIL import Image, ImageFilter, ImageDraw
if os.path.exists('photo.png'):
    source = Image.open('photo.png').convert('RGB')
    source.thumbnail((800, 600))
else:
    source = Image.new('RGB', (360, 240), (180, 165, 110))
    draw = ImageDraw.Draw(source)
    for x in range(0, 360, 24):
        draw.rectangle((x, 20, x + 12, 220), fill=(40, 105, 60))
    draw.ellipse((210, 100, 290, 180), fill=(165, 75, 35))
    print('Искусственный рисунок, не ортофотоплан.')
small = source.resize((max(1, source.width // 10), max(1, source.height // 10)), Image.Resampling.BOX)
coarse = small.resize(source.size, Image.Resampling.NEAREST)
edges = source.filter(ImageFilter.FIND_EDGES)
display(source, title='Исходная детальность')
display(coarse, title='Пиксель в 10 раз крупнее')
display(edges, title='Выделение границ')
display(pd.DataFrame({'вариант': ['исходный', 'уменьшенный'], 'ширина_px': [source.width, small.width], 'высота_px': [source.height, small.height]}))
small.save('coarse.png')
edges.save('edges.png')
