# Учебный пример. По умолчанию данные синтетические.
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import accuracy_score, ConfusionMatrixDisplay
rng = np.random.default_rng(42)
groups = np.repeat(np.arange(60), 6)
y = groups % 3
season = np.linspace(0, 1, 8)
centers = np.array([0.25 + 0.3 * np.sin(np.pi * season), 0.2 + 0.45 * np.sin(np.pi * (season + 0.1)), 0.3 + 0.2 * np.cos(np.pi * season)])
X = centers[y] + rng.normal(0, 0.035, (len(y), 8))
tr, te = next(GroupShuffleSplit(n_splits=1, test_size=0.3, random_state=11).split(X, y, groups))
models = {'Random Forest': RandomForestClassifier(n_estimators=40, random_state=42, n_jobs=1), 'Gradient Boosting': GradientBoostingClassifier(n_estimators=30, random_state=42)}
rows = []
for name, model in models.items():
    model.fit(X[tr], y[tr])
    rows.append([name, accuracy_score(y[te], model.predict(X[te]))])
metrics = pd.DataFrame(rows, columns=['модель', 'accuracy'])
display(metrics)
fig, ax = plt.subplots(figsize=(5, 4))
ConfusionMatrixDisplay.from_predictions(y[te], models['Random Forest'].predict(X[te]), ax=ax, colorbar=False)
ax.set_title('Синтетические проверочные поля')
display(pd.DataFrame({'месяц': np.arange(1, 9), 'важность_RF': models['Random Forest'].feature_importances_}))
print('Метрики относятся к синтетическим данным, не к реальной точности мониторинга.')
