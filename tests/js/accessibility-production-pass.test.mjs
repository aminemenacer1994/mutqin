import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (path) => readFileSync(join(root, path), 'utf8')

const modalFocusJs = read('resources/js/utils/modalFocus.js')
const appBlade = read('resources/views/layouts/app.blade.php')
const appScss = read('resources/sass/app.scss')
const memorisationVue = read('resources/js/views/Memorisation.vue')
const memorisationJs = read('resources/js/views/Memorisation.js')
const dashboardVue = read('resources/js/views/Dashboard.vue')
const pricingVue = read('resources/js/views/PricingPage.vue')
const homepageVue = read('resources/js/views/Homepage.vue')
const loginBlade = read('resources/views/auth/login.blade.php')
const registerBlade = read('resources/views/auth/register.blade.php')
const feedbackVue = read('resources/js/components/FeedbackModal.vue')
const ayahNotesVue = read('resources/js/components/AyahNotesModal.vue')
const aiConsentVue = read('resources/js/components/AiAudioConsentModal.vue')
const amdVue = read('resources/js/components/AiMemorisationDetectionModal.vue')
const errorBlade = read('resources/views/layouts/error.blade.php')
const profileBlade = read('resources/views/profile.blade.php')
const viewportConfetti = read('resources/js/utils/viewportConfetti.js')

{
  assert.match(modalFocusJs, /export const FOCUSABLE_SELECTOR/)
  assert.match(modalFocusJs, /button:not\(\[disabled\]\)/)
  assert.match(modalFocusJs, /export function captureReturnFocus/)
  assert.match(modalFocusJs, /export function restoreReturnFocus/)
  assert.match(modalFocusJs, /export function trapFocusInContainer/)
  assert.match(modalFocusJs, /export function handleModalKeydown/)
  assert.match(modalFocusJs, /export function getFocusableElements/)
  assert.match(modalFocusJs, /typeof HTMLElement !== 'undefined'/)
}

{
  assert.match(appBlade, /<html lang="\{\{ \$appLocale \}\}" dir="\{\{ \$appDirection \}\}"/)
  assert.match(appBlade, /skip-link.*#mainContent/)
  assert.match(appBlade, /<main id="mainContent" tabindex="-1">/)
  assert.match(appScss, /:focus-visible/)
  assert.match(appScss, /prefers-reduced-motion: reduce/)
  assert.match(appScss, /\.sr-only/)
  assert.match(appScss, /min-height: 44px/)
}

{
  assert.match(loginBlade, /aria-invalid="true"/)
  assert.match(loginBlade, /aria-describedby="loginEmailError"/)
  assert.match(registerBlade, /aria-describedby="registerPasswordError"/)
  assert.match(profileBlade, /aria-invalid="true"/)
  assert.match(profileBlade, /aria-describedby=/)
}

{
  assert.match(dashboardVue, /<main id="mainContent"/)
  assert.match(dashboardVue, /role="status" aria-live="polite"/)
  assert.match(pricingVue, /aria-pressed=/)
  assert.match(pricingVue, /role="group"/)
  assert.match(homepageVue, /contactNameError/)
  assert.match(homepageVue, /aria-invalid=/)
}

{
  assert.match(memorisationVue, /role="dialog" aria-modal="true"/)
  assert.match(memorisationVue, /aiRecallModeAnnouncement/)
  assert.match(memorisationVue, /onToolsPanelKeydown/)
  assert.match(memorisationVue, /onWorkspaceTourKeydown/)
  assert.match(memorisationVue, /confirmModalDialog/)
  assert.match(memorisationJs, /from '\.\.\/utils\/modalFocus'/)
  assert.match(memorisationJs, /syncAiRecallModeAnnouncement/)
  assert.match(amdVue, /aria-live="polite"/)
  assert.match(amdVue, /trapFocus/)
}

{
  assert.match(feedbackVue, /from '\.\.\/utils\/modalFocus'/)
  assert.match(feedbackVue, /onDialogKeydown/)
  assert.match(ayahNotesVue, /onOverlayKeydown/)
  assert.match(aiConsentVue, /onOverlayKeydown/)
}

{
  assert.match(errorBlade, /:focus-visible/)
  assert.match(errorBlade, /prefers-reduced-motion: reduce/)
  assert.match(viewportConfetti, /prefers-reduced-motion/)
}

console.log('accessibility-production-pass.test.mjs: ok')
