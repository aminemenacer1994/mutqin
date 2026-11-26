# Teacher UI captures (Nov 2026)

Canonical protected assets live in `resources/marketing/preview-2.0/`. Served only at `/preview/assets/{name}.png` when allowlisted.

| Asset basename | Source capture | UI surface |
|----------------|----------------|------------|
| `overview` | `Screenshot_2026-11-26_at_01.42.10-*` | Teacher overview — class welcome and summary cards |
| `overview-priorities` | `Screenshot_2026-11-26_at_01.42.33-*` | Today's priorities and needs attention |
| `students` | `Screenshot_2026-11-26_at_01.43.09-*` | Students list with AI match and attention filters |
| `assignment-create` | `Screenshot_2026-11-26_at_01.43.48-*` | New assignment modal |
| `assignment-detail` | `Screenshot_2026-11-26_at_01.44.54-*` | Assignment detail for a student |
| `review-detail` | `Screenshot_2026-11-26_at_01.44.38-*` | Wording match review on the Mushaf |
| `learning-plan` | `Screenshot_2026-11-26_at_01.45.11-*` | Create learning plan wizard |
| `messages` | `Screenshot_2026-11-26_at_01.45.40-*` | Private teacher–student messages |
| `parents` | `Screenshot_2026-11-26_at_01.45.49-*` | Parents and guardians invitations |
| `assignments` | `Screenshot_2026-11-26_at_01.46.12-*` | Assignments list with status filters |
| `reviews` | `Screenshot_2026-11-26_at_01.46.47-*` | Recitation history on Reviews |

Refresh marketing PNGs by copying from this folder:

```bash
DEST=resources/marketing/preview-2.0
# … use the filenames above (first matching uuid suffix in this directory)
```