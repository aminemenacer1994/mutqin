const WORDS_PER_MINUTE = 200

export function articlePlainText(article) {
  const parts = [
    article?.title,
    article?.lede || article?.excerpt,
  ]
  const sections = Array.isArray(article?.sections) ? article.sections : []
  for (const section of sections) {
    parts.push(section?.h2)
    for (const paragraph of section?.paragraphs || []) parts.push(paragraph)
    for (const sub of section?.subs || []) {
      parts.push(sub?.h3)
      for (const paragraph of sub?.paragraphs || []) parts.push(paragraph)
    }
  }
  return parts.map((value) => String(value || '')).join(' ')
}

export function wordCount(text) {
  return String(text || '')
    .replace(/\[[^\]]+\]\(([^)]+)\)/g, '$1')
    .split(/\s+/)
    .filter(Boolean).length
}

export function readingMinutes(article, wordsPerMinute = WORDS_PER_MINUTE) {
  const minutes = Math.ceil(wordCount(articlePlainText(article)) / Math.max(1, wordsPerMinute))
  return Math.max(1, minutes)
}
