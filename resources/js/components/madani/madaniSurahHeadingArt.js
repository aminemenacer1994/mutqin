/**
 * Vector art constants for the KFGQPC-style Madani surah heading frame (viewBox 0 0 1000 70).
 * Surah title glyphs come from surahnames.woff2 via surahNameGlyphText().
 */
export const MADANI_SURAH_HEADING_VIEWBOX = '0 0 1000 70'

/** Central cartouche bounds (for title overlay), fractions of viewBox width/height. */
export const MADANI_SURAH_HEADING_TITLE_BOX = {
  left: 0.34,
  right: 0.34,
  top: 0.18,
  bottom: 0.18,
}

/** Lobed cartouche with a single top and bottom point (Madani surah title panel). */
export const MADANI_SURAH_HEADING_CARTOUCHE_OUTER =
  'M 352 27 H 462 L 500 15 L 538 27 H 648 V 43 H 538 L 500 55 L 462 43 H 352 Z'

export const MADANI_SURAH_HEADING_CARTOUCHE_INNER =
  'M 358 29 H 460 L 500 19 L 540 29 H 642 V 41 H 540 L 500 51 L 460 41 H 358 Z'
