# Мой участок: паспорт данных и расчёты по вашему полю.
# Если свои данные не подставлены, считается учебный контур с условными координатами.
# Свои данные задаются выше, в блоке «Свои данные»: координаты, контур поля, снимок.
import glob, math, os, re, zipfile
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import geopandas as gpd
from shapely.geometry import Polygon

GSD_CM = 3.0     # целевая детальность съёмки дроном, см на пиксель — измените под свою задачу
SPEED_MS = 8.0   # скорость полёта дрона, м/с

notes, passport = [], []


def utm_epsg(lon, lat):
    """Код EPSG зоны UTM, в которой лежит точка: в ней считают метры и гектары."""
    zone = int((lon + 180) // 6) + 1
    return (32600 if lat >= 0 else 32700) + zone


def crs_name(crs):
    if crs is None:
        return 'не записана'
    code = crs.to_epsg()
    return ('EPSG:%d' % code if code else 'без кода EPSG') + (' (метры)' if crs.is_projected else ' (градусы)')


def read_kml(path):
    """Контуры из KML (Google Earth): координаты в файле идут как «долгота,широта»."""
    import xml.etree.ElementTree as ET
    polygons = []
    for node in ET.parse(path).iter():
        if node.tag.split('}')[-1] != 'Polygon':
            continue
        for ring in node.iter():
            if ring.tag.split('}')[-1] == 'outerBoundaryIs':
                text = ''.join(c.text or '' for c in ring.iter() if c.tag.split('}')[-1] == 'coordinates')
                points = [tuple(float(v) for v in item.split(',')[:2]) for item in text.split() if item.count(',') >= 1]
                if len(points) >= 3:
                    polygons.append(Polygon(points))
    if not polygons:
        raise ValueError('в KML нет полигонов — обведите поле контуром, а не меткой')
    return gpd.GeoDataFrame({'name': ['контур %d' % (i + 1) for i in range(len(polygons))]}, geometry=polygons, crs=4326)


# ── 1. Контур поля: файл → координаты → учебный пример ──────────────────────
field, field_source = None, None
for path in sorted(glob.glob('field.*')):
    ext = path.rsplit('.', 1)[-1].lower()
    target = path
    if ext == 'zip':
        with zipfile.ZipFile(path) as archive:
            names = [n for n in archive.namelist() if '..' not in n and not n.startswith('/')]
            archive.extractall('field_unzipped', members=names)
        found = glob.glob('field_unzipped/**/*.shp', recursive=True)
        if not found:
            notes.append('В архиве %s нет файла .shp — контур не прочитан.' % path)
            continue
        target = found[0]
    try:
        field = read_kml(target) if ext == 'kml' else gpd.read_file(target)
        field_source = path
        break
    except Exception as error:
        notes.append('Файл %s не прочитан: %s' % (path, str(error)[:160]))

if field is None and os.path.exists('coords.txt'):
    points = []
    for line in open('coords.txt', encoding='utf-8'):
        numbers = re.findall(r'-?\d+(?:\.\d+)?', line.replace(',', ' '))
        if len(numbers) >= 2:
            points.append((float(numbers[0]), float(numbers[1])))
    if len(points) >= 3:
        if any(abs(lat) > 90 for lat, lon in points):
            notes.append('Первое число в строке больше 90 — похоже, широта и долгота переставлены. Порядок: широта, долгота.')
            points = [(lon, lat) for lat, lon in points]
        field = gpd.GeoDataFrame({'name': ['поле по координатам']}, geometry=[Polygon([(lon, lat) for lat, lon in points])], crs=4326)
        field_source = 'coords.txt'
    elif points:
        notes.append('Для контура нужно не меньше трёх точек, найдено %d. Показан учебный контур.' % len(points))

demo = field is None
if demo:
    # условный контур в степной зоне: координаты выдуманы и не описывают реальное хозяйство
    field = gpd.GeoDataFrame({'name': ['учебное поле']}, geometry=[Polygon([(66.000, 53.200), (66.018, 53.201), (66.019, 53.192), (66.001, 53.191)])], crs=4326)
    field_source = 'учебный контур'
    print('Контур не прочитан — показан учебный контур с условными координатами. Причина — ниже, в блоке «На что обратить внимание».' if notes
          else 'Свои данные не подставлены — показан учебный контур с условными координатами.')

if field.crs is None:
    bounds = field.total_bounds
    if -180 <= bounds[0] and bounds[2] <= 180 and -90 <= bounds[1] and bounds[3] <= 90:
        field = field.set_crs(4326)
        notes.append('В файле контура не записана система координат. Числа похожи на градусы — принято EPSG:4326. Проверьте.')
    else:
        raise ValueError('В файле контура не записана система координат, а числа не похожи на градусы. Сохраните слой с явной системой координат.')

field = field[field.geometry.notna()]
original_crs = field.crs
center = field.to_crs(4326).geometry.union_all().centroid
epsg = utm_epsg(center.x, center.y)
field_utm = field.to_crs(epsg)
if not field_utm.geometry.is_valid.all():
    notes.append('В контуре есть некорректная геометрия (самопересечения). Для расчёта она исправлена автоматически — исправьте исходный слой.')
    field_utm = field_utm.set_geometry(field_utm.geometry.buffer(0))
shape = field_utm.geometry.union_all()
area_ha = shape.area / 10_000
min_x, min_y, max_x, max_y = shape.bounds
long_side, short_side = max(max_x - min_x, max_y - min_y), min(max_x - min_x, max_y - min_y)
if not original_crs.is_projected:
    notes.append('Контур хранится в градусах. Площадь посчитана после перевода в метры (EPSG:%d); в градусах её считать нельзя.' % epsg)
if area_ha == 0:
    notes.append('В слое нет полигонов (только точки или линии) — площадь не посчитана.')

passport.append({'Данные': field_source, 'Что это': 'контур поля', 'Система координат': crs_name(original_crs),
                 'Содержимое': '%d объект(ов), тип: %s' % (len(field), ', '.join(sorted(set(field.geom_type)))),
                 'Для расчётов': 'переведён в EPSG:%d' % epsg})

display(pd.DataFrame([
    ['Площадь, га', round(area_ha, 2)],
    ['Периметр, км', round(shape.length / 1000, 3)],
    ['Центр: широта, долгота', '%.5f, %.5f' % (center.y, center.x)],
    ['Зона UTM для расчётов', 'EPSG:%d' % epsg],
    ['Габариты, м', '%.0f × %.0f' % (long_side, short_side)],
], columns=['Показатель', 'Значение']), title='Ваш участок')

# ── 2. Снимок или другой растр ───────────────────────────────────────────────
raster_paths = sorted(glob.glob('raster.tif') + glob.glob('raster.tiff'))
band_rows, preview, preview_extent = [], None, None
if raster_paths:
    import rasterio
    from rasterio.mask import mask
    with rasterio.open(raster_paths[0]) as src:
        if src.crs is None:
            pixel_m = None
            notes.append('В растре не записана система координат: его нельзя совместить с контуром. Экспортируйте GeoTIFF с геопривязкой.')
        elif src.crs.is_projected:
            pixel_m = abs(src.transform.a)
        else:
            pixel_m = abs(src.transform.a) * 111_320 * math.cos(math.radians(center.y))
            notes.append('Растр хранится в градусах; размер пикселя в метрах оценён приближённо.')
        passport.append({'Данные': raster_paths[0], 'Что это': 'снимок / растр', 'Система координат': crs_name(src.crs),
                         'Содержимое': '%d × %d пикселей, каналов: %d' % (src.width, src.height, src.count),
                         'Для расчётов': ('пиксель ≈ %.2f м' % pixel_m) if pixel_m else 'нет геопривязки'})
        inside = None
        if src.crs is not None and area_ha > 0:
            try:
                inside, inside_transform = mask(src, field.to_crs(src.crs).geometry, crop=True, filled=False)
                west, north = inside_transform.c, inside_transform.f
                preview_extent = (west, west + inside_transform.a * inside.shape[2], north + inside_transform.e * inside.shape[1], north)
            except ValueError:
                notes.append('Контур и растр не пересекаются: проверьте, что это одна территория и верные системы координат.')
        step = max(1, int(max(src.width, src.height) / 2000))
        whole = src.read(masked=True)[:, ::step, ::step]
        for index in range(min(src.count, 6)):
            row = {'Канал': index + 1, 'Весь растр: мин': float(whole[index].min()), 'среднее': round(float(whole[index].mean()), 4), 'макс': float(whole[index].max())}
            if inside is not None and inside[index].count():
                row['Внутри поля: среднее'] = round(float(inside[index].mean()), 4)
                row['Пикселей в поле'] = int(inside[index].count())
            band_rows.append(row)
        if inside is not None:
            preview = inside[0]
    display(pd.DataFrame(band_rows), title='Растр: значения по каналам')

# ── 3. Что это значит для съёмки ─────────────────────────────────────────────
if area_ha > 0:
    gsd = GSD_CM / 100
    pixel, focal, sensor_width = 3e-6, 8e-3, 4000   # условный учебный сенсор из урока А1.2
    height = gsd * focal / pixel
    spacing = sensor_width * gsd * (1 - 0.70)       # боковое перекрытие 70 %
    lines = math.ceil(short_side / spacing) + 1
    minutes = lines * long_side / SPEED_MS / 60
    display(pd.DataFrame([
        ['Пикселей Sentinel-2 (10 × 10 м) на участке', int(shape.area // 100)],
        ['Высота полёта дрона при GSD %.1f см, м' % GSD_CM, round(height)],
        ['Расстояние между маршрутами, м', round(spacing, 1)],
        ['Число маршрутов', lines],
        ['Время в воздухе, мин', round(minutes, 1)],
    ], columns=['Показатель', 'Значение']), title='Что это значит для съёмки')
    notes.append('Время полёта — геометрическая оценка для условного сенсора урока А1.2, без разворотов, ветра и запаса батареи.')

display(pd.DataFrame(passport), title='Паспорт данных')
if notes:
    display('\n'.join('• ' + note for note in notes), title='На что обратить внимание')

# ── 4. Карта ─────────────────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(7, 6))
if preview is not None:
    raster_crs_field = field.to_crs(rasterio.open(raster_paths[0]).crs)
    ax.imshow(preview, extent=preview_extent, cmap='YlGn')
    raster_crs_field.boundary.plot(ax=ax, color='#D4A24E', linewidth=2)
    ax.set_title('Канал 1 растра внутри контура поля')
else:
    field_utm.plot(ax=ax, color='#2E7D5233', edgecolor='#1B5E3A', linewidth=2)
    ax.set_title('Контур поля, EPSG:%d (метры)' % epsg)
    ax.set_aspect('equal')
ax.ticklabel_format(useOffset=False, style='plain')
ax.tick_params(labelsize=7)
