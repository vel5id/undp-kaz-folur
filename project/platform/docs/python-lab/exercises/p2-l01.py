# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import geopandas as gpd
from shapely.geometry import Polygon
polygon = Polygon([(63.5, 53.2), (63.51, 53.2), (63.51, 53.21), (63.5, 53.21)])
fields = gpd.GeoDataFrame({'name': ['Учебный полигон']}, geometry=[polygon], crs='EPSG:4326')
areas = pd.DataFrame([[crs, fields.to_crs(crs).area.iloc[0] / 10000] for crs in ['EPSG:32641', 'EPSG:3857']], columns=['CRS', 'площадь_га'])
display(areas)
print('Квадратные градусы:', polygon.area, '— не гектары.')
fig, ax = plt.subplots(figsize=(5, 4))
fields.to_crs('EPSG:32641').plot(ax=ax, facecolor='#8fb693', edgecolor='#245a40')
ax.set(xlabel='Easting, м', ylabel='Northing, м', title='Учебный полигон')
fields.to_file('field.geojson', driver='GeoJSON')
