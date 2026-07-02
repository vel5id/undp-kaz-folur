# Практикум: классификация землепользования района СКО тремя подходами (RF / MiniRocket / CNN)

> Модуль **[А3: ИИ и машинное обучение в агроэкологическом мониторинге](../index.md)**. Время выполнения: **60–90 мин**.
> Инструменты: Google Colab (Python), Google Earth Engine, scikit-learn, sktime, PyTorch — весь стек открытый и бесплатный.
> Данные: Sentinel-2 L2A (`COPERNICUS/S2_SR_HARMONIZED`), ESA WorldCover, границы района из OpenStreetMap.
> Ноутбук: `<URL будет назначен при создании репозитория ноутбуков>`.

## Цель практикума

**[Bloom: применять]** Самостоятельно собрать обучающую выборку по одному району Северо-Казахстанской области, обучить и честно (с пространственным разбиением) сравнить три подхода к классификации землепользования — Random Forest, MiniRocket и компактную CNN — и обоснованно выбрать один из них под задачу карты.

Практикум сводит воедино все четыре лекции модуля: данные ([урок 1](../lectures/01-open-data-catalogs.md)), выборку без утечек ([урок 2](../lectures/02-dataset-preparation.md)), классические модели ([урок 3](../lectures/03-classic-models-timeseries.md)), CNN и метрики ([урок 4](../lectures/04-cnn-and-architecture-choice.md)). Итог — прикладной продукт модуля.

## Что нужно подготовить

- [ ] Аккаунт Google и доступ к [Google Earth Engine](https://earthengine.google.com/) (бесплатная регистрация для исследователей).
- [ ] Google Colab (открывается в браузере, установка не нужна); желательно включить GPU в меню «Среда выполнения» для шага 5.
- [ ] Границу тестового района СКО в формате GeoJSON: возьмите административную границу района из OpenStreetMap (`geoBoundaries`/Overpass) или используйте готовый полигон из ноутбука.
- [ ] Библиотеки (устанавливаются первой ячейкой ноутбука): `earthengine-api`, `geemap`, `scikit-learn`, `sktime`, `torch`, `numpy`, `rasterio`.

!!! warning "Никаких реальных координат водоёмов"
    В этом практикуме работаем только с наземным землепользованием. Батиметрические данные и координаты водоёмов — предмет [модуля А4](../../a4/index.md) и подчиняются отдельному [правовому режиму данных](../../../datasets.md); здесь они не используются.

## Задание

### Шаг 1. Определяем район и период (≈8 мин)

Задайте область интереса и вегетационное окно сезона по методике [урока 1](../lectures/01-open-data-catalogs.md).

```python
import ee, geemap
ee.Authenticate(); ee.Initialize()

aoi = geemap.geojson_to_ee(district_geojson)   # граница района СКО из OSM
start, end = '2023-05-01', '2023-09-30'          # сезон яровых
```

**Ожидаемый результат:** на интерактивной карте `geemap` отображается граница выбранного района СКО; переменная `aoi` — валидная геометрия.

### Шаг 2. Строим безоблачный композит и ряды NDVI (≈12 мин)

```python
def mask_scl(img):
    scl = img.select('SCL')
    good = scl.remap([4, 5, 6, 7], [1, 1, 1, 1], 0)  # вегетация, почва, вода, unclassified
    return img.updateMask(good).divide(10000)

s2 = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(aoi).filterDate(start, end)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
      .map(mask_scl))

print('Сцен в выборке:', s2.size().getInfo())        # сколько сцен нашлось
composite = s2.median().clip(aoi)                     # медианный композит

def add_ndvi(img):
    return img.addBands(img.normalizedDifference(['B8', 'B4']).rename('NDVI'))
ndvi_series = s2.map(add_ndvi).select('NDVI')          # ряд NDVI для MiniRocket
```

**Ожидаемый результат:** число сцен выведено в консоль; `composite` — многоканальный медианный композит по району; `ndvi_series` — коллекция NDVI по датам.

!!! tip "Контроль качества (человек верифицирует)"
    Выведите композит на карту (`geemap.Map`) и посмотрите глазами: нет ли облачных артефактов, полос, «дыр». Если июнь пустой — зафиксируйте это: карта уверенности по месяцам обязательна в отчёте ([урок 1](../lectures/01-open-data-catalogs.md), кейс).

### Шаг 3. Метки и выборка без утечек (≈12 мин)

Черновые метки укрупнённых классов берём из ESA WorldCover и выборочно верифицируем ([урок 2](../lectures/02-dataset-preparation.md)).

```python
wc = ee.ImageCollection('ESA/WorldCover/v200').first().clip(aoi)  # 10 м, классы LULC

# Сетка 5×5 км для ПРОСТРАНСТВЕННОГО разбиения (не по пикселям!)
grid = aoi.coveringGrid('EPSG:3857', 5000)

# Собираем обучающую таблицу: признаки композита + метка WorldCover + id ячейки сетки
sample = composite.addBands(wc.rename('label')).stratifiedSample(
    numPoints=300, classBand='label', region=aoi, scale=10, geometries=True)
```

**Ожидаемый результат:** таблица `sample` с признаками, меткой и координатами; каждой точке присвоен идентификатор ячейки сетки (группа для разбиения).

!!! warning "Проверка на утечку"
    Разбиение выполняется по **ячейкам сетки** (`GroupShuffleSplit`/`GroupKFold` по `cell_id`), а не случайно по точкам. Ниже (шаг 6) вы измерите цену утечки, сравнив два разбиения.

### Шаг 4. Random Forest на пиксельной таблице (≈10 мин)

```python
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import f1_score, cohen_kappa_score, confusion_matrix

gss = GroupShuffleSplit(n_splits=1, test_size=0.3, random_state=42)
tr, te = next(gss.split(X, y, groups=cell_id))       # пространственное разбиение

rf = RandomForestClassifier(n_estimators=300, random_state=42).fit(X[tr], y[tr])
pred = rf.predict(X[te])
print('macro-F1:', f1_score(y[te], pred, average='macro'))
print('kappa   :', cohen_kappa_score(y[te], pred))
print(confusion_matrix(y[te], pred))
print('важность признаков:', sorted(zip(feature_names, rf.feature_importances_),
                                     key=lambda t: -t[1])[:5])
```

**Ожидаемый результат:** значения macro-F1 и каппы, матрица ошибок, топ-5 важности признаков. Запишите их — это первая строка вашей сравнительной таблицы.

### Шаг 5. MiniRocket на рядах NDVI и компактная CNN на тайлах (≈20 мин)

**MiniRocket** (классификация по фенологии, [урок 3](../lectures/03-classic-models-timeseries.md)):

```python
from sktime.transformations.panel.rocket import MiniRocket
from sklearn.linear_model import RidgeClassifierCV

mr = MiniRocket().fit(S_train)          # S_* — выровненные ряды NDVI (декадная сетка)
clf = RidgeClassifierCV().fit(mr.transform(S_train), y_train)
pred_mr = clf.predict(mr.transform(S_test))     # тест — из ДРУГИХ ячеек сетки
```

**Компактная CNN** (сегментация тайлов, [урок 4](../lectures/04-cnn-and-architecture-choice.md)) — используйте готовую малую U-Net из ноутбука; при отсутствии GPU уменьшите число тайлов и эпох (задание останется выполнимым, метрики будут скромнее — это нормально).

**Ожидаемый результат:** метрики MiniRocket и CNN, вычисленные на том же пространственном тесте, что и RF. Три строки сравнительной таблицы заполнены.

### Шаг 6. Цена утечки и честное сравнение (≈15 мин)

Обучите RF ещё раз со **случайным** разбиением (`train_test_split(..., random_state=42)`) и сравните метрики со шагом 4.

```python
from sklearn.model_selection import train_test_split
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, random_state=42)  # СЛУЧАЙНО
rf2 = RandomForestClassifier(n_estimators=300, random_state=42).fit(Xtr, ytr)
print('macro-F1 (случайное разбиение):', f1_score(yte, rf2.predict(Xte), average='macro'))
```

**Ожидаемый результат:** случайное разбиение почти наверняка даёт заметно более высокую метрику, чем пространственное. Эта разница — измеренная вами лично цена пространственной утечки ([урок 2](../lectures/02-dataset-preparation.md), § 4.2). Запишите обе цифры и объясните разрыв.

## Продукт задания

По итогам практикума у вас должно быть:

- [ ] Ноутбук с воспроизводимым пайплайном (сиды зафиксированы, окружение сохранено).
- [ ] Карта(ы) классификации землепользования района СКО (минимум — по лучшей модели).
- [ ] **Сравнительная таблица**: строки — RF, MiniRocket, CNN; столбцы — macro-F1, каппа, время обучения, ресурсы, замечания по матрице ошибок.
- [ ] Две цифры «цены утечки» (пространственное vs случайное разбиение) с объяснением.
- [ ] Письменное обоснование выбора одной модели под задачу карты (5–8 предложений).

**Самопроверка:** ваша сравнительная таблица не содержит «пустых» победителей — для каждого метода указано, *почему* он получил такие метрики (структура ошибок, объём данных, разрешение). Разрыв метрик между случайным и пространственным разбиением объяснён через автокорреляцию. Ни одно число в таблице не «придумано» — все получены запуском кода.

!!! note "Применить к своему хозяйству — «Проект на ВАШЕЙ земле»"
    Замените границу района на **контур своих полей** (нарисуйте в geojson.io или возьмите из QGIS, [модуль А2](../../a2/index.md)). Соберите композит и метки WorldCover для своей территории, обучите Random Forest и постройте карту классов своих угодий с картой уверенности. Вопрос для осмысления: где модель не уверена — совпадает ли это с участками, которые и вам на местности кажутся спорными (краевые зоны, залежи в переходном состоянии)? Этот мини-проект — заготовка для профессионального [модуля П3](../../p3/index.md) (без кода) и [П4](../../p4/index.md) (первый Python-скрипт).

## Дополнительные задания (по желанию)

1. Добавьте в признаки RF рельеф (уклон, экспозиция из ASTER GDEM) и фенологические признаки (амплитуда NDVI, дата пика) — изменилась ли важность и качество ([урок 3](../lectures/03-classic-models-timeseries.md), § 3.4)?
2. Постройте карту уверенности RF (доля голосов деревьев) и сдайте её вместе с картой классов.
3. Повторите анализ для района Костанайской или Акмолинской области и сравните структуру ошибок между регионами.
4. Соберите гибрид: фенологические признаки MiniRocket + спектральные признаки в одном Random Forest ([урок 4](../lectures/04-cnn-and-architecture-choice.md), § 6).

## Связи

- Лекции модуля: [урок 1](../lectures/01-open-data-catalogs.md), [урок 2](../lectures/02-dataset-preparation.md), [урок 3](../lectures/03-classic-models-timeseries.md), [урок 4](../lectures/04-cnn-and-architecture-choice.md).
- Следующий шаг: [ИИ-задание модуля](../ai-assistant.md) — аудит ML-пайплайна, собранного кодинг-агентом.
- Итоговая проверка: [assessment/final.md](../assessment/final.md).
- Политика данных платформы: [Датасеты](../../../datasets.md).
