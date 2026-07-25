/** Illuminated Madani mushaf theme helpers */

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

const JUZ_TITLES = [
  '',
  'الجُزْءُ الأَوَّلُ',
  'الجُزْءُ الثَّانِي',
  'الجُزْءُ الثَّالِثُ',
  'الجُزْءُ الرَّابِعُ',
  'الجُزْءُ الخَامِسُ',
  'الجُزْءُ السَّادِسُ',
  'الجُزْءُ السَّابِعُ',
  'الجُزْءُ الثَّامِنُ',
  'الجُزْءُ التَّاسِعُ',
  'الجُزْءُ العَاشِرُ',
  'الجُزْءُ الحَادِي عَشَرَ',
  'الجُزْءُ الثَّانِي عَشَرَ',
  'الجُزْءُ الثَّالِثَ عَشَرَ',
  'الجُزْءُ الرَّابِعَ عَشَرَ',
  'الجُزْءُ الخَامِسَ عَشَرَ',
  'الجُزْءُ السَّادِسَ عَشَرَ',
  'الجُزْءُ السَّابِعَ عَشَرَ',
  'الجُزْءُ الثَّامِنَ عَشَرَ',
  'الجُزْءُ التَّاسِعَ عَشَرَ',
  'الجُزْءُ العِشْرُونَ',
  'الجُزْءُ الحَادِي وَالعِشْرُونَ',
  'الجُزْءُ الثَّانِي وَالعِشْرُونَ',
  'الجُزْءُ الثَّالِثُ وَالعِشْرُونَ',
  'الجُزْءُ الرَّابِعُ وَالعِشْرُونَ',
  'الجُزْءُ الخَامِسُ وَالعِشْرُونَ',
  'الجُزْءُ السَّادِسُ وَالعِشْرُونَ',
  'الجُزْءُ السَّابِعُ وَالعِشْرُونَ',
  'الجُزْءُ الثَّامِنُ وَالعِشْرُونَ',
  'الجُزْءُ التَّاسِعُ وَالعِشْرُونَ',
  'الجُزْءُ الثَّلَاثُونَ'
]

/** Five illuminated mushaf looks + plain white/black reading theme. */
export const MUSHAF_ILLUM_THEMES = [
  { value: 'classic', label: 'Standard white', description: 'White page, black text' },
  { value: 'azure', label: 'Azure floral', description: 'Blue & pink Madani border' },
  { value: 'gold', label: 'Gold ornate', description: 'Gold & charcoal frame' },
  { value: 'emerald', label: 'Emerald garden', description: 'Green & pink floral border' },
  { value: 'jewel', label: 'Jewel opening', description: 'Illuminated green opening page' },
  { value: 'night', label: 'Night ink', description: 'Dark paper, muted ornaments' }
]

export const MUSHAF_ILLUM_THEME_VALUES = MUSHAF_ILLUM_THEMES.map(theme => theme.value)

/** Migrate legacy flat swatches to illuminated themes. */
export function normalizeMushafIllumTheme(value) {
  const map = {
    warm: 'gold',
    paper: 'gold',
    contrast: 'classic',
    mist: 'emerald',
    rose: 'jewel',
    classic: 'classic',
    night: 'night',
    azure: 'azure',
    gold: 'gold',
    emerald: 'emerald',
    jewel: 'jewel'
  }
  const key = String(value || '').toLowerCase()
  return map[key] || 'classic'
}

export function toArabicIndicNumber(value) {
  return String(Math.max(0, Number(value) || 0)).replace(/\d/g, digit => ARABIC_DIGITS[Number(digit)] || digit)
}

export function mushafJuzTitle(juzNumber) {
  const juz = Math.max(1, Math.min(30, Number(juzNumber) || 1))
  return JUZ_TITLES[juz] || `الجُزْءُ ${toArabicIndicNumber(juz)}`
}

export function defaultIllumThemeForAppTheme(theme = 'light') {
  const normalized = String(theme || 'light').toLowerCase()
  if (normalized === 'dark' || normalized === 'dark-mode') return 'night'
  if (normalized === 'sepia' || normalized === 'sepia-mode') return 'gold'
  return 'classic'
}

export function mushafThemeMeta(value) {
  const theme = normalizeMushafIllumTheme(value)
  return MUSHAF_ILLUM_THEMES.find(option => option.value === theme) || MUSHAF_ILLUM_THEMES[0]
}
