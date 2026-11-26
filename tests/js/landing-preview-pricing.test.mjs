import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const billing = readFileSync(join(root, 'config/billing.php'), 'utf8')
const en = JSON.parse(readFileSync(join(root, 'resources/js/locales/en.json'), 'utf8'))
const pricing = readFileSync(join(root, 'resources/js/views/PricingPage.vue'), 'utf8')

const preview = en.pricingPage?.preview
assert.ok(preview?.title)
assert.ok(preview?.disclaimer)
assert.ok(preview?.teacherNote)
assert.ok(preview?.institutionNote)
assert.ok(preview?.limitsNote)
assert.ok(preview?.pdfMismatchNote)

assert.match(preview.pdfMismatchNote, /5\.99/)
assert.match(preview.pdfMismatchNote, /4\.99/)
assert.match(preview.teacherNote, /not available|not connected/i)

assert.match(preview.pdfMismatchNote, /£7\.99/)
assert.match(preview.institutionNote, /£24\.99/)
assert.doesNotMatch(preview.subtitle, /£[0-9]/)

const plusMonthly = billing.match(/premiumPlusMonthlyPence = (\d+)/)?.[1]
assert.equal(Number(plusMonthly), 499)

assert.match(pricing, /pricing-preview-notes/)
assert.match(pricing, /billingDisplay\.freeChecks/)
assert.match(pricing, /billingDisplay\.premiumChecks/)
assert.match(pricing, /pricingT\('disclaimer'\)/)

console.log('landing-preview-pricing.test.mjs: ok')