# Mutqin — Tester Guide

A short guide for anyone testing Mutqin without developer help.

> **Tester hosts.** The one-click demo on `/login` appears when `SHOW_DEMO_ACCOUNTS=true` (local, staging, or Laravel Cloud). The accounts below also come from local seeders. Never share real user credentials here.

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
3. When demo login is enabled, tap **Sign in with demo** (one click — no form needed), **or** sign in with email + password / Google.

After login you land on **Memorisation**. Demo accounts and new signups see the workspace **spotlight tour** once (not again on later logins). Replay it anytime from **Take the tour again**. It walks through Welcome → Controls → Setup → Start → practise/End → AI recitation → results (right/wrong words) → recommendation plan → Dashboard.

**Tip:** Allow microphone access when the browser asks. AI Recite and AI Memorisation checks need it.

---

## 3. Which account to use

Run seed data first (developers usually do this once):

```bash
php artisan migrate --seed
```

### Recommended starting account

The login page **Sign in with demo** button uses this account:

| Label | Email | Password | Plan | Why use it |
|---|---|---|---|---|
| **Tester — Beginner (EN)** | `layla.beginner@mutqin.test` | `DemoPass1!` | Pro | One-click demo — Al-Fatiha start plus AI recitation |

### Other useful accounts

(For QA who need a specific data state — enter email/password manually.)

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

### Parent platform (local only)

Requires `MUTQIN_PARENT_FEATURES_ENABLED=true` and an existing child account `menacer72@gmail.com` in your database. Seed the organisation network first so teachers, assignments, and practice exist, then create the guardian:

```bash
php artisan mutqin:seed-organisation-network   # or: php artisan db:seed
php artisan mutqin:seed-parent-demo
```

`php artisan db:seed` already enrols configured anchor students (`menacer72@gmail.com` by default) and plants classroom data, parent reports, and sample parent–teacher messages after the parent demo seeder runs.

| Role | Email | Password | Notes |
|---|---|---|---|
| **Parent (guardian)** | `guardian.menacer@mutqin.test` | `ParentDemo1!` | Opens `/parent` after login |
| **Child (unchanged)** | `menacer72@gmail.com` | *(your existing password or Google)* | Not the parent login |

Do **not** sign in to the parent workspace with `menacer72@gmail.com` unless you have also granted that account the parent role yourself.

A teacher who already teaches a student can open that student and use **Parents & Guardians** to send an invitation. The link only works for the invited email, expires after 7 days, and can be resent or revoked. The child stays hidden until the invitation is accepted. A parent can also create a 30-minute single-use code from **Settings**; the child enters it at `/parent/link-code` while signed in. Teachers cannot approve a guardian link by themselves.

The parent home at `/parent` is a family overview: linked children, homework that needs attention, recent practice, and teacher feedback. The desktop sidebar has Overview, My Children, Homework, Progress, Reports, Messages, AI Learning Assistant, and Settings. On a phone the bottom bar keeps Overview, Children, Homework, Progress, Messages, and Settings. Reports and the assistant stay on the overview and on each child profile so the bar does not clip. Counts come from the linked children’s real assignments and practice, and a child is omitted when that guardian is not approved.

**Learning & Homework** and **Progress** load read-only detail from `/api/parent/children/{id}/assignments`, `/progress`, and `/profile`. Guardians can filter homework by category, status and date range, expand a task for instructions and completion history, and see AI word-match separately from teacher-reviewed results. Recordings appear only when retention policy and guardian progress permission allow them.

**Messages** lets an approved guardian write to a teacher who currently teaches that child. The thread is stored with the existing teacher notes and stays out of the student’s own conversation. Teachers see the parent’s name and the student on the student profile Messages tab. Unread counts and sent/read state are on each thread. A parent can report a message; the report is audited and the teacher is notified without the message text. Revoking the link, removing messaging permission, or reassigning the teacher closes the thread.

Parents choose notification preferences under **Settings**. New homework, deadlines, teacher feedback, teacher replies, and learning updates are on by default. The weekly progress summary is off until the parent turns it on. Notification titles and bodies do not include the child’s name or the passage. Deadline reminders run with `php artisan mutqin:notify-parent-deadlines`. Weekly summaries run with `php artisan mutqin:notify-parent-weekly-summaries`.

The unread badge on Messages comes from the family overview, so opening the home page does not load the inbox twice. A long conversation shows the latest 40 messages, with **Load earlier messages** for the rest. Homework keeps overdue tasks and the latest work; a note appears when older tasks are outside that window.

**AI Learning Assistant** answers suggested or typed questions from homework, progress, plans, and teacher-visible feedback for the selected child or the whole family. It does not copy the question into the answer, does not read private teacher notes or recordings, and does not treat a wording check as a Tajweed grade. The local cap is 20 questions per parent per UTC day.

**Reports** are weekly and monthly snapshots. The family list keeps each child’s homework and practice counts separate and does not average scores. Download saves a printable HTML file; the app does not create a PDF. New-report notices stay off until **Settings → New learning reports** is turned on. Prepare them locally with:

```bash
php artisan mutqin:generate-parent-reports --sync --cadence=week
php artisan mutqin:generate-parent-reports --sync --cadence=month
```

The scheduler runs those same commands, with `--sync`, on Mondays at 08:30 UTC and on the 1st at 08:45 UTC. It writes the snapshots in the scheduler process, so a queue worker is not required. A second run for the same child and period updates the snapshot instead of adding another row.

**Beta scenarios for a teacher, a parent, and a student**

1. Teacher opens a student and invites a guardian. The invited email can accept. A different account cannot. An expired or revoked invitation does not reveal the child.
2. Two approved guardians on one child each see only the permissions on their own link.
3. Parent opens Homework, Progress, Messages, the assistant, and Reports for an approved child. The same parent receives not found for another family’s child, a revoked link, or a download of that child’s old report.
4. Student completes or leaves a task. The parent’s homework list and the next report use that status. The parent cannot edit the student’s work.
5. Assistant answer for overdue homework names only that child’s shared tasks. A private teacher note does not appear. After the daily cap, the assistant refuses another question.
6. Use **Send Feedback** in the account menu. That is the existing feedback form (`/api/feedback`) and is the beta feedback channel. Do not include a child’s full record in the message.

### Interconnected platform demo (local only)

This is separate from `php artisan db:seed`. It creates 5 teachers, 15 students and 8 parents with current and completed assignments, three-step learning plans, muraja'ah plans, revision suggestions, sample parent–teacher threads, and several weeks of synthetic progress (dates anchor to today). It refuses to run in production and will not replace an account that lacks the platform-demo marker.

```bash
# Set a local password first. The command never prints it.
# MUTQIN_PLATFORM_DEMO_PASSWORD=your-local-demo-password
php artisan mutqin:seed-platform-demo
```

Use the **same password** for every platform-demo account: your local `MUTQIN_PLATFORM_DEMO_PASSWORD` (for many developers this is `PlatformDemo1!` in `.env`). The seeder prints **names and emails only**, not the password.

| Role | Name | Email | Where to open |
|---|---|---|---|
| Teacher | Hana Yusuf | `platform.demo.teacher.01@mutqin.test` | `/teacher` — overview, students, assignments, reviews |
| Teacher | Bilal Karim | `platform.demo.teacher.02@mutqin.test` | `/teacher` |
| Teacher | Maryam Noor | `platform.demo.teacher.03@mutqin.test` | `/teacher` |
| Teacher | Yusuf Adeel | `platform.demo.teacher.04@mutqin.test` | `/teacher` |
| Teacher | Layla Farid | `platform.demo.teacher.05@mutqin.test` | `/teacher` |
| Student | Adam Nasser | `platform.demo.student.01@mutqin.test` | `/dashboard` — practice history, assignments |
| Student | Ayah Malik | `platform.demo.student.02@mutqin.test` | `/dashboard` |
| Student | Yusuf Hussein | `platform.demo.student.03@mutqin.test` | `/dashboard` |
| Student | Fatima Qadir | `platform.demo.student.04@mutqin.test` | `/dashboard` |
| Student | Ibrahim Adel | `platform.demo.student.05@mutqin.test` | `/dashboard` |
| Student | Khadija Saleh | `platform.demo.student.06@mutqin.test` | `/dashboard` |
| Student | Omar Amin | `platform.demo.student.07@mutqin.test` | `/dashboard` |
| Student | Maryam Rashid | `platform.demo.student.08@mutqin.test` | `/dashboard` |
| Student | Hassan Tariq | `platform.demo.student.09@mutqin.test` | `/dashboard` |
| Student | Zainab Nabil | `platform.demo.student.10@mutqin.test` | `/dashboard` |
| Student | Hamza Suleiman | `platform.demo.student.11@mutqin.test` | `/dashboard` |
| Student | Hana Farid | `platform.demo.student.12@mutqin.test` | `/dashboard` |
| Student | Ismail Jamil | `platform.demo.student.13@mutqin.test` | `/dashboard` |
| Student | Aisha Nur | `platform.demo.student.14@mutqin.test` | `/dashboard` |
| Student | Anas Khalil | `platform.demo.student.15@mutqin.test` | `/dashboard` |
| Parent | Sara Qadir | `platform.demo.parent.01@mutqin.test` | `/parent` — children: Adam, Ayah, Yusuf |
| Parent | Omar Nabil | `platform.demo.parent.02@mutqin.test` | `/parent` — Fatima, Ibrahim |
| Parent | Amina Saleh | `platform.demo.parent.03@mutqin.test` | `/parent` — Khadija, Omar, Maryam |
| Parent | Hassan Idris | `platform.demo.parent.04@mutqin.test` | `/parent` — Hassan, Zainab |
| Parent | Fatima Zahra | `platform.demo.parent.05@mutqin.test` | `/parent` — Hamza, Hana |
| Parent | Ibrahim Sami | `platform.demo.parent.06@mutqin.test` | `/parent` — Ismail, Aisha, Anas |
| Parent | Khadija Harun | `platform.demo.parent.07@mutqin.test` | `/parent` — Adam, Khadija (two guardians on Adam) |
| Parent | Zayd Noor | `platform.demo.parent.08@mutqin.test` | `/parent` — Zainab, Anas |

**What you should see after seeding:** teacher dashboards list authorised students with mixed assignment states (upcoming, in progress, overdue, with the teacher, completed), synthetic AI word-match scores on some students, learning plans on students 1–5, and teacher feedback notes. Parent dashboards mirror approved children only, with homework counts, recent practice in the last 30 days, and feedback excerpts. Student dashboards show memorisation progress and session history spread across several weeks. Dates are anchored to **today** whenever you re-run the seeder, so lists stay current.

---

## 4. What to test first

Do this in order on your first visit:

1. **Sign in** with **Sign in with demo** (or **Tester — Beginner (EN)** manually).
2. Follow the floating **Where to go in Mutqin** guide (or minimize it). If you see **Welcome back**, choose **Start new session** (or continue if you are testing resume).
3. Open **Controls** (toolbar) → **Setup** tab.
4. Pick **Surah Al-Fatiha**, ayahs **1–5**, and a reciter.
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

1. Start or resume a session with a short range (Al-Fatiha 1–5 is fine).
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

### Device / room cases (before launch)

Use a real phone. Fill Pass / Fail / Blocked on [recitation-device-qa.md](./recitation-device-qa.md).

| Case | What to try | Success looks like |
|---|---|---|
| Mic denied | Start AI Recite, tap Don’t Allow | Help + retry; no score saved |
| Quiet room | Recite Al-Fatiha 1:2 clearly | Mostly green; strong / high score |
| Noisy room | Same ayah with TV or talk nearby | Check finishes; no freeze; may be developing |
| Pause between ayahs | Finish 1:1, wait ~2 seconds, recite 1:2 | Next ayah still colours; pause is not “skipped ayah” |
| Live colours | Watch words while speaking (AMD) | Colours update during recitation, not only at the end |

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
- **Daily AI voice-check limit** — The server caps Speechmatics token mints per user and across all testers each UTC day. When the cap is reached, AI Recite / Check memorisation shows a “try again tomorrow” message (browser speech may still work). Ask the operator to raise `SPEECHMATICS_DAILY_*` in `.env` if the group is blocked too early.
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
What I did: Finished Al-Fatiha 1–5, tapped Check memorisation, recited ayah 1
What I expected: Result modal with accuracy score
What happened: Spinner never finished; no error message
Browser/device: Safari 17 / iPhone 15
Screenshot/video: attached
Steps to reproduce:
1. Log in as layla.beginner@mutqin.test
2. Start Al-Fatiha 1–5 session
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
- [ ] Device pass: quiet / noisy / pause / live colours ([recitation-device-qa.md](./recitation-device-qa.md))
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
