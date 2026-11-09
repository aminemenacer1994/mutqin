/**
 * Speechmatics StartRecognition config for Mr. Mutqin commands.
 * Recitation keeps its own config in speechmatics/quranVocabulary.js.
 */
export function buildSpeechmaticsCommandConfig({ language = 'en', additionalVocab = [] } = {}) {
  const lang = String(language || 'en').toLowerCase().startsWith('ar') ? 'ar' : 'en'
  const vocab = []
  const seen = new Set()
  const rows = Array.isArray(additionalVocab) ? additionalVocab : []
  for (const row of rows) {
    const content = String(row?.content || '').trim()
    const key = content.toLowerCase()
    if (!content || content.length > 80 || seen.has(key)) continue
    const arabic = /[\u0600-\u06FF]/.test(content)
    if (lang === 'en' && arabic) continue
    if (lang === 'ar' && !arabic) continue
    const sounds = (Array.isArray(row.sounds_like) ? row.sounds_like : [])
      .map((item) => String(item || '').trim().toLowerCase())
      .filter((item) => item && item !== key && item.length <= 48)
      .filter((item, index, list) => list.indexOf(item) === index)
      .slice(0, 4)
    const entry = { content }
    if (sounds.length) entry.sounds_like = sounds
    vocab.push(entry)
    seen.add(key)
    if (vocab.length >= 200) break
  }

  const config = {
    language: lang,
    operating_point: 'enhanced',
    enable_partials: true,
  }
  if (vocab.length) config.additional_vocab = vocab
  return config
}
