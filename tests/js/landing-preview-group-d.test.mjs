import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const billing = readFileSync(join(root, 'config/billing.php'), 'utf8')
const en = JSON.parse(readFileSync(join(root, 'resources/js/locales/en.json'), 'utf8'))
const audience = readFileSync(join(root, 'resources/js/views/PreviewAudiencePage.vue'), 'utf8')
const homepage = readFileSync(join(root, 'resources/js/views/Homepage.vue'), 'utf8')
const assets = readFileSync(join(root, 'app/Support/LandingPreviewAssets.php'), 'utf8')

const freeAi = Number(billing.match(/BILLING_FREE_AI_ASSESSMENTS_PER_DAY',\s*(\d+)/)?.[1] ?? 5)
const premiumAi = Number(billing.match(/BILLING_PREMIUM_AI_ASSESSMENTS_PER_DAY',\s*(\d+)/)?.[1] ?? 20)
const freeSessions = Number(billing.match(/BILLING_FREE_SAVED_SESSIONS',\s*(\d+)/)?.[1] ?? 5)
const premiumSessions = Number(billing.match(/BILLING_PREMIUM_SAVED_SESSIONS',\s*(\d+)/)?.[1] ?? 10)

assert.ok(freeAi > 0 && premiumAi > freeAi, 'billing AI limits should increase on Premium')
assert.ok(premiumSessions >= freeSessions, 'billing saved-session limits should not shrink on Premium')

const learning = en.previewLearning
const institutions = en.previewInstitutions

assert.ok(learning?.hero?.title)
assert.ok(institutions?.hero?.title)
assert.match(learning.footnote, /entitlement/i)
assert.doesNotMatch(learning.premium.note, /session history/i, 'Premium is higher limits, not exclusive history')
assert.match(learning.capabilities.items.aiRecite.body, /daily allowance/i)
assert.match(institutions.capabilities.items.staff.body, /audited|enabled/i)
assert.match(institutions.capabilities.items.scope.body, /not built/i)
assert.match(institutions.footnote, /teacher features/i)

for (const key of ['memorise', 'revise', 'aiRecite', 'account']) {
  assert.ok(learning.capabilities.items[key]?.title, `learning capability ${key}`)
}

for (const key of ['staff', 'classes', 'consent', 'scope']) {
  assert.ok(institutions.capabilities.items[key]?.title, `institution capability ${key}`)
}

const learningShots = [learning.spotlights.primary.asset, learning.spotlights.secondary.asset]
for (const asset of learningShots) {
  assert.match(asset, /^\/images\/landing\//, 'learning spotlights use public landing captures')
  const file = join(root, 'public', asset.replace(/^\//, ''))
  assert.ok(existsSync(file), `missing landing image ${asset}`)
}

const institutionAssets = [institutions.spotlights.primary.asset, institutions.spotlights.secondary.asset]
assert.equal(institutions.spotlights.secondary.asset, 'assignments', 'institutions secondary uses programme assignments list')
for (const asset of institutionAssets) {
  assert.match(assets, new RegExp(`'${asset}'`))
  const file = join(root, 'resources/marketing/preview-2.0', `${asset}.png`)
  assert.ok(existsSync(file), `missing protected preview asset ${asset}.png`)
}

assert.match(audience, /showPremiumCallout/)
assert.match(audience, /learning.*institutions/s)
assert.doesNotMatch(audience, /route\(['"]register|\/signup|createAccount/i, 'no duplicate account flows')

assert.match(homepage, /\/preview\/learning/)
assert.match(homepage, /\/preview\/institutions/)

for (const blade of ['learning', 'institutions']) {
  assert.ok(existsSync(join(root, `resources/views/preview/${blade}.blade.php`)))
}

console.log(
  `landing-preview-group-d.test.mjs: ok (free ai/day=${freeAi}, premium ai/day=${premiumAi}, saved sessions ${freeSessions}→${premiumSessions})`,
)