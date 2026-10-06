import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { articleAbsoluteUrl, whatsappShareHref } from '../../resources/js/scripts/articles/articleShare.js'
import { readingMinutes } from '../../resources/js/scripts/articles/readingTime.js'

const articles = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../resources/js/data/articles.json'), 'utf8'),
)

test('reading time is at least one minute for complete articles', () => {
  assert.ok(articles.every((item) => readingMinutes(item) >= 1))
  assert.ok(articles.every((item) => Array.isArray(item.sections) && item.sections.length >= 3))
})

test('share helpers build WhatsApp and canonical article URLs', () => {
  const url = articleAbsoluteUrl('how-to-memorise-the-quran-beginners-guide', 'https://mutqin.ai')
  assert.equal(url, 'https://mutqin.ai/articles/how-to-memorise-the-quran-beginners-guide')
  const whatsapp = whatsappShareHref('Beginner Hifz', url)
  assert.ok(whatsapp.startsWith('https://wa.me/?text='))
  assert.ok(whatsapp.includes(encodeURIComponent(url)))
})
