# Recitation device QA (Speechmatics + AI Recite)

Automated fixtures prove alignment math. This pass proves **live Speechmatics** on real mics. Do not mark launch complete until the iPhone Safari and Android Chrome cells below are filled on staging.

Related: [production-qa.md](./production-qa.md), [TESTER_GUIDE.md](./TESTER_GUIDE.md), [speechmatics-capacity.md](./speechmatics-capacity.md).

## Before you start

- Staging account: **Tester — Beginner (EN)** or **Sign in with demo** ([TESTER_GUIDE.md](./TESTER_GUIDE.md)).
- Plan must allow AI Recite (Pro / demo Pro).
- Allow the microphone when the browser asks.
- Short range: **Al-Fatiha 1–4** (or ayah 1 only for AI Recite).

Record each cell as **Pass**, **Fail**, or **Blocked**. Fail notes must include device, browser, room, and what the UI showed (band, colours, toast).

## Device matrix

| Case | What to do | Expected | iPhone Safari | Android Chrome | Desktop Chrome |
|---|---|---|---|---|---|
| Mic permission denied | Start AI Recite, deny mic | Guidance + retry; **no** scored attempt / progress write | Manual | Manual | Automated (`recording-resilience`) |
| Quiet room | Recite 1:2 clearly, pause ~1s between words | Green words, **strong** or high 80s+; live AMD paints as you speak | Manual | Manual | Manual |
| Noisy room | TV / conversation nearby, still recite 1:2 | Completes; may drop to developing or show noise guidance — must **not** freeze or save silence as practice | Manual | Manual | Manual |
| Pause between ayahs | Recite 1:1 then wait ~2s, then 1:2 | Pause is hesitation, not a missing ayah; next ayah still paints | Manual | Manual | Manual |
| AMD live paint | Watch colours during recitation (not only the final modal) | Words turn green/amber/red **while speaking**; cursor does not thrash backwards | Manual | Manual | Manual |
| Lock / background | Start Recite, lock 10s, resume | Session recoverable; no duplicate scored attempt | Manual | Manual | — |

## Pass rules

- **Critical fail:** silence or denied mic updates mastery / spaced retention.
- **High fail:** no learner-facing error when Speechmatics times out or the cap hits; live paint frozen for the whole ayah with an open websocket.
- **Non-blocking:** score a few points lower in noise than in a quiet room.

## After a Fail

Paste a **redacted** final `AddTranscript` (words + confidence only) into `tests/js/fixtures/recitation-captured-sessions.mjs` with an agreed `expectedAccuracy`, then run:

```bash
node --experimental-vm-modules tests/js/recitation-captured-sessions.test.mjs
npm run audit:recitation-scenarios
```
