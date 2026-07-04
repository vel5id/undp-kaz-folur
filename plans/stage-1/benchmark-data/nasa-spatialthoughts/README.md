# База курсов — NASA ARSET + Spatial Thoughts

Сводная база знаний по обучающим курсам провайдеров **NASA ARSET** (Applied Remote Sensing Training, NASA Applied Sciences / Earthdata) и **Spatial Thoughts** (Ujaval Gandhi). Назначение — ориентир для проектирования учебных модулей платформы FOLUR (UNDP-KAZ-00683) с акцентом на $0-стоимость, открытые данные и практическую педагогику GEE/Colab.

| Курс | Язык | Стоимость | Длит. | Уровень | URL |
|------|------|-----------|-------|---------|-----|
| NASA ARSET — Satellite Remote Sensing for Agricultural Applications | EN + ES | Бесплатно ($0) | 4×1.5ч (~6ч), 4 недели | Вводный | https://www.earthdata.nasa.gov/learn/trainings/satellite-remote-sensing-agricultural-applications |
| Large Scale Applications of Machine Learning using Remote Sensing (NASA ARSET) | EN (слайды + ES) | Бесплатно ($0)* | 3×1.5ч (4.5ч) | Продвинутый | https://www.earthdata.nasa.gov/learn/trainings/large-scale-applications-machine-learning-using-remote-sensing-building-agriculture |
| End-to-End Google Earth Engine (Full Course) — Spatial Thoughts | EN | Самообучение бесплатно; живой поток $229 / ₹15 999 +GST | 27ч (9×3ч) | От новичка до продвинутого | https://courses.spatialthoughts.com/end-to-end-gee.html |

\* Курс ARSET бесплатен, но воспроизведение его hands-on пайплайна требует платных AWS S3 + Databricks — не $0 для практики.

---

## NASA ARSET — Satellite Remote Sensing for Agricultural Applications

Вводный двуязычный (EN/ES) вебинарный курс из 4 частей по 1.5ч: обзорное ДЗЗ для сельского хозяйства, влажность почвы (SMAP/LDAS), мониторинг посевов, эвапотранспирация и индекс водного стресса (ET/ESI). Концептуальный, без кода; домашки — Google Forms. Сертификат — по стандарту ARSET (полное посещение + домашки), но критерии для этого конкретного предложения **[UNVERIFIED]**.

**Сильные стороны**
- Полностью $0 и открытый доступ (слайды, записи, конспекты Q&A, домашки) — точное совпадение с нулевым бюджетом FOLUR.
- Полностью двуязычная выдача (EN+ES) с параллельной домашкой — рабочий шаблон для неанглоязычной (русскоязычной) аудитории.
- Чёткая модульная структура 4×1.5ч с явными learning objectives — низкая когнитивная нагрузка, удобно для работающих представителей МСБ.
- Аудитория ориентирована на лиц, принимающих решения (политика, страхование, продбезопасность, гуманитарка), а не на академиков — то же практик-обрамление, что нужно FOLUR.
- Сильный акцент на ПОИСК и ДОСТУП к данным (где найти SMAP/LDAS/ET, как скачать) — переносимый, инструментально-независимый навык.
- Кейс-ориентированная подача (засуха, мониторинг посевов, гуманитарный отклик).

**Что заимствовать для FOLUR**
- Тематическую модульную структуру 4×1.5ч с явными целями на каждый модуль.
- Модель полностью двуязычной выдачи как доказанный шаблон для русскоязычной аудитории СКО/Костанай/Акмола.
- Тематические блоки как карту: влажность почвы, ET/ESI для оценки засухи, мониторинг посевов — заменив продукты NASA на бесплатные Sentinel-1/2 + GEE/Colab.
- Акцент на навык поиска и доступа к данным — но через GEE Data Catalog и открытые порталы (Copernicus, ASF).
- Бесплатный механизм оценки через Google Forms — но УСИЛИТЬ автогрейдингом ноутбуков (engine/autograder).
- Кейс-ориентированную подачу, заземлённую на реальные данные СКО/Костанай/Акмола.
- Из смежного, более сильного курса ARSET (Crop Mapping/Crop Classification SAR & Optical) — готовые .ipynb + zip с imagery/vector через Google Drive, GitHub-репозиторий и пошаговые «повтори самостоятельно» на Sentinel-1/2 как hands-on GEE/Colab-модель.
- Чёткую цепочку предпосылок (сначала «Основы ДЗЗ», потом прикладной курс) для траектории А-модулей.
- АНТИ-паттерн: не публиковать слайды по 70–90 МБ; дробить и хостить легко на GitHub Pages.

---

## Large Scale Applications of Machine Learning using Remote Sensing (NASA ARSET)

Продвинутый курс из 3 частей (4.5ч), со-преподаётся с практиками John Deere: сквозной big-data ML-пайплайн на агро-снимках — подготовка данных (USDA NASS API + CDL + Sentinel-2), data loaders (TensorFlow/Parquet, разбиение без утечки данных), обучение и валидация 1-D CNN для классификации культур. Стек **не $0**: AWS S3 + Databricks + PySpark + TensorFlow; не использует GEE/Colab. Технические внутренности 1-D CNN **[UNVERIFIED]** (слайды Part 3 не извлеклись из бинарного PDF).

**Сильные стороны**
- Реалистичный продакшн-пайплайн (ingest → data loader → train → validate), а не игрушка.
- Со-преподавание с практиками John Deere — заземление в реальной агро-ML практике.
- Явно учит работе с большими (>5GB) данными и, важно, как избегать утечки информации в train/val/test split — редкий пункт строгости.
- Аутентичные агро-метки (USDA CDL через NASS API) в паре с Sentinel-2.
- Бесплатный, с постоянно опубликованными слайдами (EN+ES), данными, конспектами Q&A, записями.
- Переносимый паттерн: 1-D CNN по временным рядам спектра для классификации культур.

**Что заимствовать для FOLUR**
- Сквозной нарратив пайплайна (ingest → loader → train → validate → predict) как спину модуля, но на $0-стеке: Sentinel-2 через GEE/Colab вместо S3/Databricks/PySpark.
- Замена меток USDA CDL региональным аналогом для Северного Казахстана (полевые полигоны + ESA WorldCover/Dynamic World) — задокументировать как урок по источникам меток.
- 1-D CNN по временным рядам спектра как продвинутый ноутбук FOLUR, бесплатно запускаемый в Colab (scikit-learn/TensorFlow).
- Явный урок про train/val/test split БЕЗ пространственной/информационной утечки — адаптировать в русскоязычный методблок (высокая педагогическая ценность).
- Многоуровневая структура: опциональные неоценочные упражнения на часть ПЛЮС один оценочный gate-хоумворк для сертификата — ложится на autograder + certificate engine.
- Лестница предпосылок: ML/классификация культур — продвинутый модуль за «Основами ДЗЗ» и базой crop-mapping.
- Двуязычные артефакты (их EN+ES) как модель — FOLUR ставит русский основным, казахский — stretch-goal.
- Модель со-преподавания практик+академия (NASA + John Deere) — пара академконтент + региональный агробизнес/агроном-кейс.

---

## End-to-End Google Earth Engine (Full Course) — Spatial Thoughts

Эталонный практический курс по GEE (27ч): от «Hello World» до supervised-классификации, change detection, app-building и Python API. Самообучение бесплатно (видео YouTube/Vimeo + общий репозиторий GEE-скриптов); сертификат и автогрейдинг — только в платном живом потоке ($229). Каждое понятие сопровождается inline-заданием «[Try in Code Editor]»; 5 сквозных Guided Projects; Module 6 переносит работу в Python/Colab/QGIS. SMAP/влажность почвы отсутствуют **[UNVERIFIED — заявлено как отсутствующее]**; лицензия и точный URL репозитория не подтверждены.

**Сильные стороны**
- Настоящий $0 self-study: 27ч материала, видео и запускаемый репозиторий скриптов — бесплатно; совпадает с no-cost стеком FOLUR.
- Образцовый дизайн упражнений: у каждого понятия inline «[Try in Code Editor]» — учащийся сразу запускает код, а не смотрит.
- Сквозные реальные Guided Projects (паводки, отклонение осадков, landcover, ночные огни) связывают примитивы в полный workflow.
- Современные датасеты и техники: Dynamic World, Cloud Score+, deep-learning Satellite Embeddings, accuracy assessment, масштабирование.
- Полный конвейер вкл. app-building и отдельный Python/Colab/QGIS-модуль — прямо отражает стек FOLUR.
- Код как общий репозиторий, добавляемый в свой аккаунт — мгновенно воспроизводимо.

**Что заимствовать для FOLUR**
- Паттерн inline-упражнений «[Try in Code Editor]» → блоки «Попробуйте в Colab» после каждого понятия.
- 3–5 региональных сквозных Guided Projects: NDVI-временной ряд по пшеничному полю Костаная, паводок/влажность почвы в СКО, change-detection landcover в Акмоле.
- Лестница прогрессии: filter → composite → index → cloud-mask → reduce → classify → accuracy → change detection — как спину лекций GEE/Colab.
- Бесплатные агро-релевантные датасеты: Sentinel-2, Dynamic World, Cloud Score+, TerraClimate; добавить SMAP (которого тут нет, но он нужен агро-аудитории).
- Раздача кода как общего, добавляемого-в-аккаунт репозитория (GEE-скрипты + Colab-ноутбуки) — под $0/no-admin инвариант.
- Явный урок Accuracy Assessment и урок app-building, чтобы МСБ доверяли результатам и делились интерактивными картами.
- Сохранить самопейсовую бесплатную модель, но ДОБАВИТЬ автогрейдинг + сертификат, которые этот курс прячет за оплатой — у FOLUR autograder и certificate engine уже это закрывают.

---

## Дополнительно найденные курсы

Кандидаты, обнаруженные при разведке (не разобраны в полные карточки; релевантны для расширения базы):

- **ARSET — Satellite Remote Sensing for Agricultural Applications** — https://appliedsciences.nasa.gov/get-involved/training/english/arset-satellite-remote-sensing-agricultural-applications — ДЗЗ для сельского хозяйства (мониторинг посевов и засухи, состояние растительности); бесплатно, открытые данные NASA, прямое соответствие агро/водным модулям. (Зеркало уже разобранного вводного курса.)
- **ARSET — Applications of Remote Sensing-Based Evapotranspiration Data Products for Agricultural and Water Resource Management** — https://appliedsciences.nasa.gov/get-involved/training/english/arset-applications-remote-sensing-based-evapotranspiration-data — ET для сельского хозяйства и водного управления через OpenET и ECOSTRESS; релевантно для богарного земледелия Северного Казахстана.
- **ARSET — Agricultural Crop Classification with Synthetic Aperture Radar and Optical Remote Sensing** — https://appliedsciences.nasa.gov/get-involved/training/english/arset-agricultural-crop-classification-synthetic-aperture-radar-and — классификация культур SAR + оптика; источник hands-on педагогики (.ipynb, imagery/vector) для зернового пояса СКО/Костанай/Акмола.
- **End-to-End Google Earth Engine (Full Course, OpenCourseWare)** — https://courses.spatialthoughts.com/end-to-end-gee.html — GEE + ML классификация изображений; полностью разобран выше.
- **Python Foundation for Spatial Analysis (Full Course, OpenCourseWare)** — https://courses.spatialthoughts.com/python-foundation.html — Python для пространственного анализа с нуля (vector/raster, операции, автоматизация пайплайнов); программная основа под GEE/Colab-ноутбуки FOLUR.

---

## Выводы для платформы FOLUR

Главный разрыв между провайдерами — это **hands-on**, и именно практическую педагогику GEE/Colab стоит перенимать в первую очередь:

1. **Spatial Thoughts — эталон практики.** Перенять паттерн «после каждого понятия — запускаемая ячейка» (inline «[Try in Code Editor]» → «Попробуйте в Colab»), сквозные Guided Projects и раздачу кода как общего репозитория, добавляемого в аккаунт учащегося. Это напрямую реализует $0/no-admin инвариант и даёт воспроизводимость.
2. **ARSET даёт структуру и обрамление, но не навык.** Вводный агро-курс силён модульностью 4×1.5ч, двуязычием и кейс-подачей для лиц, принимающих решения — это заимствуем как каркас и тон. Но его форм-домашки и слайды дают слабую верификацию навыка и плохо подходят low-bandwidth аудитории (анти-паттерн PDF 70–90 МБ).
3. **ML-курс ARSET — ценная методология, неподходящий стек.** Берём нарратив сквозного пайплайна (ingest → loader → train → validate → predict) и особенно урок про разбиение без утечки данных, но переносим с AWS/Databricks/PySpark на бесплатные Sentinel-2 + GEE/Colab; метки USDA CDL заменяем региональными (полевые полигоны + ESA WorldCover/Dynamic World).
4. **Закрыть то, что они прячут или пропускают.** Spatial Thoughts прячет сертификат/автогрейдинг за оплатой, ARSET даёт слабую верификацию — у FOLUR уже есть `engine/autograder` и certificate engine, поэтому бесплатную самопейсовую модель надо ДОПОЛНИТЬ автогрейдингом ноутбуков и проверяемым сертификатом.
5. **Локализация и заземление обязательны.** Все три курса англо/испано-центричны и глобальны; FOLUR делает русский основным языком и заземляет каждый кейс на реальные данные СКО/Костанай/Акмола (NDVI-ряд пшеничного поля, влажность почвы/паводок в СКО, change-detection в Акмоле), добавляя SMAP-влажность почвы, которой в Spatial Thoughts нет.
6. **Лестница предпосылок.** Перенять цепочку «Основы ДЗЗ → базовый crop-mapping → продвинутый ML/классификация» для траектории А-модулей, чтобы аудитория МСБ была отскаффолжена.
