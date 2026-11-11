import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  TESTIMONIALS,
  TESTIMONIALS_SECTION_ENABLED,
  localTestimonialPreviewRequested,
  publicTestimonials,
  testimonialImageSrc,
  testimonialInitials,
} from '../../resources/js/config/testimonials.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const homepage = readFileSync(join(root, 'resources/js/views/Homepage.vue'), 'utf8')
const component = readFileSync(join(root, 'resources/js/components/TestimonialsCarousel.vue'), 'utf8')
const locales = ['en', 'fr', 'es', 'ar', 'id', 'tr', 'ur']

assert.equal(TESTIMONIALS.length, 6)
assert.equal(new Set(TESTIMONIALS.map((item) => item.id)).size, 6)
assert.ok(TESTIMONIALS.every((item) => item.placeholder === true && item.published === false))
assert.equal(publicTestimonials().length, 0)
assert.deepEqual(TESTIMONIALS.map((item) => item.name), [
  'Ahmed',
  'Maryam',
  'Yusuf',
  'Aisha',
  'Ibrahim',
  'Fatima',
])
assert.equal(TESTIMONIALS[0].role, 'Hifz Student')
assert.match(TESTIMONIALS[0].quote, /revision organised/)
assert.match(TESTIMONIALS[5].quote, /kept simple/)
assert.equal(testimonialInitials('Ahmed'), 'A')
assert.equal(testimonialInitials('Fatima Noor'), 'FN')
assert.equal(testimonialImageSrc('/images/landing/person.jpg'), '/images/landing/person.jpg')
assert.equal(testimonialImageSrc('https://example.com/a.jpg'), '')
assert.deepEqual(
  publicTestimonials([
    { id: 'later', name: 'Noor', quote: 'Second.', published: true, order: 20 },
    { id: 'sample', name: 'Sample', quote: 'Hidden.', published: true, placeholder: true, order: 1 },
    { id: 'first', name: 'Huda', quote: 'First.', published: true, order: 10 },
  ]).map((item) => item.id),
  ['first', 'later'],
)

{
  const previous = globalThis.window
  globalThis.window = { location: { hostname: 'mutqin.ai', search: '?previewTestimonials=1' } }
  assert.equal(localTestimonialPreviewRequested(), false)
  globalThis.window = { location: { hostname: '127.0.0.1', search: '?previewTestimonials=1' } }
  assert.equal(localTestimonialPreviewRequested(), true)
  globalThis.window = { location: { hostname: '127.0.0.1', search: '' } }
  assert.equal(localTestimonialPreviewRequested(), false)
  if (previous === undefined) delete globalThis.window
  else globalThis.window = previous
}

const tutorialsAt = homepage.indexOf('<tutorial-carousel')
const testimonialsAt = homepage.indexOf('<testimonials-carousel')
const practiceAt = homepage.indexOf('class="practice-types"')
const featuresAt = homepage.indexOf('id="features"')
const faqAt = homepage.indexOf('id="faq"')
assert.equal(homepage.indexOf('id="how-it-works"'), -1)
assert.equal(homepage.indexOf('id="purpose"'), -1)
assert.equal(TESTIMONIALS_SECTION_ENABLED, false)
assert.match(homepage, /showTestimonialsSection/)
assert.match(homepage, /v-if="showTestimonialsSection"/)
if (TESTIMONIALS_SECTION_ENABLED) {
  assert.ok(
    tutorialsAt > -1
    && practiceAt > tutorialsAt
    && featuresAt > practiceAt
    && testimonialsAt > featuresAt
    && faqAt > testimonialsAt,
    'testimonials sit below Built for Hifz (features)',
  )
} else {
  assert.ok(featuresAt > practiceAt && faqAt > featuresAt, 'FAQ follows features when testimonials are hidden')
}
assert.match(homepage, /TestimonialsCarousel/)

assert.match(component, /autoplay:\s*\{\s*type:\s*Boolean,\s*default:\s*false\s*\}/)
assert.match(component, /AUTOPLAY_MS = 7000/)
assert.match(component, /SCROLL_MS = 520/)
assert.match(component, /prefers-reduced-motion: reduce/)
assert.match(component, /prefersReducedMotion/)
assert.match(component, /:disabled="atStart"/)
assert.match(component, /:disabled="atEnd"/)
assert.match(component, /pointerType !== 'mouse'/)
assert.match(component, /max-width: 767\.98px/)
assert.match(component, /min-width: 768px/)
assert.match(component, /min-width: 1320px/)
assert.match(component, /min-width: 640px/)
assert.match(component, /min-width: 1024px/)
assert.match(component, /COLUMN_FOUR = 1024/)
assert.match(component, /--testimonial-columns/)
assert.match(component, /var\(--testimonial-peek\)/)
assert.match(component, /publicTestimonials/)
assert.match(component, /localTestimonialPreviewRequested/)
assert.match(component, /testimonial_section_view|trackTestimonialSectionView/)
assert.match(component, /IntersectionObserver/)
assert.match(component, /homepage\.testimonials\.ctaAction/)
assert.match(component, /community_testimonial/)
assert.match(component, /publication_consent/)
assert.doesNotMatch(component, /#241f1b|#e8bf8f/)
assert.match(component, /aria-roledescription="carousel"/)
assert.match(component, /bi-quote/)
assert.doesNotMatch(component, /bi-star|swiper|aria-label="[^"]*rating|review count/i)
assert.doesNotMatch(readFileSync(join(root, 'resources/js/config/testimonials.js'), 'utf8'), /★|bi-star|stars?:/i)

for (const locale of locales) {
  const messages = JSON.parse(readFileSync(join(root, `resources/js/locales/${locale}.json`), 'utf8'))
  const copy = messages.homepage?.testimonials
  assert.ok(copy, `${locale} homepage.testimonials`)
  for (const key of ['title', 'subtitle', 'regionLabel', 'previous', 'next', 'ctaTitle', 'ctaText', 'ctaAction', 'share', 'consent']) {
    assert.equal(typeof copy[key], 'string', `${locale} ${key}`)
    assert.ok(copy[key].trim().length > 0, `${locale} ${key} empty`)
  }
}

const english = JSON.parse(readFileSync(join(root, 'resources/js/locales/en.json'), 'utf8')).homepage.testimonials
assert.equal(english.title, 'Words from Our Community')
assert.match(english.subtitle, /memorising and revising the Qur'an with Mutqin/)

console.log('testimonials-carousel.test.mjs: ok')
