import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  TUTORIALS_PAGE_PATH,
  TUTORIAL_VIDEOS,
  tutorialThumbnailUrl,
  tutorialVideosInOrder,
} from '../../resources/js/config/tutorialVideos.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const homepage = readFileSync(join(root, 'resources/js/views/Homepage.vue'), 'utf8')
const component = readFileSync(join(root, 'resources/js/components/TutorialCarousel.vue'), 'utf8')
const locales = ['en', 'fr', 'es', 'ar', 'id', 'tr', 'ur']

const ids = [
  'ecSmacClOSw',
  'ZWi0qKw7y7E',
  'VpIf9YexD0E',
  'sEIK13nKxEw',
  '8xrNze6_3Ms',
  'u9B3FyKnqn4',
  'NwUUi9SnTIo',
  'cQwJUCY7IVE',
]

const ordered = tutorialVideosInOrder()
assert.deepEqual(ordered.map((video) => video.id), ids)
assert.equal(new Set(ordered.map((video) => video.id)).size, ids.length)
assert.deepEqual(ordered.map((video) => video.order), [1, 2, 3, 4, 5, 6, 7, 8])
assert.equal(TUTORIALS_PAGE_PATH, '/features')
assert.equal(TUTORIAL_VIDEOS.length, 8)

for (const video of ordered) {
  assert.match(video.feature, /\S/)
  assert.match(video.tagline, /\S/)
  assert.match(video.description, /\S/)
  assert.match(video.youtubeTitle, /Mutqin/)
  assert.equal(tutorialThumbnailUrl(video.id), `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`)
}

assert.equal(ordered[0].feature, 'Listen & Repeat')
assert.equal(ordered[2].feature, 'Tajweed Colours')
assert.equal(ordered[4].feature, 'Saved Sessions')
assert.equal(ordered[7].feature, 'Mustahabbat')
assert.equal(tutorialThumbnailUrl('not-an-id'), '')

const carouselAt = homepage.indexOf('<tutorial-carousel')
const practiceAt = homepage.indexOf('class="practice-types"')
const testimonialsAt = homepage.indexOf('<testimonials-carousel')
const featuresAt = homepage.indexOf('id="features"')
assert.equal(homepage.indexOf('id="how-it-works"'), -1)
assert.ok(carouselAt > -1 && practiceAt > carouselAt, 'carousel sits above practice types')
assert.ok(featuresAt > practiceAt && testimonialsAt > featuresAt, 'testimonials sit below features')
assert.match(homepage, /components:\s*\{\s*TutorialCarousel,\s*TestimonialsCarousel\s*\}/)

assert.match(component, /youtubeNoCookieEmbedSrc/)
const embed = readFileSync(join(root, 'resources/js/scripts/seo/youtubeEmbed.js'), 'utf8')
assert.match(embed, /youtube-nocookie\.com/)
assert.match(component, /hide\.bs\.modal/)
assert.match(component, /playerSrc\.value = ''/)
assert.match(component, /loading="lazy"/)
assert.match(component, /aspect-ratio: 16 \/ 9/)
assert.match(component, /prefers-reduced-motion: reduce/)
assert.match(component, /TUTORIALS_PAGE_PATH/)
assert.match(component, /:disabled="atStart"/)
assert.match(component, /:disabled="atEnd"/)
assert.match(component, /pointerType !== 'mouse'/)
assert.match(component, /min-width: 768px/)
assert.match(component, /min-width: 1200px/)
assert.match(component, /max-width: 767\.98px/)
assert.match(component, /grid-auto-columns: 100%/)
assert.match(component, /\/ 3\)/)
assert.doesNotMatch(component, /\/ 2\)/)
assert.doesNotMatch(component, /setInterval|data-bs-ride|data-bs-interval/)
assert.match(component, /v-if="playerSrc"/)
assert.match(component, /import Modal from 'bootstrap\/js\/dist\/modal'/)

for (const locale of locales) {
  const messages = JSON.parse(readFileSync(join(root, `resources/js/locales/${locale}.json`), 'utf8'))
  const copy = messages.homepage?.tutorials
  assert.ok(copy, `${locale} homepage.tutorials`)
  for (const key of ['title', 'subtitle', 'watchAll', 'regionLabel', 'previous', 'next', 'watch', 'unavailable']) {
    assert.equal(typeof copy[key], 'string', `${locale} ${key}`)
    assert.ok(copy[key].trim().length > 0, `${locale} ${key} empty`)
  }
}

assert.equal(JSON.parse(readFileSync(join(root, 'resources/js/locales/en.json'), 'utf8')).homepage.tutorials.title, 'See Mutqin in practice')
assert.match(
  JSON.parse(readFileSync(join(root, 'resources/js/locales/en.json'), 'utf8')).homepage.tutorials.subtitle,
  /memorising, revising/,
)

console.log('tutorial-carousel.test.mjs: ok')
