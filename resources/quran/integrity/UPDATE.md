# Updating protected Qur'an integrity fixtures

Protected Qur'an content (Uthmani Arabic, ayah identity, Madani page pins, translation/transliteration linkage, audio global IDs) must **never** be edited by hand or “corrected” from AI-generated text.

## Authoritative sources

| Content | Source |
|---------|--------|
| Arabic (Uthmani) | Al Quran Cloud edition `quran-uthmani` |
| Translation (default) | Al Quran Cloud `en.asad` (see `config/quran.php`) |
| Transliteration (default) | Al Quran Cloud `en.transliteration` |
| Madani page numbers / juz / hizb quarter | Al Quran Cloud ayah metadata (Madani Mushaf pages 1–604) |
| Runtime QCF glyphs | Quran.com v4 `mushaf=1` (not stored in fixtures) |
| Surah ayah counts / app names | `surah-metadata.json` (must match `QuranMetadata` + JS `SURAH_AYAH_COUNTS`) |

## Intentional update flow

1. Confirm the upstream edition identifiers have not changed unexpectedly.
2. Run the refresh script (network required; retries on HTTP 429):

   ```bash
   node scripts/quran-integrity-refresh.mjs --confirm
   ```

   Wait a minute if Al Quran Cloud recently rate-limited you, then re-run. The script backs off automatically on 429.

3. Review the git diff of:
   - `resources/quran/integrity/canonical-corpus.json`
   - `resources/quran/integrity/surah-metadata.json` (only if counts/names intentionally change)
   - `resources/quran/integrity/checksums.json`
4. If PHP `QuranMetadata` or JS `SURAH_AYAH_COUNTS` / names diverge from `surah-metadata.json`, update those mirrors to match the approved metadata — never the other way around for Arabic text.
5. Re-seed the `quran_verse_keys` registry if boundaries/counts changed:

   ```bash
   php artisan quran:sync-verse-keys --force
   ```

6. Run integrity checks:

   ```bash
   npm run test:quran-integrity
   composer test -- --filter=QuranContentIntegrity
   ```

7. Document the reason in the PR (edition bump, upstream correction, new pin set). Do **not** regenerate fixtures silently in CI.

## What CI fails on

- Checksum mismatch for pinned fixture files
- Surah count ≠ 114 or total ayahs ≠ 6236
- PHP/JS metadata out of sync with `surah-metadata.json`
- Selected canonical Uthmani strings changed without checksum refresh
- Misaligned translation/transliteration/`global_number` on pinned ayahs
- Page pins outside 1–604 or broken page transitions
- Record-set detectors: missing, duplicated, or reordered ayahs; wrong ayah linkage
