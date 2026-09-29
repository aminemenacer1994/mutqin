import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const i18nSource = readFileSync(join(root, 'resources/js/i18n.js'), 'utf8')
const appSource = readFileSync(join(root, 'resources/js/app.js'), 'utf8')
const mixSource = readFileSync(join(root, 'webpack.mix.cjs'), 'utf8')
const bladeSource = readFileSync(join(root, 'resources/views/layouts/app.blade.php'), 'utf8')

assert.match(i18nSource, /import enMessages from '\.\/locales\/en\.json'/)
assert.doesNotMatch(
  i18nSource,
  /import (fr|es|ar|id|tr|ur)Messages from/,
  'non-English locale packs must stay out of the app.js critical path'
)
assert.match(i18nSource, /webpackChunkName: "locale-fr"/)
assert.match(i18nSource, /webpackChunkName: "locale-es"/)
assert.match(i18nSource, /webpackChunkName: "locale-ar"/)

assert.doesNotMatch(appSource, /locales\/en\.json/, 'app.js must reuse i18n.js English messages')
assert.doesNotMatch(appSource, /info-pages\.css|about-page\.css|pricing-page\.css|SessionAnalysisOverview\.css/)

assert.match(mixSource, /locale-\(\?:fr\|es\|ar\|id\|tr\|ur\)/)

assert.match(bladeSource, /array_merge\(\$switcherLocales/)
assert.doesNotMatch(
  bladeSource,
  /trans\('ui', \[\], 'ur'\)/,
  'layout HTML must not embed every document locale on every page'
)

console.log('i18n-lazy-locales.test.mjs: ok')
