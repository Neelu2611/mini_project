# Feature schema

The [verified machine-readable schema](../backend/app/schemas/features.json) lists all 47 required inputs in fitted order. Its artifact hash identifies the original bundle. Notebook cells 13 and 171 provide source types, cells 21 and 169 provide missing-value rules, and cell 31 defines the class mapping.

| Field group | Verified handling |
|---|---|
| 36 categorical strings | Use the exact fitted category values, including case, punctuation and leading or trailing whitespace where present. Diagnosis codes remain strings. |
| 11 integer fields | Keep integer values through the model input frame. The fitted transformer passes them through in order. The mapping file provides reference labels for the three ID fields. Training-set ranges and code coverage are deferred. |
| Two nullable lab fields | Normalize explicit null to `Not measured` before transformation. |
| Seven fields with literal question marks | Preserve `?` in race, weight, payer, specialty and the three diagnosis fields. These tokens occur in the fitted vocabularies. |

The transform yields 2,396 columns. Prediction probabilities follow fitted class order `0, 1, 2`, corresponding to `NO`, `>30`, and `<30`. See the [Phase 2 report](PHASE_2_REPORT.md) for independent inference results.
