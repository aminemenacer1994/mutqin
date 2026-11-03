# AI recitation pipeline audit

Test date: 3 November 2026. The live-provider tests below used public Al-Ikhlas recitations by Mishari Alafasy and Abdul Basit from [EveryAyah](https://everyayah.com/). They used the configured Speechmatics account and streamed mono 16 kHz PCM at real-time speed. The altered clips were made by joining or cutting the public audio; they are not recordings of people intentionally making mistakes.

## Findings and changes

- Historical local logs also contain Speechmatics usage-cap warnings and two token requests that failed before a response; these are separate from the code defects below and do not establish the state of production.
- The existing socket-disconnect identity check compared a Vue proxy with the original provider object. While adding a stale-callback guard during this work, the same identity issue initially caused incoming transcripts to be discarded. Provider instances now retain their identity; a real browser run verifies that transcripts reach scoring and persistence.
- The workspace assessment stopped and cleaned up its recording before Speechmatics had finished its final transcript. It now flushes captured PCM, sends `EndOfStream`, waits for `EndOfTranscript`, and only then scores. Interruptions, audio overflow, duration-limit warnings, malformed responses and timeouts cannot produce a successful assessment.
- The PCM bridge used to discard older audio after about a second. Startup/network audio is now bounded to 15 seconds, with overflow explicitly invalidating the attempt. Capture runs in an AudioWorklet when available and retains a ScriptProcessor fallback.
- Transcript histories were repeatedly deep-copied. Partial-event diagnostic history is now bounded and previous immutable words are not cloned. Final alignment uses two cost rows and byte-sized backtracking directions; expensive word comparisons are cached. Long final workspace assessments run in a Web Worker when available.
- Word comparison treated arbitrary alifs, articles and conjunctions as optional, making different spoken words match. It now retains those differences, while keeping a small set of standard Arabic spelling variants. Approximate compound-word expansion could rewrite mismatched words to expected words; only exact compound forms are expanded.
- Distinct repeated words are retained, and an unambiguous adjacent repeated phrase no longer borrows a shared word from the next ayah. Low-confidence final tokens are preserved for uncertain alignment. Confirmed omissions use the black/omitted result colour. The backend handoff preserves amber substitutions and uncertainty.
- The dashboard recorder now requires a complete Speechmatics stream, reports failures, cancels stale starts, displays progressive recognition and avoids duplicating the final recording chunk.

## Real Speechmatics checks

Times are elapsed from starting the probe, including token mint and connection. “Finish” is the time after the last audio was transmitted until `EndOfTranscript`. These are individual observations, not a benchmark or general accuracy estimate.

| Audio | First partial | First final | Finish | Observed outcome |
|---|---:|---:|---:|---|
| Alafasy, 112:1–4, intact | 754 ms | 1,436 ms | 135 ms | 15/15 expected words; no extra |
| Same, ayah 2 removed | 648 ms | 1,346 ms | 148 ms | Both ayah 2 words marked missing; other 13 matched |
| Same, ayah 1 repeated | 626 ms | 1,304 ms | 154 ms | Four-word repeated span identified; after alignment fix the next ayah is attached to its own audio positions |
| Same, 1.25× playback | 660 ms | 1,046 ms | 152 ms | 15/15 expected words; no extra |
| Abdul Basit, 112:1–4, intact | 687 ms | 1,798 ms | 138 ms | Expected words matched, but Speechmatics inserted an extra `به`; false positive remains |
| Edited word replacement | 716 ms | 1,823 ms | 148 ms | Target word was flagged, but adjacent words were also misrecognised; the clip does not establish reliable single-word accuracy |
| Edited word removal | 645 ms | 2,129 ms | 180 ms | Speechmatics also dropped the adjacent word, so two words were marked missing instead of one |
| Edited word repetition | 747 ms | 1,478 ms | 161 ms | Speechmatics returned a two-word restart; the intended single-word repeat was not isolated |

The live-browser test used Chromium's file-backed microphone, the actual app, the real provider, and an isolated local SQLite database. The intact take received 33 partial and 15 final messages, saved a 100% assessment and attempt, uploaded its audio, and displayed 15/15. The skipped-ayah take received 29 partial and 14 final messages, saved an 87% assessment and attempt, and displayed 13/15 with both omitted words and ayah 2 as the weak area. An edited wrong-word browser take was saved at 83%, but Speechmatics transcribed the opening as `نص ما`: the app marked both `قل` and `هو` missing and recorded two extras, so it did not correctly isolate or classify the intended replacement. Replaying the same recognised words after the short-word fix marks both opening words as incorrect. A further browser run on the final build saved 84% and flagged the intended replacement, but also incorrectly flagged the first word because Speechmatics returned `الله الصمد` for the opening: the upstream recognition error remains a false positive. These recordings were not used to update any real user's data. Separate real-browser checks with silent microphone input and a blocked token request both showed a retry message and created no assessment or attempt. A Chromium AudioWorklet check received 33 frames and flushed the final frame. One Peek click while recording took 152 ms; this is not a full responsiveness benchmark.

A synthetic transcript-only local measurement on this machine took approximately 1,820 ms for a 200-word alignment before the changes and 118 ms afterwards. A separate 500-word alignment took 475 ms on the main thread; a real Chromium worker processed a 200-word controlled transcript in 120 ms while seven animation frames ran. These figures are single runs and depend on passage and device.

## Coverage and limitations

- The 20 repository transcript scenarios passed their client/server expected outcomes and score-parity audit. They exercise controlled text inputs, not provider recognition accuracy.
- The samples above do not cover enough voices, dialects, noise conditions, pauses or deliberately misrecited words to measure word-error rate, false-positive rate or failure rate. Speechmatics hallucinations and omissions can still be mistaken for learner errors. No transcription-only system can establish pronunciation or tajweed correctness from this evidence.
- Desktop, tablet and iPhone-sized Chromium smoke checks passed using an isolated local account. Physical mobile devices, permission denial, sustained network interruption and production authenticated recording need further hands-on checks. The deployed build must be separately verified after release; local changes are not deployed by this audit.
- Repository-wide JavaScript: 203/209 files passed in the sandbox while the build was running; three of those failures passed on rerun after the build or with network access. Three unrelated files still fail: `ai-review-details`, `mutqin-controls-wiring`, and `mutqin-flow`. Full PHP: 1,020 passed and two unrelated failures remain in `SeoCatalogTest` and `AuthPageRenderTest`. Targeted PHP recitation, Speechmatics and persistence tests passed: 179 tests and 811 assertions against isolated test databases.
- The public production health endpoint at `https://app.mutqin.ai/health` returned HTTP 200 and `{"status":"degraded"}` on this audit date; its public response did not identify the failing dependency. No authenticated production recording was performed.
