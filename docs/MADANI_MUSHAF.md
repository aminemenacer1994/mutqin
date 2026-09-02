# Madani Mushaf (KFGQPC V2 1421H)

Interactive, page-accurate Madani Mushaf reader for Mutqin using authoritative layout data from the [Quranic Universal Library (QUL)](https://qul.tarteel.ai).

## Data sources and attribution

| Resource | QUL ID | URL |
|----------|--------|-----|
| KFGQPC V2 layout (1421H print) | 10 | https://qul.tarteel.ai/resources/mushaf-layout/10 |
| QPC V2 Glyph (word-by-word) | 61 | https://qul.tarteel.ai/resources/quran-script/61 |

Layout and glyph data are © contributors to the Quranic Universal Library (Tarteel AI). Mutqin stores processed JSON locally after import; pages are not fetched from QUL at runtime.

Fonts: QCF V2 page fonts from [Quran Foundation CDN](https://verses.quran.foundation) (same as existing Mutqin mushaf support).

## Setup

1. Download QUL SQLite exports (login required on QUL):
   - Layout resource 10 → save as `storage/app/madani-mushaf/source/layout.sqlite`
   - Script resource 61 → save as `storage/app/madani-mushaf/source/script.sqlite`

2. Import all 604 pages — choose one:

**Authoritative (QUL SQLite):**

```bash
php artisan mutqin:import-madani-mushaf
```

**Without QUL download (Quran.com bridge — all 604 pages):**

```bash
php artisan mutqin:import-madani-mushaf --from-qurancom
```

Takes several minutes. For authoritative KFGQPC V2 line placement, replace with QUL SQLite when you can download it.

For development/tests without full data:

```bash
php artisan mutqin:import-madani-mushaf --fixtures
```

Custom paths:

```bash
php artisan mutqin:import-madani-mushaf \
  --layout=/path/to/layout.sqlite \
  --script=/path/to/script.sqlite
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/memorisation/madani-mushaf/pages/{page}` | Page payload (lines + words) |
| GET | `/memorisation/madani-mushaf/resolve?verse_key=2:255` | Resolve page from ayah |
| GET | `/memorisation/madani-mushaf/manifest` | Import metadata |
| GET | `/api/quran/mushaf/pages/{page}` | Same payload (public API) |

Responses are cached (`Cache-Control: public, max-age=604800, immutable`).

## Frontend

Reading layout: **Madani Mushaf** (`readingViewMode: madani_mushaf`)

Components under `resources/js/components/mushaf/`:

- `MadaniMushafReader.vue` — reader shell, swipe, errors
- `MushafSpread.vue` — desktop two-page / mobile single
- `MushafPage.vue` — 15-line page geometry
- `MushafLine.vue` — authoritative line rendering
- `MushafWord.vue` — word interaction, AI/audio states
- `MushafNavigation.vue` — prev/next/jump
- `MushafLoadingSkeleton.vue` — font/page loading

## Testing

```bash
php artisan test --filter=MadaniMushaf
php artisan test --filter=ImportMadaniMushaf
node tests/js/madani-mushaf.test.mjs
npm run test:mutqin
```

## Manual verification

1. Run fixture import and open `/memorisation`.
2. Switch layout to **Madani Mushaf**.
3. Confirm page 1–2 render with surah headings; page 2 shows basmala before Al-Baqarah.
4. Desktop (≥900px): two-page spread, odd page on the right.
5. Mobile: single page, RTL swipe navigation.
6. Click a word → existing ayah tools/off-canvas open.
7. Toggle dark/sepia theme → Mushaf page stays warm cream.
8. Start audio → word highlight follows playback; navigate pages while playing.

## Limitations

- Full 604-page accuracy requires completing the QUL SQLite import on your server.
- Tajweed colouring uses existing QCF v4 fonts when enabled; tajweed markup in API payloads can be extended later.
- Page resolution by ayah scans imported pages (cached per ayah); a dedicated index table can be added for very large deployments.
