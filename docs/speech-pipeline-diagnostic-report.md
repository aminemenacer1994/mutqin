# Speech Pipeline Diagnostic Report

Generated before the speech-pipeline refactor.

## Scope Audited

- `resources/js/components/Memorisation.vue`
- `routes/web.php`
- `tests/js/*`

## Provider Entry Points

- `routes/web.php:123` issues short-lived Deepgram tokens.
- `resources/js/components/Memorisation.vue:8762` builds the Deepgram streaming URL with interim results enabled, endpointing, and utterance-end hints.
- `resources/js/components/Memorisation.vue:8775` opens the Deepgram websocket for both Recite Check and AI Memory.
- `resources/js/components/Memorisation.vue:8864` parses Deepgram streaming result messages.
- `resources/js/components/Memorisation.vue:9033` and `resources/js/components/Memorisation.vue:8121` start browser `SpeechRecognition` fallbacks.

## Direct Transcript Influence Risks

1. **Interim/final stream results can update live Quran word state**
   - `resources/js/components/Memorisation.vue:8889` applies Deepgram entries.
   - `resources/js/components/Memorisation.vue:8909` stores interim transcript text.
   - `resources/js/components/Memorisation.vue:8913` calls live alignment with `getRecitationSpeechFallbackTranscript()`, which concatenates stable and interim text at `resources/js/components/Memorisation.vue:9083`.
   - Impact: interim changes can move live word highlighting, live progress, and auto-stop state.

2. **AI Memory live state is updated from transcript strings**
   - `resources/js/components/Memorisation.vue:8101` tokenizes transcript text and rebuilds live statuses.
   - `resources/js/components/Memorisation.vue:8142` stores interim fallback text.
   - `resources/js/components/Memorisation.vue:8167` concatenates stable and interim AI Memory transcript text.
   - Impact: corrected interim text can change live highlighted words and visible progress.

3. **Current stabilisation helper is append-only and transcript-based**
   - `resources/js/components/Memorisation.vue:8691` filters low-confidence words.
   - `resources/js/components/Memorisation.vue:8707` appends accepted words with only adjacent duplicate handling.
   - Missing safeguards: no segment identity, no supersession handling, no reconciliation with later corrections, no deterministic committed-word state object, no separation between UI interim text and authoritative alignment input.

4. **Final scoring is transcript-based**
   - `resources/js/components/Memorisation.vue:9086`, `resources/js/components/Memorisation.vue:9310`, and `resources/js/components/Memorisation.vue:8287` complete assessments from transcript strings.
   - `resources/js/components/Memorisation.vue:10088` tokenizes `transcript` and passes transcript words into alignment.
   - Impact: same audio can score differently if Deepgram delivers different interim/final transcript timing or if fallback transcript merge timing differs.

5. **Progression state is not owned by a dedicated Quran alignment engine**
   - `resources/js/components/Memorisation.vue:8594` and `resources/js/components/Memorisation.vue:8101` derive live state from transcript tokens.
   - `resources/js/components/Memorisation.vue:8613` can auto-stop based on live statuses generated from transcript text.
   - Impact: transcript revisions can produce jumps, skipped words, repeated progress, or premature completion.

6. **Scoring and recommendations include non-deterministic timestamps**
   - `resources/js/components/Memorisation.vue:10112`, `resources/js/components/Memorisation.vue:10113`, `resources/js/components/Memorisation.vue:10128`, and `resources/js/components/Memorisation.vue:10129` use `Date.now()` / current date inside analysis generation.
   - `resources/js/components/Memorisation.vue:10148` uses current date to compute review due dates.
   - Impact: byte-identical replay does not produce identical result objects.

7. **Session caching is partial**
   - `resources/js/components/Memorisation.vue:8625` stores cached session analysis in IndexedDB.
   - `resources/js/components/Memorisation.vue:9348` and `resources/js/components/Memorisation.vue:8306` write audio blobs, stable words, confidence values, alignment state, and result.
   - Gaps: raw transcript stream, stabilised-word stream, word buffer state, metadata/history, and replay diagnostics are not represented as first-class stores.

8. **Local storage still persists AI analysis history**
   - `resources/js/components/Memorisation.vue:8425` persists current AI Memory session to `localStorage`.
   - `resources/js/components/Memorisation.vue:10176` persists Mutqin session attempts to `localStorage`.
   - Impact: IndexedDB is not the sole persistence layer for speech analysis artifacts.

9. **Browser speech fallback remains active**
   - `resources/js/components/Memorisation.vue:8817` starts fallback recognition when Deepgram closes unexpectedly.
   - This is a second noisy transcript provider. It needs the same stabilisation and Quran-only alignment boundary as Deepgram.

10. **No replay determinism test exists**
    - Existing JS tests cover flow and wiring, but there is no test that runs a recorded speech event/session repeatedly and compares alignment, mistakes, scores, progress, and recommendations.

## Required Refactor

- Treat Deepgram and browser speech as noisy signal providers only.
- Insert a Transcript Stabilisation Layer and Word Buffer before Quran alignment.
- Commit only final or reconciled high-confidence words.
- Feed the alignment engine committed word objects, not raw transcript strings.
- Make Quran tokenization and selected ayah text the single source of truth.
- Move scoring, completion, mistakes, recommendations, and retention signals to alignment-derived output.
- Persist raw stream events, stabilised words, word buffer state, alignment state, confidence values, audio, analysis, metadata, and session history in IndexedDB.
- Add replay tests that prove repeated processing of the same recorded stream yields identical analysis output.
