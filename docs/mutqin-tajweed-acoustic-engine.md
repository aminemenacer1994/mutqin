# MUTQIN 2.0 — AI Tajweed & Makharij Assessment Engine

**Status:** Research complete · Experimental pipeline (Phase 3) scaffolded · Production detectors gated  
**Date:** 2026-11-27  
**Riwayah scope (validated):** Hafs ʿan ʿĀṣim only unless otherwise noted

---

## 1. Executive summary

Mutqin’s **wording assessment** (Speechmatics + client alignment) is mature and must remain unchanged. **Tajweed / Makharij acoustic assessment does not exist in production** today; the closest in-repo capability is `tajweed_practice_check` — **timing-based madd hold hints** using Speechmatics word timestamps and coloured-mushaf metadata (explicitly **not** Tajweed grading; see `TeacherTajweedPracticeEvidence`).

**Recommendation:** Hybrid architecture:

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Wording / memorisation | **Keep Speechmatics** (existing) | Proven integration, quotas, teacher evidence |
| Phoneme recognition | **Quran Lab TajweedFormer V4 (browser SDK)** or **HisnLabs tajweed-v2 (async ONNX worker)** | Only options with **published** phoneme-level evals and no LM “autocorrect” |
| Rule / duration scoring | **Mutqin rule engine** (PHP + existing tajweed metadata) | Teacher verification, confidence, abstention |
| Commercial API (optional) | **Qurani.ai Nabr** | Real tajweed API, subscription, sends audio URL off-device |

Do **not** infer pronunciation correctness from Speechmatics transcript accuracy alone.

---

## 2. Competitor & technology comparison matrix

Verified 2026-11-27 from public docs, model cards, and help centres. “Marketing” cells are flagged.

| Product / model | Exists & accessible | Phoneme-level | Tajweed rules claimed | Timestamps | Real-time | Published validation | API / integration | Licensing / cost | Mutqin fit |
|-----------------|---------------------|---------------|------------------------|------------|-----------|----------------------|-------------------|------------------|--------------|
| **Quran Lab TajweedFormer V4** | Yes — [HF card](https://huggingface.co/Quran-Lab/tajweedformer-v4), [SDK](https://sdk.quranlab.ai) | Yes (streaming) | Madd, shaddah, ghunna, qalqalah outputs; app builds scoring | Yes, 320 ms chunks | On-device streaming | PER ~1.5% (600-clip benchmark); rule-level tables on HF | **SDK only** (no weight download); free for apps (NPL-1.3) | On-device inference; no cloud fee | **Strong** — mirror Speechmatics client pattern |
| **Zipformer p-arabic v3** | Yes — HF weights | Yes (CTC) | Encoded in 251-symbol alphabet | Streaming | Yes / offline ctx | PER 1.43–9.1% by set; warns ikhfāʾ deviation blind spot | Downloadable weights | Open (Quran Lab) | Good **server** baseline; needs scorer |
| **HisnLabs tajweed-v2** | Yes — HF + GitHub | Yes + 10 sifāt heads | Madd, ghunnah, ikhfāʾ, iqlāb, idghām, qalqalah; `imam.py` rule engine | Per-symbol time | Async (~28 ms / 4 s CPU int8) | 7% PER QDAT learners; madd ±1 count 95.9% | ONNX + Python; **no** turnkey HTTP | Open weights; self-host | **Strong async worker** for Laravel queue |
| **Qurani.ai Nabr (QRC)** | Yes — [docs](https://qurani.ai/en/docs/2-advanced-tools/qrc/streaming) | Partial (`letter_mistakes`) | `tajweed_mistakes` at level 1 | Word-level; graded after confirm | WebSocket + offline POST | Not independently published | Commercial API key | Subscription; audio URL to their servers | Feasible **vendor** path; privacy review |
| **Tarteel** | App only | No public phoneme API | **Explicitly no Tajweed detection** (help centre) | Word | App | Wording/memorisation | **No public API**; QUL data downloads | Pro subscription | Metadata only |
| **Tilawa** | App | Unknown depth | Words + rules (marketing) | Word | Cloud | App store ratings only | No public API | Subscription | Competitor UX reference |
| **Shaikhy** | App / web demo | Claimed letter-level | Broad rule list on site | Word | Async upload | Self-reported | No public API | Subscription | Competitor; no integration |
| **TajweedMate** | App | Offline SR (opaque) | Lessons + record-compare | Unclear | Offline | Small review base | No API | Free app | Weak validation signal |
| **TBOGamer wav2vec2-quran-phonetics** | HF | Word-level phonetic CTC | Research / alignment | CTC | Batch | 99.8% on **word clips** (in-domain) | HF weights | Open | **Not** for tajweed grading (card disclaimer) |
| **fryad quran-phoneme-ctc-small** | HF | 42 phonemes | Limited | CTC | Batch | Small vocab | HF | Open | Legacy baseline only |

**Strongest technical + commercial path for Mutqin:** TajweedFormer V4 (client) **or** HisnLabs v2 (worker) + in-house rule engine + **mandatory teacher verification**. Optional Nabr for faster time-to-market if legal/privacy approved.

---

## 3. Mutqin architectural audit (existing)

| Capability | Status | Location |
|------------|--------|----------|
| AI wording match | **Working** | `RecitationAssessmentService`, `QuranAlignmentService`, Speechmatics JS |
| Word timestamps | **Partial** | Stored when Speechmatics provides them; `TeacherRecitationWordEvidence` |
| Tajweed-coloured mushaf | **Working** | QPC Madani + `arabic_tajweed` client-side |
| Timing-based practice aid | **Working** | `resources/js/scripts/tajweedPracticeCheck/*` → `tajweed_practice_check` in `recognition_data` |
| Teacher playback & review | **Working** | `TeacherRecitationPlaybackService`, word coaching |
| Acoustic Tajweed grading | **Missing** | — |
| Phoneme ASR | **Missing** | — |

**Preserved:** Speechmatics path, assessment quotas, idempotency, audio privacy modes (`config/mutqin.php` `audio_privacy`).

---

## 4. Recommended target architecture

```
[Browser]  Speechmatics (words) ─────────────────────────► existing assessment POST
              │
              ├─ (optional flag) TajweedFormer V4 SDK ──► phoneme_json in POST extension
              │
[Server]   RecitationAssessmentService (unchanged scoring)
              │
              └─ (flag) ProcessAcousticTajweedAssessmentJob
                        ├─ AudioQualityGate (reuse policy fields)
                        ├─ PhonemeRecognitionProvider (null | hisnlabs_cli | future: quran_lab_payload)
                        ├─ MaddDurationDetector (Priority 1)
                        ├─ BasicPhonemeSubstitutionDetector (Priority 1, needs phonemes)
                        └─ acoustic_tajweed_assessments row (experimental)
              │
[Teacher]  playback: experimental section + existing practice aid (unchanged labels)
```

**Independence:** `overall_accuracy` remains **wording-only**. Acoustic findings use separate categories (`wording` | `tajweed` | `makharij` | `pronunciation` | `fluency`).

---

## 5. Model selection justification

| Approach | Verdict |
|----------|---------|
| Replace Speechmatics | **Rejected** |
| Commercial API only | **Fallback** (Nabr) — cost + privacy |
| Open model + rules | **Preferred** (HisnLabs / TajweedFormer + Mutqin rules) |
| Train from scratch | **Rejected** (cost, data, timeline) |

**Primary pick:** **TajweedFormer V4** for phoneme stream (when SDK registered) + **HisnLabs v2** for server-side validation and teacher tooling where browser SDK is not yet wired.

---

## 6. Implemented proof of concept (this pass)

| Item | Description |
|------|-------------|
| Feature flag | `MUTQIN_ACOUSTIC_TAJWEED_ENABLED` (default **false**) |
| Table | `acoustic_tajweed_assessments` |
| Pipeline | `App\Services\TajweedAcoustic\*` |
| Job | `ProcessAcousticTajweedAssessmentJob` (async, idempotent) |
| Detectors | **Madd duration** (timing + practice segments); **phoneme substitution** (only with provider output) |
| Provider | `null` (default); `hisnlabs_cli` optional experimental script |
| Teacher UI | Collapsible **experimental** block on playback (when enabled + data present) |
| Tests | `tests/Feature/AcousticTajweedAssessmentTest.php` |

**Not implemented (honest):** ghunnah, shaddah, qalqalah acoustic detectors, Makharij, student-facing auto-grades, TajweedFormer SDK wiring.

---

## 7. Supported vs unsupported Tajweed rules (engine)

| Priority | Rule | Status |
|----------|------|--------|
| P1 | Madd duration (relative timing) | **Experimental** — timing + metadata; not phoneme-verified unless provider on |
| P1 | Basic phoneme substitution | **Gated** — requires phoneme provider; else `unassessable` |
| P2 | Ghunnah, shaddah, qalqalah | **Not implemented** |
| P3 | Ikhfa, idgham, izhar, iqlab, tafkheem/tarqeeq | **Not implemented** |
| P4 | Makharij, sifāt, waqf/ibtida | **Not implemented** |

---

## 8. Evaluation results

**No new acoustic detector benchmarks were run in this pass** (no phoneme weights deployed in CI).

Existing regression evidence:

- `tests/js/tajweed-practice-check.test.mjs` — timing/gating logic for practice aid
- `tests/Feature/TeacherRecitationPlaybackTest.php` — practice suggestion surfaced to teachers
- `docs/recitation-pipeline-audit.md` — Speechmatics **cannot** establish tajweed correctness

**Threshold policy:** Do not enable student-facing acoustic grades until teacher-labelled precision/recall agreed per rule (Phase 8).

---

## 9. Infrastructure & inference cost estimates

| Deployment | Rough cost |
|------------|------------|
| TajweedFormer V4 on-device | **$0** marginal; one-time SDK/model download per device |
| HisnLabs int8 on Laravel queue worker (2 CPU) | ~**$0.0001–0.001** per 10 s clip (CPU); no GPU |
| Qurani.ai Nabr | Commercial per-minute (quote from vendor); egress + storage for `audio_url` |
| Speechmatics (existing) | Unchanged |

Concurrent assessments: prefer **async queue**; target p95 job latency &lt; 30 s for single-ayah clip on shared worker.

---

## 10. Datasets & licensing (usable)

| Dataset | Use | Notes |
|---------|-----|-------|
| Quran Lab 600-clip benchmark | Eval only | Public leaderboard |
| QDAT (learners) | Cited by HisnLabs / TajweedFormer | Check license per model card |
| EveryAyah / QUL | Reference audio | Reciter audio, not learner mistakes |
| Buraaq/quran-md-words | Phoneme research | Word-level; not full ayah tajweed |
| Private Mutqin recordings | **Eval only with consent** | Never train without authorisation |

---

## 11. Remaining blockers

1. TajweedFormer SDK integration + HF signup for Mutqin app id  
2. Teacher-labelled validation set (inter-annotator agreement)  
3. Persist `arabic_tajweed` server-side or fetch canonical tajweed text for server-only madd  
4. ONNX worker ops on Laravel Cloud (container sidecar or separate service)  
5. Legal review for Qurani.ai or other third-party audio processing  
6. Confidence calibration per rule  

---

## 12. Prioritised roadmap

1. Wire TajweedFormer V4 SDK in browser (feature flag); attach phoneme payload to assessment  
2. Deploy HisnLabs worker in staging; compare phoneme alignments vs SDK  
3. Teacher verification API (confirm / dismiss / correct) on `acoustic_tajweed_assessments`  
4. Priority 2 detectors behind per-rule flags  
5. Personalised corrective assignments from **verified** mistakes only  
6. Student UI: hidden until validation thresholds met  

---

## 13. Changed files (this pass)

See git status for: `config/mutqin.php`, `.env.example`, `app/Services/TajweedAcoustic/*`, `app/Jobs/ProcessAcousticTajweedAssessmentJob.php`, `app/Models/AcousticTajweedAssessment.php`, migration, `RecitationAssessmentService.php`, `TeacherRecitationPlaybackService.php`, `TeacherAcousticTajweedEvidence.php`, teacher Vue + locales, tests, `scripts/experimental/hisnlabs_phoneme_infer.py`.

---

## 14. References

- [TajweedFormer V4 model card](https://huggingface.co/Quran-Lab/tajweedformer-v4)  
- [HisnLabs tajweed-v2](https://huggingface.co/Hisnlabs/tajweed-v2)  
- [Qurani.ai QRC streaming](https://qurani.ai/en/docs/2-advanced-tools/qrc/streaming)  
- [Tarteel — no Tajweed detection](https://support.tarteel.ai/en/articles/12414457-tarteel-is-not-recognising-my-tajweed-mistakes)  
- Internal: `docs/recitation-pipeline-audit.md`, `docs/mutqin-2.0-audit.md`