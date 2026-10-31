import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createI18n } from 'vue-i18n'
import { cspSafeMessageCompiler } from '../../resources/js/utils/cspSafeMessageCompiler.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const compilerSource = readFileSync(join(root, 'resources/js/utils/cspSafeMessageCompiler.js'), 'utf8')
const i18nSource = readFileSync(join(root, 'resources/js/i18n.js'), 'utf8')

assert.doesNotMatch(compilerSource, /new Function/)
assert.match(i18nSource, /messageCompiler:\s*cspSafeMessageCompiler/)

function ctxFor(values, pluralIndex = 0) {
  return {
    named: (key) => values[key],
    list: (index) => values[index],
    interpolate: (value) => (value == null ? '' : String(value)),
    normalize: (parts) => parts.join(''),
    plural: (forms) => forms[pluralIndex] ?? forms[forms.length - 1],
  }
}

const plain = cspSafeMessageCompiler('Hello')
assert.equal(plain(ctxFor({})), 'Hello')

const named = cspSafeMessageCompiler('Ayah {ayah}')
assert.equal(named(ctxFor({ ayah: 5 })), 'Ayah 5')

const unicode = cspSafeMessageCompiler('آية {آية}')
assert.equal(unicode(ctxFor({ آية: 2 })), 'آية 2')

const literal = cspSafeMessageCompiler("you{'@'}example.com")
assert.equal(literal(ctxFor({})), 'you@example.com')

const plural = cspSafeMessageCompiler('{count} result|{count} results')
assert.equal(plural(ctxFor({ count: 1 }, 0)), '1 result')
assert.equal(plural(ctxFor({ count: 3 }, 1)), '3 results')

const icu = cspSafeMessageCompiler('{n, plural, one {# missed} other {# missed}}', { locale: 'en' })
assert.equal(icu(ctxFor({ n: 1 })), '1 missed')
assert.equal(icu(ctxFor({ n: 4 })), '4 missed')

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messageCompiler: cspSafeMessageCompiler,
  messages: {
    en: {
      greeting: 'Ayah {ayah}',
      email: "you{'@'}example.com",
    },
  },
})

assert.equal(i18n.global.t('greeting', { ayah: 7 }), 'Ayah 7')
assert.equal(i18n.global.t('email'), 'you@example.com')

console.log('csp-message-compiler.test.mjs: ok')
