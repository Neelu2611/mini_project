"""Train diabetes discharge models from UCI 296 using patient-disjoint partitions."""
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile

import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import GroupShuffleSplit
from sklearn.utils.class_weight import compute_sample_weight
from xgboost import XGBClassifier

ROOT = Path(__file__).resolve().parents[1]
archive = ROOT / "Dataset/uci296-public.zip"
with ZipFile(archive) as source, source.open("diabetic_data.csv") as csv:
    data = pd.read_csv(csv, keep_default_na=False)
labels = data.readmitted.map({"NO": 0, ">30": 1, "<30": 2})
assert labels.value_counts().to_dict() == {0: 54864, 1: 35545, 2: 11357}
groups = data.patient_nbr
dev, test = next(GroupShuffleSplit(n_splits=1, test_size=.2, random_state=42).split(data, groups=groups))
a, b = next(GroupShuffleSplit(n_splits=1, test_size=.2, random_state=43).split(dev, groups=groups.iloc[dev]))
train, valid = dev[a], dev[b]
fields = ["age", "time_in_hospital", "number_inpatient", "number_emergency", "discharge_disposition_id",
          "number_outpatient", "num_medications", "number_diagnoses", "insulin", "change"]
design = pd.get_dummies(data[fields].astype({"discharge_disposition_id": str}), prefix_sep="=", dtype=float)
def fit(keys, rows):
    columns = [c for c in design if c.split("=")[0] in keys and design[c].iloc[rows].nunique() > 1]
    model = XGBClassifier(n_estimators=100, max_depth=4, learning_rate=.08, n_jobs=2, random_state=42)
    model.fit(design[columns].iloc[rows].to_numpy(), labels.iloc[rows], sample_weight=compute_sample_weight("balanced", labels.iloc[rows]))
    return model, columns

validation = {}
for count in (5, 10):
    model, columns = fit(fields[:count], train)
    pred = model.predict(design[columns].iloc[valid].to_numpy())
    validation[count] = classification_report(labels.iloc[valid], pred, output_dict=True)["macro avg"]["f1-score"]
keys = fields[:max(validation, key=validation.get)]
model, columns = fit(keys, dev)
pred = model.predict(design[columns].iloc[test].to_numpy())
path = ROOT / "artifacts/diabetes-short-v1.ubj"
model.save_model(path)
metadata = dict(version="Diabetes discharge XGBoost v1", source="https://doi.org/10.24432/C5230J",
                archive_sha256=hashlib.sha256(archive.read_bytes()).hexdigest(), model_sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                fields=keys, columns=columns, allowed={k: sorted(data[k].iloc[dev].unique().tolist()) for k in keys if k in ["age","insulin","change","discharge_disposition_id"]},
                bounds={k: [int(data[k].iloc[dev].min()), int(data[k].iloc[dev].max())] for k in keys if data[k].dtype.kind in "iu"},
                validation_macro_f1=validation, test_encounters=len(test), test_patients=int(groups.iloc[test].nunique()),
                report=classification_report(labels.iloc[test], pred, output_dict=True), confusion_matrix=confusion_matrix(labels.iloc[test], pred).tolist())
(ROOT / "docs/diabetes-short-v1.json").write_text(json.dumps(metadata, indent=2))
print(keys, validation, metadata["report"])
(ROOT / "frontend/src/lib/diabetes-short-v1.json").write_text(json.dumps(metadata, indent=2))
