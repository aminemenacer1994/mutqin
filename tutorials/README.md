# Mutqin product tutorials

Silent, 1080p walkthroughs recorded against the real web app with Playwright and post-processed with FFmpeg.

## How to revise a surah

**Video:** `tutorials/videos/how-to-revise-a-surah.mp4`  
**Automation:** `scripts/tutorials/record-how-to-revise-a-surah.mjs`

### Verified journey

1. Sign in with the Muraja'ah demo account (off-camera in prep; no credentials in the recording).
2. **Dashboard** — Muraja'ah list provides context (`Ayahs to revisit`).
3. **Memorise** — open the workspace via the main nav.
4. **Session setup** — `?setup=1&goal=revise` plus the controls panel.
5. Choose **Revise** → **Al-Ikhlas** → **Full surah** (ayahs 1–4).
6. Tap **Revise** to start a **revision** session on the Madani mushaf.

### Commands

```bash
# Local app (default http://127.0.0.1:8000)
php artisan db:seed --class=DemoDataSeeder   # once, if demo users are missing

npm run tutorial:revise-surah:rehearse       # dry-run, no file output
npm run tutorial:revise-surah                # record + export MP4
```

Optional env: `MUTQIN_BASE_URL`, `MUTQIN_TEST_EMAIL`, `MUTQIN_TEST_PASSWORD` (defaults to `fatima.reviser@mutqin.test` / `DemoPass1!`).
