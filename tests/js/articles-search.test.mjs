import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  PAGE_SIZE,
  SEARCH_MIN_CHARS,
  canLoadMore,
  categoryOptions,
  filterArticles,
  highlightMatches,
  initialVisibleCount,
  listingArticles,
  nextVisibleCount,
  uniqueCategories,
  visibleArticles,
} from '../../resources/js/scripts/articles/articleSearch.js'

const articles = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../resources/js/data/articles.json'), 'utf8'),
)

test('placeholder catalogue has 15 complete Qur’an articles', () => {
  assert.equal(articles.length, 15)
  assert.equal(new Set(articles.map((item) => item.id)).size, 15)
  assert.ok(articles.every((item) => item.title && item.excerpt && item.category && item.publishedAt && item.image))
  assert.ok(articles.every((item) => String(item.image).includes('images.pexels.com')))
  assert.ok(articles.every((item) => item.imageCredit && item.imageSource === 'pexels'))
  assert.ok(articles.every((item) => Array.isArray(item.sections) && item.sections.length >= 3))
  assert.ok(articles.every((item) => Array.isArray(item.relatedSlugs) && item.relatedSlugs.length >= 2))
  assert.ok(!articles.some((item) => /lorem ipsum/i.test(`${item.title} ${item.excerpt}`)))
})

test('search stays unfiltered until three characters', () => {
  assert.equal(SEARCH_MIN_CHARS, 3)
  assert.equal(filterArticles(articles, '').length, 15)
  assert.equal(filterArticles(articles, 'hi').length, 15)
  assert.ok(filterArticles(articles, 'hif').length < 15)
})

test('search matches title, excerpt and category without case sensitivity', () => {
  const byTitle = filterArticles(articles, 'MUTASHABIHAT')
  assert.ok(byTitle.some((item) => item.slug.includes('mutashabihat')))

  const byCategory = filterArticles(articles, 'revision')
  assert.ok(byCategory.length >= 3)
  assert.ok(byCategory.every((item) => /revision/i.test(`${item.title} ${item.excerpt} ${item.category}`)))

  const byExcerpt = filterArticles(articles, 'spaced returns')
  assert.equal(byExcerpt.length, 1)
  assert.equal(byExcerpt[0].id, 'how-repetition-strengthens-quran-memorisation')
})

test('load more reveals six, then twelve, then all fifteen', () => {
  let visible = initialVisibleCount(articles.length, PAGE_SIZE)
  assert.equal(visible, 6)
  assert.equal(visibleArticles(articles, visible).length, 6)
  assert.equal(canLoadMore(visible, articles.length), true)

  visible = nextVisibleCount(visible, articles.length, PAGE_SIZE)
  assert.equal(visible, 12)
  assert.equal(canLoadMore(visible, articles.length), true)

  visible = nextVisibleCount(visible, articles.length, PAGE_SIZE)
  assert.equal(visible, 15)
  assert.equal(canLoadMore(visible, articles.length), false)
})

test('search pagination works against filtered results', () => {
  const matching = filterArticles(articles, 'memor')
  assert.ok(matching.length > 6)
  assert.ok(matching.length < articles.length)
  let visible = initialVisibleCount(matching.length, PAGE_SIZE)
  assert.equal(visible, 6)
  visible = nextVisibleCount(visible, matching.length, PAGE_SIZE)
  assert.equal(visible, Math.min(12, matching.length))
  if (matching.length > 12) {
    visible = nextVisibleCount(visible, matching.length, PAGE_SIZE)
  }
  assert.equal(visible, matching.length)
  assert.equal(canLoadMore(visible, matching.length), false)
})

test('category filters combine with search', () => {
  const categories = uniqueCategories(articles)
  assert.ok(categories.includes('Beginners'))
  const beginners = filterArticles(articles, '', 'Beginners')
  assert.ok(beginners.length >= 2)
  assert.ok(beginners.every((item) => item.category === 'Beginners'))
  const hrefs = listingArticles(articles)
  assert.ok(hrefs[0].href.startsWith('/articles/'))
})

test('highlightMatches wraps query tokens while escaping HTML', () => {
  const html = highlightMatches('How to revise Hifz and retain Hifz', 'hif')
  assert.ok(html.includes('<mark class="article-highlight">Hif</mark>'))
  assert.equal(highlightMatches('<b>bold</b>', 'x'), '&lt;b&gt;bold&lt;/b&gt;')
  assert.ok(highlightMatches('spaced returns help', 'spaced returns').includes('article-highlight'))
})

test('categoryOptions sorts by count with metrics', () => {
  const options = categoryOptions(articles)
  assert.ok(options.length >= 3)
  assert.ok(options.every((item) => item.label && item.count > 0))
  assert.ok(options[0].count >= options[options.length - 1].count)
})

