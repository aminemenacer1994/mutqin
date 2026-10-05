# Mutqin keyword map and SEO architecture

Phase 2 planning only. **Do not mass-generate pages from this file.** Add a URL to `SeoCatalog` and the sitemap only when the page has real copy.

Related: [Technical SEO](seo.md), [SEO content system](seo-content.md). Reserved empty prefix: `/quran-memorization/*`. Live prefixes: `/features/*`, `/guides/*`, `/tools/*` (catalogued URLs + file-based articles under `/guides/{slug}`).

## Inventory of what already exists

Inspected: `routes/web/app.php`, `routes/web/marketing.php`, `SeoCatalog`, homepage/about/pricing/mission copy, and in-app features (workspace, dashboard, AI Recite, Ask Mutqin / Find an ayah, Mutashābihāt, Hifz plan API, Madani/Indopak Mushaf, spaced review / recommendations).

### Indexable today (do not clone these intents)

| URL | Canonical host | Already owns | Do not create |
|-----|----------------|--------------|---------------|
| `/` | `mutqin.ai` | **Quran memorization app**, Hifz app, memorize Quran (commercial), Quran memorization (commercial) | `/hifz-app`, `/quran-memorization-app`, `/memorize-quran` |
| `/waiting-list` | `mutqin.ai` | Early access conversion | Extra “join Mutqin” landers |
| `/pricing` | `app.mutqin.ai` | Free vs Pro, plan cost | `/free-quran-memorization-app` as a thin duplicate |
| `/about` | `app.mutqin.ai` | Brand / “what Mutqin is” | Second about page |
| `/our-mission` | `app.mutqin.ai` | Why Mutqin exists | Lifestyle / dawah essays |
| `/privacy` | `app.mutqin.ai` | Privacy / AI audio | — |
| `/donate` | `app.mutqin.ai` | Help and support | `/contact` duplicate |

Homepage already covers guided memorisation, listen/repeat, spaced review, AI Recite, Mushaf, reading aids, FAQ, and footer links. New pages **deepen one intent**; they must not rewrite the homepage.

### Exists in the product, not as public SEO URLs (noindex)

`/memorisation`, `/memorisation/demo`, `/dashboard`, `/profile`, `/billing`, `/admin/*`, `/madani/*`, `/indopak/*`. These must stay **noindex**. Explain the feature on a marketing URL; send the CTA into the app.

### Not in the product as public HTML

No `/quran-memorization` hub, `/compare`, blog, or surah encyclopaedia yet. Find-an-ayah **voice** remains in-app; typed Find an ayah is `/tools/find-an-ayah`.

### Host constraint

`mutqin.ai` currently serves only `/`, `/waiting-list`, robots, and sitemap. Until that policy is widened, **new indexable pages should ship on `app.mutqin.ai`** (same pattern as `/about` and `/pricing`) and be listed in `sitemap.xml`. Do not publish empty prefix indexes.

---

## Keyword → one primary URL

Same search intent = one page. Nearby keywords are secondaries, not extra URLs.

| Primary keyword | Secondary / long-tail (same intent) | Primary URL | Status |
|-----------------|-------------------------------------|-------------|--------|
| Quran memorization app | Hifz app; memorize Quran; Quran memorization app free; best app to memorize Quran (commercial); online hifz app | `/` | **Exists** |
| Mutqin pricing | free vs pro hifz; Mutqin cost; Quran memorization app price | `/pricing` | **Exists** |
| Quran memorization plan | hifz plan; custom hifz plan; structured Quran memorization plan; how Mutqin plans ayahs | `/features/hifz-plan` (product); `/tools/quran-memorization-planner` (calculator) | **Live** |
| Quran revision | Hifz revision; murajaah; daily Quran revision; spaced review Quran; weak ayahs review | `/features/quran-revision` | Proposed |
| AI Quran recitation | Quran recitation checker; AI recitation check; recite from memory; smart recitation check | `/features/ai-recite` | **Live** |
| Quran memorization test | check what you kept; hifz quiz; recall test | `/tools/quran-memorization-test` | **Live** |
| Mutashabihat | similar Quran ayahs; mutashabihat practice; confusing similar ayahs; mutashābihāt | `/features/mutashabihat` | Proposed |
| Hifz progress | Quran memorization progress; hifz tracker; memorised ayahs tracker | `/features/hifz-progress` (product); `/tools/hifz-progress-calculator` (estimate) | **Live** |
| Find an Ayah | find ayah by reciting; Quran ayah finder; search ayah by voice | `/features/find-an-ayah` (voice, in-app); `/tools/find-an-ayah` (typed Arabic) | **Live** |
| Mushaf memorization | Madani mushaf practice; mushaf page memorization; Quran page layout hifz | `/features/mushaf` | Proposed |
| Quran memorization for beginners | how to start hifz; start memorizing Quran; hifz for beginners | `/guides/quran-memorization-for-beginners` | Proposed |
| Quran memorization techniques | how to memorize Quran; listen and repeat Quran; talqin; hide Quran text; joining ayahs | `/guides/quran-memorization-techniques` | Proposed |
| How to revise Hifz | murajaah schedule; hifz revision timetable (informational, not the product page) | `/guides/hifz-revision` | Proposed |
| How to make a Hifz plan | daily hifz portion; Juz plan (informational) | `/guides/hifz-plan` | Proposed |
| Mutqin vs Tarteel | Mutqin alternative to Tarteel; Tarteel vs Mutqin hifz | `/compare/mutqin-vs-tarteel` | Proposed |
| Best Quran memorization apps | Mutqin vs other hifz apps (round-up, only with honest criteria) | `/compare/quran-memorization-apps` | Proposed |

**Merged on purpose (do not split):**

- Hifz app + memorize Quran (commercial) → `/`
- Quran recitation checker + live recite-from-memory test + AI recitation → `/features/ai-recite`
- Quiet recall quiz (no microphone) → `/tools/quran-memorization-test`
- Similar Quran ayahs + Mutashabihat → `/features/mutashabihat`
- Hifz revision + Quran revision (product) → `/features/quran-revision`

**Intentionally split (different intent):**

- `/features/quran-revision` = what Mutqin does for review  
- `/guides/hifz-revision` = how murajaah works in general  
- `/features/hifz-plan` = Mutqin’s planner  
- `/guides/hifz-plan` = how to choose a portion size  

---

## Out of scope (do not build)

- Generic Islamic lifestyle, dua lists, Ramadan food, names of Allah, “benefits of reciting X” without a Hifz-practice angle
- Full tajweed courses (Mutqin has reading aids, not a madrasa)
- Thin surah-by-surah SEO pages
- Duplicate spelling URLs (`/quran-memorisation/…`)
- Public clones of `/dashboard` or `/memorisation`
- Empty `/quran-memorization` hub until it has unique depth
- Comparison pages Mutqin cannot describe fairly

---

## 1. Core commercial pages

### `/` — Home (exists)

- **Primary keyword:** Quran memorization app  
- **Secondary:** Hifz app; memorize Quran; Quran memorization; online hifz companion  
- **Intent:** Commercial / category  
- **Title:** Quran Memorization App with AI \| Mutqin  
- **Meta description:** Mutqin is a Quran memorization app for Hifz. Listen, recite, and review ayahs, with optional AI recitation checks to support practice between lessons.  
- **H1:** Keep the current product H1 (do not retarget this page in Phase 3 copy rewrites without a separate brief).  
- **H2s (already roughly present):** How it works; What supports your Hifz; FAQ  
- **Internal links:** `/waiting-list`, `/pricing`, `/about`, `/our-mission`; later `/features/ai-recite`, `/guides/quran-memorization-for-beginners`  
- **CTA:** Join the waiting list (marketing host) / start memorisation (app host)  
- **Content type:** Product landing  
- **Priority:** Launch (live)

### `/pricing` — Plans (exists)

- **Primary keyword:** Mutqin pricing (supported by “free Quran memorization app”)  
- **Secondary:** Mutqin Pro; hifz app free plan; recitation check limits  
- **Intent:** Commercial / transactional  
- **Title / H1:** Keep current catalog title and “Choose your plan”  
- **Internal links:** `/`, `/waiting-list`, `/features/ai-recite` (when live)  
- **CTA:** Continue free / Get Pro  
- **Content type:** Pricing  
- **Priority:** Launch (live)

### `/waiting-list`, `/about`, `/our-mission`

Support conversion and trust. They are **not** keyword landing pages. Do not load them with “Quran memorization app” as if they were a second homepage.

---

## 2. Feature pages

Ship as Blade + Vue island (same as `/about`). One feature per URL. Hub `/features` only after **three** children exist.

### `/features/ai-recite`

- **Primary keyword:** AI Quran recitation  
- **Secondary:** Quran recitation checker; recite from memory; smart recitation check; AI Recite Mutqin  
- **Intent:** Commercial / feature  
- **Title:** AI Quran Recitation Checker \| Mutqin  
- **Meta description:** Recite from memory and see which words and ayahs need another return. Mutqin’s AI Recite is a Quran recitation checker for Hifz practice, not a replacement for a teacher.  
- **H1:** Check your Hifz with AI Recite  
- **Recommended H2s:** Recite from memory; What the checker marks; Memorization test vs a teacher; Free vs Pro check limits; Privacy of microphone audio  
- **Internal links:** `/`, `/pricing`, `/privacy`, `/features/quran-revision`, `/guides/quran-memorization-techniques`  
- **CTA:** Waiting list or open workspace  
- **Content type:** Feature landing  
- **Priority:** Launch  

### `/features/mutashabihat`

- **Primary keyword:** Mutashabihat  
- **Secondary:** similar Quran ayahs; confusing ayahs; mutashābihāt practice  
- **Intent:** Commercial / feature  
- **Title:** Mutashabihat: Similar Quran Ayahs \| Mutqin  
- **Meta description:** Compare similar Quran ayahs and practise the words that distinguish them. Mutqin’s Mutashābihāt tools help Hifz learners who mix look-alike passages.  
- **H1:** Practise Mutashabihat and similar ayahs  
- **Recommended H2s:** Why similar ayahs collide; Compare distinguishing words; Recall and recitation checks; When to open this in a session  
- **Internal links:** `/features/ai-recite`, `/guides/quran-memorization-techniques`, `/`  
- **CTA:** Try in Mutqin  
- **Content type:** Feature landing  
- **Priority:** Launch  

### `/features/hifz-plan`

- **Primary keyword:** Quran memorization plan  
- **Secondary:** hifz plan; structured custom hifz plan; next ayahs to memorise  
- **Intent:** Commercial / feature  
- **Title:** Quran Memorization Plan \| Mutqin Hifz Planner  
- **Meta description:** Follow a clear Quran memorization plan: set a range, practise, then take the next recommended return. Mutqin keeps the plan beside your teacher, not instead of one.  
- **H1:** A Hifz plan you can actually follow  
- **Recommended H2s:** Short ranges over huge targets; What Mutqin schedules next; Plans vs a printed timetable; Free and Pro  
- **Internal links:** `/guides/hifz-plan`, `/features/quran-revision`, `/pricing`  
- **CTA:** Start a plan / waiting list  
- **Content type:** Feature landing  
- **Priority:** Launch  

### `/features/quran-revision`

- **Primary keyword:** Quran revision  
- **Secondary:** Hifz revision; murajaah app; spaced review; weak ayahs  
- **Intent:** Commercial / feature  
- **Title:** Quran and Hifz Revision \| Mutqin  
- **Meta description:** Keep Hifz revision in the same workspace as new memorisation. Mutqin surfaces weaker ayahs and a next return so murajaah does not fall off the path.  
- **H1:** Quran revision that stays part of Hifz  
- **Recommended H2s:** New lesson vs return; Weak ayahs; Spaced review in Mutqin; Link to a teacher’s murajaah  
- **Internal links:** `/guides/hifz-revision`, `/features/hifz-progress`, `/features/ai-recite`  
- **CTA:** Open revision in Mutqin  
- **Content type:** Feature landing  
- **Priority:** Launch  

### `/features/mushaf`

- **Primary keyword:** Mushaf memorization  
- **Secondary:** Madani page hifz; mushaf layout practice; Quran page memorization  
- **Intent:** Commercial / feature  
- **Title:** Mushaf Memorization Layout \| Mutqin  
- **Meta description:** Practise Hifz on a familiar Mushaf page. Mutqin supports focused page layout for memorization, with listening, hiding, and recitation checks around the same ayahs.  
- **H1:** Memorise with a Mushaf page, not a cluttered screen  
- **Recommended H2s:** Why page layout matters for Hifz; Madani practice; Aids without leaving the page; Session-only mushaf  
- **Internal links:** `/`, `/features/ai-recite`, `/guides/quran-memorization-techniques`  
- **CTA:** Open the workspace  
- **Content type:** Feature landing  
- **Priority:** Launch  

### `/features/find-an-ayah`

- **Primary keyword:** Find an Ayah  
- **Secondary:** find ayah by reciting; Quran ayah search by voice  
- **Intent:** Commercial / feature  
- **Title:** Find an Ayah by Reciting \| Mutqin  
- **Meta description:** Recite a few words and Mutqin finds the ayah so you can open it, a range, or a reading aid. Built for Hifz practice, not as a general Islamic search engine.  
- **H1:** Find an ayah by reciting a few words  
- **Recommended H2s:** How matching works; Open ayah vs range; When this helps a session; Limits and listening privacy  
- **Internal links:** `/privacy`, `/features/ai-recite`, `/`  
- **CTA:** Use Find ayah in Mutqin  
- **Content type:** Feature landing  
- **Priority:** Launch  

### `/features/hifz-progress`

- **Primary keyword:** Hifz progress  
- **Secondary:** Quran memorization tracker; memorised ayahs; progress insights  
- **Intent:** Commercial / feature  
- **Title:** Hifz Progress Tracker \| Mutqin  
- **Meta description:** See Hifz progress from sessions and recitation checks: what is strong, what needs return, and what to open next. Dashboard URLs stay private; this page explains the product.  
- **H1:** See your Hifz progress without guessing  
- **Recommended H2s:** What is counted; Weak ayahs and next step; Insights on Pro; Not a public leaderboard  
- **Internal links:** `/dashboard` is **noindex** — link CTA as “Progress in the app”, plus `/features/quran-revision`, `/pricing`  
- **CTA:** View progress after sign-in  
- **Content type:** Feature landing  
- **Priority:** Post-launch (home already mentions progress; ship after AI Recite + revision pages)

### `/features` (index)

- **Intent:** Navigation hub only  
- **Priority:** Post-launch, only with 3+ children  
- **Do not** target “Quran memorization app”

---

## 3. Hifz educational content

Tone: practice between lessons, return, not ijāzah. Link to features; do not dump the homepage.

Hub `/quran-memorization` only after two guides exist. Child URLs may live under `/guides/*` (clearer) with the hub linking out — **do not** publish the same article at both `/guides/…` and `/quran-memorization/…`.

### `/guides/quran-memorization-for-beginners` (**Live** cornerstone)

- **Primary keyword:** Quran memorization plan for beginners / Quran memorization for beginners  
- **Secondary:** how to start hifz; start memorizing Quran; first ayahs to memorise  
- **Intent:** Informational  
- **Title:** Quran Memorization Plan for Beginners \| How to Start Hifz  
- **H1:** Quran memorization plan for beginners  
- **Internal links:** techniques, hifz-plan, revision, planner tool, `/features/hifz-plan`  
- **Content type:** Guide (Article schema)  

### `/guides/quran-memorization-techniques` (**Live** cornerstone)

- **Primary keyword:** How to memorize the Quran (merged with techniques — do not split)  
- **Secondary:** Quran memorization techniques; talqin; listen and repeat; hiding the mushaf text  
- **Intent:** Informational  
- **Title:** How to Memorize the Quran \| Hifz Techniques That Hold  
- **H1:** How to memorize the Quran: techniques that hold  
- **Internal links:** beginners, similar-ayahs, revision, mushaf, AI Recite, public test  
- **Content type:** Guide (Article schema)  

### `/guides/hifz-revision` (**Live** cornerstone)

- **Primary keyword:** How to revise the Quran / retain Hifz  
- **Secondary:** murajaah schedule; daily hifz revision; stop forgetting  
- **Intent:** Informational  
- **Title:** How to Revise the Quran and Retain Your Hifz \| Mutqin  
- **H1:** How to revise the Quran and retain your Hifz  
- **Internal links:** `/features/quran-revision`, progress, plan, techniques, AI Recite  
- **Content type:** Guide (Article schema)  

### `/guides/hifz-plan` (**Live** cornerstone)

- **Primary keyword:** How to make a Hifz plan (informational)  
- **Secondary:** daily hifz portion; realistic juz plan  
- **Intent:** Informational  
- **Title:** How to Make a Quran Memorization Plan \| Mutqin  
- **H1:** How to make a Quran memorization plan you will keep  
- **Internal links:** `/features/hifz-plan`, beginners, revision, techniques, public planner  
- **Content type:** Guide (Article schema)  

### `/guides/similar-ayahs` (**Live** cornerstone)

- **Primary keyword:** Mutashabihat / how to memorize similar Quran ayahs  
- **Secondary:** similar verses in Quran; confusing similar ayahs  
- **Intent:** Informational  
- **Title:** Mutashabihat: How to Memorize Similar Quran Ayahs \| Mutqin  
- **H1:** Mutashabihat: how to memorize similar Quran ayahs  
- **Internal links:** `/features/mutashabihat`, techniques, revision, AI Recite, mushaf  
- **Content type:** Guide (Article schema)

### `/quran-memorization` (hub)

- **Intent:** Topic hub for Hifz education  
- **H1:** Quran memorization (Hifz)  
- **Priority:** Post-launch  
- **Must not** compete with `/` for “Quran memorization app”

### Long-term educational (only with unique depth)

- `/guides/weak-ayahs` — only if distinct from revision + progress pages  
- `/quran-memorization/daily-practice` — habit / consistency, not a second beginner guide  

---

## 4. Free tools

Usable without an account. Feature pages stay the product story; tool pages do the job.

| URL | Role | Status |
|-----|------|--------|
| `/tools` | Hub | **Live** |
| `/tools/quran-memorization-planner` | Daily Hifz pace from Mutqin’s `calculatePlanForecast` | **Live** |
| `/tools/hifz-progress-calculator` | Pages / Juz / surah → ayah share + remaining pace | **Live** |
| `/tools/quran-memorization-test` | Public “Check what you kept” (text quiz, no mic) | **Live** |
| `/tools/find-an-ayah` | Typed Arabic matching via `matchHeardAyahPrefix` | **Live** |
| `/tools/similar-ayahs` | Public Mutashābihāt explorer | Long-term; product story stays `/features/mutashabihat` |

Voice Find an ayah and Speechmatics stay in the workspace. Do not invent a “Quran word counter” or “random ayah generator” for traffic.

---

## 5. Comparison pages

Honest, Hifz-specific, no fake tables. Prefix `/compare/*` (not a reserved Phase 1 prefix; add to `SeoCatalog` when the first page ships).

### `/compare/mutqin-vs-tarteel`

- **Primary keyword:** Mutqin vs Tarteel  
- **Secondary:** Tarteel alternative for hifz; AI recitation app comparison  
- **Intent:** Commercial investigation  
- **Title:** Mutqin vs Tarteel for Hifz \| Quran Memorization  
- **Meta description:** How Mutqin and Tarteel differ for Hifz: session path, Mushaf practice, revision, and recitation checks. Choose the workflow that fits practice between lessons.  
- **H1:** Mutqin vs Tarteel for Quran memorization  
- **Recommended H2s:** Who each is for; Recitation checking; Memorisation workspace vs recitation focus; Pricing caveat (verify before publish); Teacher remains required  
- **Internal links:** `/features/ai-recite`, `/pricing`, `/`  
- **CTA:** Try Mutqin  
- **Content type:** Comparison  
- **Priority:** Post-launch  

### `/compare/quran-memorization-apps`

- **Primary keyword:** Best Quran memorization apps  
- **Secondary:** hifz apps compared  
- **Intent:** Commercial investigation  
- **Title:** Quran Memorization Apps Compared \| Mutqin  
- **H1:** What to look for in a Hifz app  
- **Recommended H2s:** Path and return; Recitation check; Mushaf; Revision; Where Mutqin sits  
- **Priority:** Long-term (easy to become thin or biased; write criteria first)  

Do not auto-generate vs-every-competitor URLs.

---

## 6. Long-tail opportunities

Attach to an existing primary page first. New URL only if the article would not cannibalise.

| Long-tail | Attach to | New URL? |
|-----------|-----------|----------|
| best app to memorize Quran | `/` and later `/compare/quran-memorization-apps` | No extra page at launch |
| free Quran memorization app | `/pricing` + `/` | No |
| how to memorize Quran | `/guides/quran-memorization-techniques` | No |
| how to start hifz | `/guides/quran-memorization-for-beginners` | No |
| daily Quran revision | `/features/quran-revision` + `/guides/hifz-revision` | No |
| Quran memorization test | `/tools/quran-memorization-test` (recall quiz); live recitation check stays `/features/ai-recite` | Split on purpose |
| similar verses in Quran | `/features/mutashabihat` | No |
| hide Quran text memorization | techniques guide | No |
| Madani 15-line hifz | `/features/mushaf` | No |
| voice search Quran ayah | `/features/find-an-ayah` | No |
| track hifz progress | `/features/hifz-progress` | No |
| Mutqin waiting list | `/waiting-list` | No |

---

## Internal linking (once pages exist)

```
/  →  features (ai-recite, revision, mushaf, plan)  →  matching guides
/  →  /guides/quran-memorization-for-beginners
/guides/*  →  one product feature + /pricing or /waiting-list
/features/quran-revision  ⇄  /guides/hifz-revision
/features/hifz-plan  ⇄  /guides/hifz-plan
/compare/*  →  / and /features/ai-recite
```

Homepage `#features` hashes can later become real `/features/…` links without duplicating H1s.

---

## Recommended implementation order

1. **Keep strengthening `/` and `/pricing`** (already live; unique titles; crawlable footer links).  
2. **Launch cluster A — distinctive product SERPs:**  
   `/features/ai-recite` → `/features/mutashabihat` → `/features/find-an-ayah`  
3. **Launch cluster B — Hifz authority:**  
   `/guides/quran-memorization-for-beginners` → `/guides/quran-memorization-techniques` → `/features/hifz-plan` → `/features/quran-revision` → `/features/mushaf`  
4. **Post-launch:** `/features/hifz-progress`, `/guides/hifz-revision`, `/guides/hifz-plan`, `/features` hub, `/quran-memorization` hub, `/compare/mutqin-vs-tarteel`.  
5. **Long-term:** `/compare/quran-memorization-apps`; `/tools/similar-ayahs` only with a working explorer; expand `mutqin.ai` host if those URLs should live on the apex.  
6. **Never:** empty prefix folders, mass surah pages, or generic Islamic blogs.

Each new URL: catalog entry, Blade SSR, one H1, sitemap include, internal links from `/` or a hub, tests in `SeoPagesTest` / `SeoCatalogTest`.
