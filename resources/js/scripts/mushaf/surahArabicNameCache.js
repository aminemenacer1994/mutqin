/** @type {Map<number, string>} */
let arabicBySurahId = new Map()

/**
 * @param {Array<{ id?: number, name_arabic?: string }>} chapters
 */
export function setSurahArabicNameCache(chapters = []) {
  const next = new Map()
  for (const chapter of chapters) {
    const id = Number(chapter?.id)
    const name = String(chapter?.name_arabic || '').trim()
    if (id > 0 && name) next.set(id, name)
  }
  arabicBySurahId = next
}

/**
 * IndoPak mushaf surah banner (Unicode Nastaleeq — not surahnames ligatures).
 * @param {number | string} chapterId
 */
export function getSurahArabicBannerText(chapterId) {
  const id = Math.max(1, Math.min(114, Number(chapterId) || 0))
  if (!id) return ''
  const name = arabicBySurahId.get(id)
  if (!name) return ''
  if (/^س/u.test(name)) return name
  return `سُورَةُ ${name}`
}
