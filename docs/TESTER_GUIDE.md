# Mutqin — Tester Guide

A short guide for anyone testing Mutqin without developer help.

> **Local / staging only.** The accounts below come from database seeders. Never use them in production, and never share real user credentials here.

---

## 1. What Mutqin is

Mutqin is a Quran memorisation app. You:

1. Choose a short ayah range.
2. Listen and repeat with structured tools (Focus, Blur, Talqin, and others).
3. Check your recall with AI voice checks.
4. Follow a suggested next step (continue, repeat, revise, or muraja'ah).

The main workspace is **Memorisation** (`/memorisation`). **Dashboard** (`/dashboard`) shows progress, streaks, and muraja'ah items.

---

## 2. How to log in

1. Open the app in your browser (local example: `http://localhost:8000`).
2. Go to **Login** (`/login`).
3. Sign in with **email + password**, or use **Continue with Google** if Google OAuth is configured for that environment.

After login you are taken to the memorisation workspace.

**Tip:** Allow microphone access when the browser asks. AI Recite and AI Memorisation checks need it.

---

## 3. Which account to use

Run seed data first (developers usually do this once):

```bash
php artisan migrate --seed
```

### Recommended starting account

Use this for your first full test:

| Label | Email | Password | Plan | Why use it |
|---|---|---|---|---|
| **Tester — Beginner (EN)** | `layla.beginner@mutqin.test` | `DemoPass1!` | Free | Small Al-Fatiha progress, a saved session, and a “continue” recommendation — good default for most testing |

### Other useful accounts

| Label | Email | Password | Plan | Best for |
|---|---|---|---|---|
| **Tester — Active Learner (Premium)** | `omar.active@mutqin.test` | `DemoPass1!` | Premium | Longer progress, accepted recommendations, revision suggestions |
| **Tester — Muraja'ah & AI Recite** | `fatima.reviser@mutqin.test` | `DemoPass1!` | Premium | AI Recite history, practice plans, muraja'ah-style revision |
| **Tester — Paused Session** | `noah.paused@mutqin.test` | `DemoPass1!` | Free | Resume / welcome-back flow |
| **Tester — Pro (AR)** | `practice03@example.com` | `Practice03!` | Pro | Pro features with Arabic UI |
| **Tester — Pro (EN)** | `practice10@example.com` | `Practice10!` | Pro | Pro features with English UI |
| **Tester — Admin (Pro)** | `admin@mutqin.test` | `AdminPass1!` | Pro | Admin dashboard (`/admin/dashboard`) |

All `@mutqin.test` demo accounts share password **`DemoPass1!`** unless noted above.

Practice accounts `practice01`–`practice15` use password **`PracticeNN!`** (for example `Practice01!` for `practice01@example.com`).

| Label | Email | Password | Plan |
|---|---|---|---|
| **Tester — Free (EN)** | `practice01@example.com` | `Practice01!` | Free |
| **Tester — Premium (FR)** | `practice02@example.com` | `Practice02!` | Premium |

**Minimal account (little demo data):** `test@example.com` / `password`

**Google-only demo (no password login):** `sofia.google@mutqin.test`

---

## 4. What to test first

Do this in order on your first visit:

1. **Sign in** with **Tester — Beginner (EN)**.
2. If you see **Welcome back**, choose **Start new session** (or continue if you are testing resume).
3. Open **Controls** (toolbar) → **Setup** tab.
4. Pick **Surah Al-Fatiha**, ayahs **1–3**, and a reciter.
5. Tap **Start session**.
6. Listen to at least one ayah, then finish the session.
7. On **Session complete**, try **Check memorisation** (AI Memorisation).
8. Review the result and the **Next step** recommendation.
9. Open **Dashboard** and confirm progress updated.
10. Refresh the page — your session and progress should still be there.

---

## 5. Recommended first-time journey

A complete happy path (about 15–20 minutes):

| Step | What to do | Why |
|---|---|---|
| 1 | Sign in | Confirms auth works |
| 2 | Start a memorisation session | Core product flow |
| 3 | Read / listen to ayahs | Confirms audio and text load |
| 4 | Memorise with Talqin or Focus | Confirms practice tools |
| 5 | Finish session → **Check memorisation** | AI Memorisation flow |
| 6 | View result modal | Scores, weak words, next plan |
| 7 | Follow the recommendation | Continue / repeat / revise |
| 8 | Try **AI Recite** on one ayah (Controls → ayah tools) | Separate voice check |
| 9 | Open **Dashboard** → muraja'ah section | Retention / review |
| 10 | Log out, log back in | Persistence and welcome-back |

**First-time onboarding tour:** Pre-seeded accounts skip the full first-run tour and show **Welcome back** instead. To test onboarding, **register a new account** or ask a developer to reset onboarding flags for your test user.

**Revisit the tour:** In memorisation, open the top menu → **Take the tour again**.

---

## 6. How to test AI Recite

AI Recite checks spoken recitation (often per ayah or after a completed range).

1. Start or resume a session with a short range (Al-Fatiha 1–3 is fine).
2. Open **Controls** → **Session** tab (or ayah tools on the active ayah).
3. Tap **AI Recite** / **Start AI recitation check**.
4. Allow the microphone if prompted.
5. Recite the ayah(s) clearly from memory.
6. Wait for processing to finish.

**Success looks like:**

- Words highlight green (correct), yellow (partial), or red (needs work).
- An accuracy score or band (strong / mixed / weak).
- A suggested next action (continue, repeat, practice plan, or revision).

**Also test from session end:** After completing a range, the post-session screen may offer **Check memorisation** or AI-related follow-ups depending on your result.

---

## 7. How to test AI Memorisation

AI Memorisation (shown as **Check memorisation** or **AI Memorisation Checker**) runs after practice to assess recall.

1. Complete a memorisation session (reach the end of your chosen range).
2. On the **Session complete** screen, tap **Check memorisation**.
3. Recite when recording starts.
4. Stop when finished (or when the app auto-stops).

**Success looks like:**

- A **Memorisation check result** with accuracy and weak spots.
- A **Recommended next step** (continue to new ayahs, repeat range, focused practice, etc.).
- Optional **practice plan** if your result was mixed or weak.

To compare: **AI Recite** is often used for a spoken check on a specific ayah; **Check memorisation** is the post-session assessment that unlocks your next plan.

---

## 8. How to test the memorisation flow

### Start a session

1. **Controls** → **Setup**
2. Choose surah, ayah range, reciter, repetitions.
3. Optional: enable **Focus**, **Blur**, or **Talqin** under practice techniques.
4. **Start session**

### During the session

- Play/pause ayah audio.
- Move through the ayah queue.
- Try **Blur** (text hides) or **Talqin** (listen, then your turn).
- End early or complete the full range.

### After the session

- **Session complete** modal appears.
- Options typically include: check memorisation, repeat session, continue to next range, or return to workspace.
- Save the session from **Controls** → **Saved** if you want it in your library.

### Persistence check

1. Note your surah, range, and any progress.
2. Refresh the browser.
3. Log out and log back in.
4. Confirm the same progress and recommendations appear.

---

## 9. How to test retention / Muraja'ah

Muraja'ah is spaced review of ayahs you already memorised.

1. Sign in as **Tester — Muraja'ah & AI Recite** (`fatima.reviser@mutqin.test`) or complete a few sessions on a fresh account.
2. Open **Dashboard**.
3. Look for **Muraja'ah**, **Needs muraja'ah**, or **Retention** sections.
4. Start a review session from a due or weak ayah.
5. In memorisation, check **Controls** → **Saved** → **Completed** sessions for ranges marked for muraja'ah.

**Success looks like:**

- Due or weak ayahs listed on the dashboard.
- Review sessions use **revision** mode.
- Progress moves from “needs review” toward “steady” after successful review.

Retention follows a spaced schedule (1, 3, 7, 14, 30, 60 days) for memorised ayahs.

---

## 10. What results should look like

| Feature | Good result |
|---|---|
| Login | Lands on memorisation or dashboard without errors |
| Audio | Ayah plays; reciter name shown in session stats |
| Session complete | Summary shows ayahs covered, duration, repeats |
| AI Memorisation | Result modal with accuracy, weak words, next plan |
| AI Recite | Colour-coded word feedback and a clear band/score |
| Recommendation | Sensible next range (continue, repeat, or revise) |
| Dashboard | Streak, progress, muraja'ah items match what you did |
| Persistence | Same data after refresh and after logout/login |

---

## 11. Known limitations

These are expected in current builds — report them only if behaviour differs from what is described.

- **Microphone required** — AI checks do not work without browser mic permission.
- **Speech service dependency** — AI voice features need a configured Speechmatics API key on the server. If it is missing, checks may show as unavailable.
- **AI accuracy varies** — Results depend on accent, pace, background noise, and microphone quality. Scores are guidance, not a perfect tajweed audit.
- **Google login** — Works only when Google OAuth credentials are set for that environment.
- **Billing / Stripe** — Subscription checkout uses test keys in development; real charges do not apply locally.
- **Pre-seeded onboarding** — Demo accounts behave like returning users; register a new account to see the full first-time tour.
- **Offline** — Losing connection during an AI check saves progress, but you may need to retry the check when back online.

---

## 12. How to report a problem

Copy this template into your bug report (Slack, GitHub issue, email — whatever your team uses):

```
Feature:
What I did:
What I expected:
What happened:
Browser/device:
Screenshot/video:
Steps to reproduce:
```

**Example:**

```
Feature: AI Recite after session complete
What I did: Finished Al-Fatiha 1–3, tapped Check memorisation, recited ayah 1
What I expected: Result modal with accuracy score
What happened: Spinner never finished; no error message
Browser/device: Safari 17 / iPhone 15
Screenshot/video: attached
Steps to reproduce:
1. Log in as layla.beginner@mutqin.test
2. Start Al-Fatiha 1–3 session
3. Complete session → Check memorisation
4. Recite ayah 1
```

You do **not** need browser console logs or source code for a good report. A clear description and a screenshot or short screen recording are enough.

---

## Test checklist

Use this during a test pass:

- [ ] Login
- [ ] Start memorisation
- [ ] Play Quran audio
- [ ] Record recitation
- [ ] Complete AI Recitation (AI Recite)
- [ ] View result modal
- [ ] Retry
- [ ] Continue
- [ ] Complete AI Memorisation (Check memorisation)
- [ ] View recommendation
- [ ] Review / Muraja'ah
- [ ] Refresh and confirm persistence
- [ ] Logout / login and confirm persistence

---

## Quick reference — URLs

| Page | Path |
|---|---|
| Home | `/` |
| Login | `/login` |
| Memorisation | `/memorisation` |
| Dashboard | `/dashboard` |
| Pricing | `/pricing` |
| Admin (admin account only) | `/admin/dashboard` |
