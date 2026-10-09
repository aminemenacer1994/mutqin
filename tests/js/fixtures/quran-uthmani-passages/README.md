# Qur’an Uthmani passage fixtures (AI Recite)

Pinned `quran-uthmani` ayah text used by `ai-recite-real-passages` regression tests.

- Edition: Al Quran Cloud `quran-uthmani` (same as `config/quran.php` `arabic_edition`)
- Assessment convention: leading basmala stripped from ayah 1 of surahs ≥ 2 (see `Memorisation.removeBasmala`)
- These are **text fixtures**, not recorded audio

Refresh (network required):

```bash
# Re-run the fetch snippet in the AI Recite real-passages work, or hit:
# https://api.alquran.cloud/v1/surah/{n}/quran-uthmani
```

Do not mark real-audio QA cells PASS from this folder alone.
