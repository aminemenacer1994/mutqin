import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const homepage = readFileSync(join(root, 'resources/js/views/Homepage.vue'), 'utf8')
const css = readFileSync(join(root, 'resources/js/views/Homepage.css'), 'utf8')
const bootstrap = readFileSync(join(root, 'resources/js/bootstrap.js'), 'utf8')
const en = readFileSync(join(root, 'resources/js/locales/en.json'), 'utf8')

assert.match(homepage, /v-if="isFeaturesMobile"/)
assert.match(homepage, /v-if="!isFeaturesMobile"/)
assert.match(homepage, /class="carousel slide features__carousel"/)
assert.match(homepage, /class="features__carousel-media"/)
assert.match(homepage, /class="features__copy features__copy--carousel"/)
assert.match(homepage, /class="carousel-indicators features__carousel-indicators"/)
assert.match(homepage, /activeFeature\.title/)
assert.match(homepage, /slid\.bs\.carousel/)
assert.doesNotMatch(homepage, /class="features__carousel-slide"/)
assert.match(homepage, /data-bs-touch="true"/)
assert.match(homepage, /data-bs-wrap="true"/)
assert.match(homepage, /const FEATURES_CAROUSEL_START_INDEX = 2/)
assert.match(homepage, /const FEATURES_MOBILE_MQ = '\(max-width: 767\.98px\)'/)
assert.match(homepage, /featuresCarousel\.to\(FEATURES_CAROUSEL_START_INDEX\)/)
assert.doesNotMatch(homepage, /carousel-control-prev/)
assert.doesNotMatch(homepage, /carousel-control-next/)

assert.match(bootstrap, /import Carousel from 'bootstrap\/js\/dist\/carousel'/)
assert.match(en, /"carouselLabel": "Feature screenshots"/)

assert.match(css, /\.features__carousel-media \{/)
assert.match(css, /\.features__carousel-indicators \{/)
assert.match(css, /\.features__copy--carousel \{[\s\S]*?max-width: 36ch;/)
assert.match(css, /\.features__carousel \.shot \{[\s\S]*?pointer-events: none;/)

console.log('homepage-features-carousel.test.mjs: ok')
