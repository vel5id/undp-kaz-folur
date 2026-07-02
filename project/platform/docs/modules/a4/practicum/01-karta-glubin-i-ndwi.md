# Практикум: карта глубин по сырым промерам + сезонная динамика NDWI

> Модуль **А4: Водные ресурсы, гидрологический мониторинг, батиметрия**. Время выполнения: **~90 мин** (часть A ~60 мин, часть B ~30 мин).
> Инструменты: Google Colab (Python: pandas, NumPy, SciPy, Matplotlib, rasterio) и Google Earth Engine — только открытый стек.
> Данные: учебный батиметрический датасет уровня A (`datasets/bathymetry-training-80k.csv` в репозитории платформы; водохранилище степной зоны Казахстана, локальная система координат, см. [политику данных](../../../datasets.md)) и открытый архив Sentinel-2.

## Цель практикума

**[Bloom: применять]** Самостоятельно пройти полный конвейер модуля: очистить реальные сырые эхолотные промеры, построить карту глубин и кривую «уровень–площадь–объём», затем построить сезонный ряд NDWI-площадей водоёма своего региона. **[Bloom: анализировать]** Обосновать параметры фильтрации и оценить качество интерполяции кросс-валидацией.

Практикум опирается на [лекцию 2](../lectures/02-karta-glubin-iz-promerov.md) (часть A) и [лекцию 3](../lectures/03-sputnikovyj-monitoring-vody.md) (часть B); интерпретация результатов — по [лекциям 1](../lectures/01-vodnyj-balans-stepnogo-vodosbora.md) и [4](../lectures/04-godovoj-cikl-vodoyoma.md).

## Что нужно подготовить

- [ ] Google-аккаунт и доступ к [Colab](https://colab.research.google.com) (бесплатно; ноутбук-заготовка: `<URL будет назначен при создании репозитория ноутбуков>`).
- [ ] Файл `bathymetry-training-80k.csv` — скачайте из репозитория платформы (каталог `datasets/`) и загрузите в сессию Colab (значок «Файлы» → «Загрузить»). Полный датасет: Zenodo, `<DOI будет присвоен при публикации на Zenodo>`.
- [ ] Регистрация в [Google Earth Engine](https://earthengine.google.com) (бесплатная некоммерческая учётная запись; активация занимает до пары дней — сделайте заранее).
- [ ] (Для шага A7, по желанию) файл сетки уровня B [`bathymetry-grid-100m.tif`](../data/bathymetry-grid-100m.tif).

!!! warning "Правовой режим данных"
    Датасет уровня A — в локальной системе координат, без геопривязки; название и расположение водоёма не раскрываются. Не пытайтесь «привязать» его к реальным картам и не добавляйте координаты реальных водоёмов в свои ноутбуки при публикации. Для части B полигон интереса вы рисуете вручную вокруг выбранного ВАМИ водоёма — в код учебных материалов реальные координаты не включаются.

---

## Часть A. От сырых промеров к карте глубин (~60 мин)

### Шаг A1. Загрузка и разведочный анализ (EDA)

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

df = pd.read_csv('bathymetry-training-80k.csv')
print(df.shape)          # ожидается (80000, 4)
print(df.describe())     # диапазоны x_m, y_m, depth_m

fig, ax = plt.subplots(1, 2, figsize=(14, 5))
ax[0].hist(df.depth_m, bins=80)
ax[0].set_xlabel('Глубина, м'); ax[0].set_ylabel('Число точек')
sc = ax[1].scatter(df.x_m, df.y_m, c=df.depth_m, s=1, cmap='Blues')
plt.colorbar(sc, label='Глубина, м')
ax[1].set_aspect('equal'); ax[1].set_xlabel('x, м'); ax[1].set_ylabel('y, м')
plt.show()

share_zero = (df.depth_m == 0).mean()
print(f'Доля нулевых отсчётов: {share_zero:.1%}')
```

**Ожидаемый результат:** 80 000 строк; глубины в диапазоне 0–16,1 м; правоасимметричная гистограмма; на карте точек видны галсы съёмки. Запишите вычисленную долю нулевых отсчётов — она понадобится в отчёте.

### Шаг A2. Фильтр уровня 1–2: физический диапазон и нули

Реализуем правила из лекции 2, §3.1: нули сравниваем с медианой ближайших соседей.

```python
from scipy.spatial import cKDTree

xy = df[['x_m', 'y_m']].to_numpy()
tree = cKDTree(xy)
K = 12  # ближайших соседей (сам узел исключаем срезом [1:])
dist, idx = tree.query(xy, k=K + 1)
neigh_median = np.median(df.depth_m.to_numpy()[idx[:, 1:]], axis=1)

is_zero = df.depth_m.to_numpy() == 0
false_zero = is_zero & (neigh_median > 1.0)   # ноль среди «глубоких» соседей
df['flag_false_zero'] = false_zero
print(f'Нулей всего: {is_zero.sum()}, из них потери дна: {false_zero.sum()}')
```

**Ожидаемый результат:** часть нулей помечена как потери дна (изолированные нули среди значимых глубин), остальные — правдоподобные прибрежные точки. Постройте карту помеченных точек: потери дна должны быть рассеяны по акватории, прибрежные нули — тянуться вдоль края облака точек.

### Шаг A3. Фильтр уровня 3: локальные выбросы

```python
depth = df.depth_m.to_numpy()
abs_dev = np.abs(depth - neigh_median)
mad = np.median(np.abs(depth[~is_zero] - neigh_median[~is_zero]))
TOL = max(1.0, 6 * mad)   # стартовый допуск; обоснуйте свой выбор в отчёте
outlier = (~is_zero) & (abs_dev > TOL)
df['flag_outlier'] = outlier
print(f'Выбросов: {outlier.sum()} ({outlier.mean():.2%}), допуск {TOL:.2f} м')

clean = df[~df.flag_false_zero & ~df.flag_outlier].copy()
clean.to_csv('bathymetry-clean.csv', index=False)   # сырой файл не перезаписываем!
```

**Ожидаемый результат:** со стартовым допуском чистка помечает порядка одного-двух процентов точек. Обязательная проверка (лекция 2, §3.2): карта удалённых точек — они должны быть рассеяны, а не образовывать связные структуры (затопленное русло!). Если удаляется заметно больше или удалённые точки складываются в структуры — пересмотрите `TOL` и обоснуйте решение в отчёте.

### Шаг A4. Интерполяция IDW на сетку 100 м

```python
step = 100.0
gx = np.arange(clean.x_m.min(), clean.x_m.max() + step, step)
gy = np.arange(clean.y_m.min(), clean.y_m.max() + step, step)
GX, GY = np.meshgrid(gx, gy)

tree_c = cKDTree(clean[['x_m', 'y_m']].to_numpy())
d, i = tree_c.query(np.c_[GX.ravel(), GY.ravel()], k=8)
w = 1.0 / np.maximum(d, 1e-6) ** 2
Z = (w * clean.depth_m.to_numpy()[i]).sum(axis=1) / w.sum(axis=1)
Z = Z.reshape(GX.shape)
Z[d.min(axis=1).reshape(GX.shape) > 300] = np.nan  # не экстраполируем дальше 300 м от данных

plt.figure(figsize=(10, 7))
pc = plt.pcolormesh(GX, GY, Z, cmap='Blues')
plt.colorbar(pc, label='Глубина, м')
cs = plt.contour(GX, GY, Z, levels=range(0, 17, 2), colors='k', linewidths=0.5)
plt.clabel(cs, fmt='%d'); plt.gca().set_aspect('equal')
plt.title('Карта глубин, IDW, сетка 100 м (локальная СК)')
plt.savefig('depth-map.png', dpi=200)
```

**Ожидаемый результат:** файл `depth-map.png` — карта глубин с изобатами через 2 м; максимум глубин в одной связной зоне (затопленное русло/приплотинная часть), обширные мелководья по периферии.

### Шаг A5. Кросс-валидация

```python
rng = np.random.default_rng(42)
test = rng.random(len(clean)) < 0.15
train, hold = clean[~test], clean[test]

tree_t = cKDTree(train[['x_m', 'y_m']].to_numpy())
d, i = tree_t.query(hold[['x_m', 'y_m']].to_numpy(), k=8)
w = 1.0 / np.maximum(d, 1e-6) ** 2
pred = (w * train.depth_m.to_numpy()[i]).sum(axis=1) / w.sum(axis=1)

rmse = float(np.sqrt(np.mean((pred - hold.depth_m) ** 2)))
mae = float(np.mean(np.abs(pred - hold.depth_m)))
print(f'RMSE = {rmse:.2f} м, MAE = {mae:.2f} м')
```

**Ожидаемый результат:** численные RMSE/MAE вашей интерполяции (значения зависят от ваших параметров фильтрации и IDW — «эталонного правильного ответа» нет, есть воспроизводимая оценка). Поэкспериментируйте: как меняется RMSE при k=4 и k=16 соседях?

### Шаг A6. Объём и кривая «уровень–площадь–объём»

```python
cell = step * step                     # 10 000 м²
V = float(np.nansum(Z) * cell)         # объём при текущем урезе, м³
A = float(np.count_nonzero(~np.isnan(Z)) * cell)
print(f'Площадь ~{A/1e6:.1f} км², объём ~{V/1e6:.1f} млн м³')

levels = np.arange(0, 17, 0.5)         # «сливаем» воду шагами 0,5 м
rows = []
for h in levels:
    Zi = np.clip(Z - h, 0, None)
    rows.append({'снижение_м': h,
                 'площадь_км2': np.count_nonzero(Zi > 0) * cell / 1e6,
                 'объём_млн_м3': np.nansum(Zi) * cell / 1e6})
curve = pd.DataFrame(rows)
curve.to_csv('level-area-volume.csv', index=False)
curve.plot(x='снижение_м', y=['площадь_км2', 'объём_млн_м3'], subplots=True)
plt.savefig('curve.png', dpi=150)
```

**Ожидаемый результат:** файл `level-area-volume.csv` и график: монотонно убывающие кривые площади и объёма. Ответьте в отчёте: при снижении уровня на 1 м какая доля объёма теряется? на 2 м?

### Шаг A7 (по желанию). Сверка с контрольной сеткой уровня B

```python
import rasterio
with rasterio.open('bathymetry-grid-100m.tif') as src:
    ref = src.read(1).astype(float)
ref_d = ref[np.isfinite(ref) & (ref > 0)]
my_d = Z[np.isfinite(Z) & (Z > 0)]

plt.hist(my_d, bins=60, alpha=0.5, density=True, label='моя сетка')
plt.hist(ref_d, bins=60, alpha=0.5, density=True, label='контрольная сетка B')
plt.xlabel('Глубина, м'); plt.legend(); plt.savefig('hist-compare.png', dpi=150)
```

Системы координат сеток различаются (уровень A — локальная СК), поэтому сравниваем не попиксельно, а **распределения глубин и гипсографические кривые**. **Ожидаемый результат:** формы распределений близки; расхождения объясняются вашими параметрами фильтрации/интерполяции — прокомментируйте их.

---

## Часть B. Сезонная динамика NDWI в Google Earth Engine (~30 мин)

### Шаг B1. Выбор объекта и полигона

Откройте [GEE Code Editor](https://code.earthengine.google.com). Найдите на карте водоём в **вашем** районе (СКО, Костанайская или Акмолинская область) — водохранилище, крупный пруд или озеро. Инструментом «Draw a shape» нарисуйте полигон `aoi` с запасом вокруг максимального разлива.

### Шаг B2. Ряд NDWI-площадей за тёплый сезон

```javascript
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(aoi)
  .filterDate('2023-04-01', '2023-10-31')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));

var waterArea = function (img) {
  var scl = img.select('SCL');
  var clear = scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10));
  var ndwi = img.normalizedDifference(['B3', 'B8']);
  var water = ndwi.gt(0).and(clear);
  var area = water.multiply(ee.Image.pixelArea()).reduceRegion({
    reducer: ee.Reducer.sum(), geometry: aoi, scale: 10, maxPixels: 1e9});
  return ee.Feature(null, {date: img.date().format('YYYY-MM-dd'),
                           area_ha: ee.Number(area.values().get(0)).divide(1e4)});
};

var series = ee.FeatureCollection(s2.map(waterArea));
print(ui.Chart.feature.byFeature(series, 'date', 'area_ha')
  .setChartType('LineChart')
  .setOptions({title: 'Площадь воды по NDWI, га'}));
```

**Ожидаемый результат:** график «дата → площадь, га» за сезон: весенний максимум и летний спад (лекция 4, §1.1). Одиночные провалы — остаточная облачность: проверьте подозрительные даты визуально.

### Шаг B3. Проверка маски и экспорт

Наложите маску на RGB-снимок одной даты (`Map.addLayer`) и осмотрите границы: тростники, тени, мелководья (лекция 3, §4.2). Затем экспортируйте ряд: `Export.table.toDrive(series)` → CSV в Google Drive.

**Ожидаемый результат:** CSV-файл ряда площадей + 2–3 предложения в отчёте о качестве маски по итогам визуальной сверки.

### Шаг B4. Повтор за другой год и сравнение

Повторите B2 для другого года (например, многоводный против маловодного). Сравните два ряда по опорным значениям: максимум, середина лета, конец сезона.

**Ожидаемый результат:** вывод в 3–4 предложениях в терминах водного баланса ([лекция 1](../lectures/01-vodnyj-balans-stepnogo-vodosbora.md)): чем объяснимо различие лет?

---

## Продукт задания

По итогам практикума у вас должны быть:

- [ ] Jupyter-ноутбук части A: EDA → фильтрация с протоколом (сколько и почему удалено) → карта глубин `depth-map.png` → RMSE/MAE кросс-валидации → `level-area-volume.csv`;
- [ ] CSV-ряд NDWI-площадей вашего водоёма за два сезона + график;
- [ ] Мини-отчёт (могут быть markdown-ячейки ноутбука): параметры фильтров и их обоснование, оценка качества, выводы по динамике.

**Самопроверка:** (1) сырой CSV не изменён, чистка создала новый файл; (2) доля удалённых статистической чисткой точек — доли процента, и вы видели карту удалённого; (3) карта глубин воспроизводится перезапуском ноутбука «с нуля»; (4) на NDWI-графике опознаны и объяснены аномальные точки; (5) все числа отчёта вычислены кодом, а не «приблизительно от руки».

!!! note "Применить к своему хозяйству"
    **Проект на ВАШЕЙ земле.** Часть B уже выполнена на вашем водоёме — это готовый старт мониторинга. Если доступен эхолот (подойдёт и рыбацкий с GPS-логом): выгрузите трек с промерами, приведите к формату `x, y, depth` — и часть A станет картой глубин вашего пруда: тот же код, другой файл. Полученная кривая «уровень–площадь–объём» + рейка на берегу = ваш личный виртуальный гидропост (лекция 4, §2.2). Артефакт — shareable: карта глубин и график динамики, которые можно показать партнёрам или акимату.

## Дополнительные задания (по желанию)

1. Реализуйте TIN-интерполяцию (`scipy.interpolate.LinearNDInterpolator`) и сравните с IDW кросс-валидацией: какой метод победил на этих данных?
2. Постройте маску MNDWI (B3/B11, scale=20) для вашего объекта части B и сравните площади с NDWI: объясните расхождение (лекция 3, §1.3).
3. Для крупного водохранилища региона постройте ряд площадей JRC Global Surface Water с 1984 г. и найдите многоводные/маловодные фазы.

## Связи

- [Лекция 2](../lectures/02-karta-glubin-iz-promerov.md) — теория части A; [лекция 3](../lectures/03-sputnikovyj-monitoring-vody.md) — теория части B.
- [ИИ-задание модуля](../ai-assistant.md) — делегируйте фильтрацию части A кодинг-агенту и верифицируйте его работу.
- [Итоговая аттестация](../assessment/final.md) — сценарный кейс опирается на результаты практикума.
- [Политика данных](../../../datasets.md) — уровни A/B/C батиметрического датасета.
