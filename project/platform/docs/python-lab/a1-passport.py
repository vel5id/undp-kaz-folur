# Учебные примеры: реальные данные хозяйств не используются.
# Измените паспорта и проверьте, какие сведения отсутствуют.
flows = [
    {"name": "Спутниковые сцены", "source": "Sentinel-2 L2A",
     "georeference": "EPSG:32642", "format": "GeoTIFF",
     "storage": "Архив по датам, резервная копия",
     "quality_control": "Маска облаков и сверка дат"},
    {"name": "Агрохимическое обследование", "source": "Лаборатория",
     "georeference": "", "format": "PDF без таблицы измерений",
     "storage": "Папка обследования", "quality_control": "Дубли проб"},
    {"name": "Треки комбайнов", "source": "Бортовой терминал",
     "georeference": "WGS84", "format": "CSV",
     "storage": "", "quality_control": ""},
]
required = ["source", "georeference", "format", "storage", "quality_control"]
issues = {}
for flow in flows:
    missing = [field for field in required if not flow.get(field)]
    issues[flow["name"]] = missing
    print(flow["name"] + ": " + (", ".join(missing) or "все поля заполнены"))

# Важно: заполненность паспорта не доказывает качество данных.
# PDF без таблицы и типичные ошибки координат требуют отдельной оценки.
