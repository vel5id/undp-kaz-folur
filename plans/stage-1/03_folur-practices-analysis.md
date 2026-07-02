# Анализ практик FOLUR и международных программ (FAO, GEF, UNDP) + ИИ-тренды в ГИС-обучении

> Этап 1 «Подготовительный (Аналитика и дизайн)» · Проект UNDP-KAZ FOLUR · Исполнитель: НАО «КРУ им. А. Байтұрсынұлы»
> Роль-владелец: GIS/AI эксперты, методолог. Дата: 2026-07-02.
> Метод: веб-верификация ключевых фактов (ссылки внизу); неподтверждённое помечено `[UNVERIFIED]`.

## 1. Программа FOLUR: что подтверждено

- **FOLUR (Food Systems, Land Use and Restoration) Impact Program** — программа Глобального экологического фонда (GEF) объёмом **$345 млн**, возглавляемая Всемирным банком; цель — трансформация продовольственных систем через устойчивые интегрированные ландшафты и «зелёные» цепочки создания стоимости ([GEF](https://www.thegef.org/sites/default/files/documents/2021-11/gef_food_systems_land_use_restoration_folur_impact_program_2021_11.pdf), [World Bank](https://www.worldbank.org/en/topic/agriculture/brief/the-food-systems-land-use-and-restoration-folur-impact-program), [folur.org](https://www.folur.org/)).
- **Казахстанский страновой проект** реализуется **ПРООН** при финансировании GEF в партнёрстве с **Министерством сельского хозяйства РК**; фокус — широкомасштабное внедрение технологий эффективного землепользования и «зелёные» цепочки стоимости для снижения деградации продуктивных земель и ценных экосистем **ландшафта Северного Казахстана** ([UNDP Kazakhstan](https://www.undp.org/kazakhstan/projects/sustainable-food-systems-and-improved-ecosystems-service), [ProDoc GEF ID 10265](https://www.thegef.org/sites/default/files/documents/10265_Project_Document.pdf)).
- **Пшеница** — ключевая товарная культура проекта (~50% сельхозпроизводства страны); поддерживается кооперационная платформа с экспортёрами и ритейлом по «зелёной пшенице», а также агроэкологические финансовые инструменты (форвардные закупки бобовых, товарный кредит на многолетние травы) ([UNDP news](https://www.undp.org/kazakhstan/news/path-sustainable-agriculture-new-financial-tools-help-restore-kazakhstans-soils)).
- Программа издаёт **каталоги кейсов** (Case Studies Catalogue, Vol. I, декабрь 2025) — готовый источник региональных примеров для лекций ([UNDP FOLUR case studies](https://www.undp.org/sites/g/files/zskgke326/files/2026-01/folur_case_studies_catalogue_volume_i_final_december2025__0.pdf)).

**Выводы для дизайна модулей:** (а) каждый модуль обязан работать на компоненты FOLUR — ILM-политики/потенциал (1), устойчивые практики (2), восстановление (3), развитие потенциала и обмен знаниями (4); (б) пшеничный кейс Северного Казахстана — сквозной; (в) кейс-каталог FOLUR включаем в библиографию модулей.

## 2. Практики программ FAO / GEF / UNDP, принятые к применению

Бенчмарк 14 курсов-аналогов (Coursera, FAO eLearning, NASA ARSET, Spatial Thoughts, ITC, Stepik) дал 30 практик (см. базу навыка `folur-best-practices`); ключевые для архитектуры:

| Практика | Источник-аналог | Как применяем |
|---|---|---|
| Канонический каркас модуля «концепция → инструменты → стимулы/экономика → мониторинг» | FAO SLM | шаблон модуля |
| Метка трудозатрат на каждом уроке, модули 2–2,5 ч | FAO, NASA ARSET | шаблон урока `⏱` |
| Inline-практика «Попробуйте в Colab» после каждой концепции | Spatial Thoughts | admonition-блоки |
| «Проект на ВАШЕЙ земле» — сквозной проект слушателя | Florida | практикумы П-модулей |
| Плотный автопроверяемый банк квизов + сценарный экзамен | Stepik, FAO | тест-движок (Этап 2) |
| Open Badges, порог 75%, QR-верификация сертификатов | FAO eLearning | платформа (Этап 2) |
| Готовые UAV-датасеты («дрон не обязателен») | ITC/Twente | датасеты Zenodo |
| Урок «Границы применимости метода» | Geneva | шаблон урока |
| Офлайн-пакет + PDF-конспект (слабый интернет в сёлах) | FAO | static export MkDocs |

## 3. ИИ-технологии в ГИС-обучении: тренды 2025–2026 (требование заказчика)

Подтверждённый веб-поиском фронтир — **Autonomous GIS / GeoAI-агенты**: ГИС как «искусственный геоаналитик», самостоятельно генерирующий и исполняющий геообработку ([Penn State GIScience, AAG 2026](https://giscience.psu.edu/2026/02/04/autonomousgis_2026aag/), [phys.org](https://phys.org/news/2025-11-frontier-ai-geographic.html)):

- **GIS Copilot** — LLM-ассистент, встроенный в QGIS (генерация инструментов и цепочек геообработки из естественного языка);
- **LLM-Find / GeoColab / Spatial-Agent** — агентные фреймворки поиска геоданных и мультиагентной генерации геокода ([AAG 2026 series](https://giscience.psu.edu/2025/10/02/aag-2026-session-series/), [arXiv: Spatial-Agent](https://arxiv.org/pdf/2601.16965));
- агенты решают до ~86% сложных геозадач в proof-of-concept, **но требуют человеческого контроля** — это встраиваем в обучение как навык верификации результатов ИИ;
- **терминальные кодинг-агенты (Claude Code, OpenCode)** — рабочий инструмент инженера данных: постановка задачи на естественном языке → агент пишет/исполняет Python/GeoPandas/GEE-скрипты, отлаживает пайплайны. `[UNVERIFIED: систематические исследования эффективности именно в агрообразовании отсутствуют — применяем как производственную практику с обязательной верификацией результатов]`

**Проектное решение (сквозной ИИ-слой).** В каждый из 21 модуля встраивается секция **«ИИ-ассистент в работе»** с тремя уровнями (по аудитории):

1. **No-code** (фермер, МСБ): чат-ассистенты для интерпретации NDVI-отчётов, готовые GeoAI-сервисы (OneSoil и аналоги), GIS Copilot в QGIS.
2. **Low-code** (агроном, специалист): Colab + LLM-ассистент для генерации/правки ячеек, промпт-паттерны для геозадач, проверка кода агентом.
3. **Pro-code** (студент, инженер): Claude Code / OpenCode как агент разработки геопайплайнов; ревью и тестирование сгенерированного кода; ограничения и галлюцинации ИИ.

Дидактическая рамка слоя: **«ИИ ускоряет, человек верифицирует»** — каждое ИИ-задание завершается шагом независимой проверки (визуальная сверка с картой, контрольные точки, метрики). Полная раскладка слоя по модулям — в `02_module-architecture.md`.

## 4. Риски и ограничения анализа

- Детали текущего статуса странового проекта FOLUR (бюджетные линии, актуальные KPI ПРООН на 2026) не публикуются в открытом доступе в полном объёме — сверять с куратором ПРООН на согласовании `[UNVERIFIED]`.
- Доступность коммерческих LLM-сервисов и их тарифы для слушателей МСБ в РК меняются; платформа не должна зависеть от конкретного вендора (принцип: любой инструмент слоя заменяем аналогом, включая открытые модели).

## Источники

- https://www.thegef.org/sites/default/files/documents/10265_Project_Document.pdf
- https://www.undp.org/kazakhstan/projects/sustainable-food-systems-and-improved-ecosystems-service
- https://www.undp.org/foodsystems/food-systems-land-use-and-restoration-folur
- https://www.worldbank.org/en/topic/agriculture/brief/the-food-systems-land-use-and-restoration-folur-impact-program
- https://www.undp.org/kazakhstan/news/path-sustainable-agriculture-new-financial-tools-help-restore-kazakhstans-soils
- https://www.undp.org/sites/g/files/zskgke326/files/2026-01/folur_case_studies_catalogue_volume_i_final_december2025__0.pdf
- https://giscience.psu.edu/2026/02/04/autonomousgis_2026aag/
- https://giscience.psu.edu/2025/10/02/aag-2026-session-series/
- https://phys.org/news/2025-11-frontier-ai-geographic.html
- https://arxiv.org/pdf/2601.16965
