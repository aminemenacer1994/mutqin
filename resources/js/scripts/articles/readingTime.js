const WORDS_PER_MINUTE = 200

function pushQuote(parts, quote) {
  if (!quote || typeof quote !== 'object') return
  parts.push(quote.arabic, quote.translation, quote.reference, quote.note, quote.translator)
}

export function articlePlainText(article) {
  const parts = [
    article?.title,
    article?.lede || article?.excerpt,
  ]
  for (const paragraph of article?.intro || []) parts.push(paragraph)
  pushQuote(parts, article?.introQuote)
  if (article?.cta) {
    parts.push(article.cta.heading, article.cta.body, article.cta.label)
  }
  const sections = Array.isArray(article?.sections) ? article.sections : []
  for (const section of sections) {
    parts.push(section?.h2)
    for (const paragraph of section?.paragraphs || []) parts.push(paragraph)
    for (const paragraph of section?.paragraphsAfter || []) parts.push(paragraph)
    for (const quote of section?.quotes || []) pushQuote(parts, quote)
    for (const step of section?.steps || []) {
      parts.push(step?.title, step?.body)
    }
    if (section?.sequence) {
      parts.push(section.sequence.title, section.sequence.intro, section.sequence.outro)
      for (const item of section.sequence.items || []) parts.push(item)
    }
    if (section?.comparison) {
      parts.push(
        section.comparison.intro,
        section.comparison.left?.title,
        section.comparison.left?.body,
        section.comparison.right?.title,
        section.comparison.right?.body,
      )
    }
    for (const item of section?.routine || []) {
      parts.push(item?.title, item?.body)
    }
    for (const sub of section?.subs || []) {
      parts.push(sub?.h3)
      for (const paragraph of sub?.paragraphs || []) parts.push(paragraph)
      for (const quote of sub?.quotes || []) pushQuote(parts, quote)
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
