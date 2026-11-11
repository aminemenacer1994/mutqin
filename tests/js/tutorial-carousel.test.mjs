import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  FEATURED_TUTORIAL_URL,
  HOMEPAGE_TUTORIAL_VISIBLE_COUNT,
  TUTORIALS_PAGE_PATH,
  TUTORIAL_VIDEOS,
  featuredTutorial,
  formatTutorialDuration,
  homepageTutorialVideos,
  tutorialDurationLabel,
  tutorialThumbnailUrl,
  tutorialVideosInOrder,
} from '../../resources/js/config/tutorialVideos.js'
import { TESTIMONIALS_SECTION_ENABLED } from '../../resources/js/config/testimonials.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const homepage = readFileSync(join(root, 'resources/js/views/Homepage.vue'), 'utf8')
const component = readFileSync(join(root, 'resources/js/components/TutorialCarousel.vue'), 'utf8')
const locales = ['en', 'fr', 'es', 'ar', 'id', 'tr', 'ur']

const ids = [
  'ZWi0qKw7y7E',
  'ecSmacClOSw',
  'VpIf9YexD0E',
  '8xrNze6_3Ms',
  'sEIK13nKxEw',
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
assert.equal(HOMEPAGE_TUTORIAL_VISIBLE_COUNT, 6)
assert.equal(homepageTutorialVideos().length, 6)
assert.deepEqual(
  homepageTutorialVideos().map((video) => video.id),
  ids.slice(0, 6),
)
assert.match(component, /homepageTutorialVideos/)

for (const video of ordered) {
  assert.match(video.feature, /\S/)
  assert.match(video.tagline, /\S/)
  assert.match(video.description, /\S/)
  assert.match(video.youtubeTitle, /Mutqin/)
  assert.equal(tutorialThumbnailUrl(video.id), `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`)
}

assert.equal(ordered[0].feature, 'Progressive Hiding')
assert.equal(ordered[0].id, 'ZWi0qKw7y7E')
assert.equal(ordered[1].feature, 'Listen & Repeat')
assert.equal(ordered[2].feature, 'Tajweed Colours')
assert.equal(ordered[3].feature, 'Saved Sessions')
assert.equal(ordered[7].feature, 'Mustahabbat')
assert.equal(tutorialThumbnailUrl('not-an-id'), '')
assert.equal(FEATURED_TUTORIAL_URL, '')
assert.equal(featuredTutorial(), null)
assert.equal(formatTutorialDuration(48), '0:48')
assert.equal(formatTutorialDuration(67), '1:07')
assert.equal(formatTutorialDuration(0), '')
assert.equal(tutorialDurationLabel('u9B3FyKnqn4'), '0:48')
assert.equal(tutorialDurationLabel('missing-id'), '')
for (const video of homepageTutorialVideos()) {
  assert.equal(video.destination, '/memorisation')
  assert.match(video.featureId, /^[a-z0-9-]+$/)
  assert.ok(tutorialDurationLabel(video.id))
}

const carouselAt = homepage.indexOf('<tutorial-carousel')
const practiceAt = homepage.indexOf('class="practice-types"')
const testimonialsAt = homepage.indexOf('<testimonials-carousel')
const featuresAt = homepage.indexOf('id="features"')
const faqAt = homepage.indexOf('id="faq"')
assert.equal(homepage.indexOf('id="how-it-works"'), -1)
assert.ok(carouselAt > -1 && practiceAt > carouselAt, 'carousel sits above practice types')
if (TESTIMONIALS_SECTION_ENABLED) {
  assert.ok(featuresAt > practiceAt && testimonialsAt > featuresAt, 'testimonials sit below features')
} else {
  assert.ok(featuresAt > practiceAt && faqAt > featuresAt, 'FAQ follows features when testimonials are hidden')
}
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
assert.match(component, /tutorials__grid/)
assert.match(component, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/)
assert.match(component, /text-align: center/)
assert.match(component, /border-block:/)
assert.doesNotMatch(component, /tutorials__arrow/)
assert.doesNotMatch(component, /aria-roledescription="carousel"/)
assert.doesNotMatch(component, /grid-auto-columns/)
assert.doesNotMatch(component, /setInterval|data-bs-ride|data-bs-interval/)
assert.match(component, /v-if="playerSrc"/)
assert.match(component, /import Modal from 'bootstrap\/js\/dist\/modal'/)
assert.match(component, /tutorials__duration/)
assert.doesNotMatch(component, /tutorials__try|tryFeature/)
assert.match(component, /mountTutorialPlayback/)
assert.match(component, /trackTutorialImpression/)
assert.match(component, /v-if="featured"/)
assert.doesNotMatch(component, /FEATURED_TUTORIAL_URL\s*=\s*'https?:/)

for (const locale of locales) {
  const messages = JSON.parse(readFileSync(join(root, `resources/js/locales/${locale}.json`), 'utf8'))
  const copy = messages.homepage?.tutorials
  assert.ok(copy, `${locale} homepage.tutorials`)
  for (const key of ['title', 'subtitle', 'watchAll', 'regionLabel', 'previous', 'next', 'watch', 'duration', 'unavailable']) {
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
