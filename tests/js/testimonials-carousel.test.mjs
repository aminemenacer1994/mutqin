import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TESTIMONIALS, testimonialInitials } from '../../resources/js/config/testimonials.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const homepage = readFileSync(join(root, 'resources/js/views/Homepage.vue'), 'utf8')
const component = readFileSync(join(root, 'resources/js/components/TestimonialsCarousel.vue'), 'utf8')
const locales = ['en', 'fr', 'es', 'ar', 'id', 'tr', 'ur']

assert.equal(TESTIMONIALS.length, 6)
assert.equal(new Set(TESTIMONIALS.map((item) => item.id)).size, 6)
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

const tutorialsAt = homepage.indexOf('<tutorial-carousel')
const testimonialsAt = homepage.indexOf('<testimonials-carousel')
const practiceAt = homepage.indexOf('class="practice-types"')
const featuresAt = homepage.indexOf('id="features"')
const faqAt = homepage.indexOf('id="faq"')
assert.equal(homepage.indexOf('id="how-it-works"'), -1)
assert.equal(homepage.indexOf('id="purpose"'), -1)
assert.ok(
  tutorialsAt > -1
  && practiceAt > tutorialsAt
  && featuresAt > practiceAt
  && testimonialsAt > featuresAt
  && faqAt > testimonialsAt,
  'testimonials sit below Built for Hifz (features)',
)
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
assert.match(component, /min-width: 1200px/)
assert.match(component, /var\(--testimonial-peek\)/)
assert.match(component, /\/ 2\)/)
assert.match(component, /\/ 3\)/)
assert.doesNotMatch(component, /\/ 4\)/)
assert.match(component, /aria-roledescription="carousel"/)
assert.match(component, /bi-quote/)
assert.doesNotMatch(component, /bi-star|swiper|aria-label="[^"]*rating|review count/i)
assert.doesNotMatch(readFileSync(join(root, 'resources/js/config/testimonials.js'), 'utf8'), /★|bi-star|stars?:/i)

for (const locale of locales) {
  const messages = JSON.parse(readFileSync(join(root, `resources/js/locales/${locale}.json`), 'utf8'))
  const copy = messages.homepage?.testimonials
  assert.ok(copy, `${locale} homepage.testimonials`)
  for (const key of ['title', 'subtitle', 'regionLabel', 'previous', 'next']) {
    assert.equal(typeof copy[key], 'string', `${locale} ${key}`)
    assert.ok(copy[key].trim().length > 0, `${locale} ${key} empty`)
  }
}

const english = JSON.parse(readFileSync(join(root, 'resources/js/locales/en.json'), 'utf8')).homepage.testimonials
assert.equal(english.title, 'Words from Our Community')
assert.match(english.subtitle, /memorising and revising the Qur'an with Mutqin/)

console.log('testimonials-carousel.test.mjs: ok')
