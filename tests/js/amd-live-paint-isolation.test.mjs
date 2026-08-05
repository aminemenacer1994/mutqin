import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const memorisationJs = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const modalVue = readFileSync(join(root, 'resources/js/components/AiMemorisationDetectionModal.vue'), 'utf8')

// Main mushaf must not paint while the AMD modal owns the surface.
{
  const fn = memorisationJs.match(/shouldShowRecitationReviewHighlights\(ayahKey\) \{[\s\S]*?\n    \}/)?.[0] || ''
  assert.match(fn, /if \(this\.amdOpen\) return false/, 'AMD open must suppress page-level review highlights')
  assert.doesNotMatch(
    fn,
    /if \(this\.amdOpen && \(this\.recitationCheckRecording/,
    'page must not opt into dual paint while AMD is open',
  )
}

// Live listening must not rebuild the mushaf via syncAmdMushafSurface without force.
{
  const fn = memorisationJs.match(/syncAmdMushafSurface\(\{ force = false \} = \{\}\) \{[\s\S]*?\n    \},/)?.[0] || ''
  assert.match(fn, /listening && !force/, 'syncAmdMushafSurface must guard mid-listen rebuilds')
  assert.match(fn, /patchAmdLiveWordStatuses\(\[\]\)/, 'unguarded sync must fall back to patches only')
}

// Empty AMD DOM flush must not trigger a full surface rebuild.
{
  const fn = memorisationJs.match(/flushLiveWordDomPatches\(\) \{[\s\S]*?\n    \},/)?.[0] || ''
  assert.match(fn, /if \(changedWords\.length\) this\.patchAmdLiveWordStatuses\(changedWords\)/)
  assert.doesNotMatch(
    fn,
    /else this\.syncAmdMushafSurface\(\)/,
    'empty AMD flush must not call syncAmdMushafSurface',
  )
}

// Modal must not serialise el.innerHTML to detect no-op updates.
{
  assert.match(modalVue, /_lastMushafHtml/)
  assert.match(modalVue, /this\._lastMushafHtml === next/)
  assert.doesNotMatch(
    modalVue,
    /if \(el\.innerHTML === next\)/,
    'reading el.innerHTML serialises the mushaf and freezes longer ranges',
  )
}

// HTML builder must stay side-effect free (no reactive cursor writes).
{
  const fn = memorisationJs.match(/buildAmdMushafHtml\(\{ live = true, result = null \} = \{\}\) \{[\s\S]*?\n    \},/)?.[0] || ''
  assert.doesNotMatch(
    fn,
    /this\.amdLiveCursor\s*=/,
    'buildAmdMushafHtml must not mutate amdLiveCursor',
  )
}

// Missing modal ref must not recurse into sync while the mic is live.
{
  const fn = memorisationJs.match(/patchAmdLiveWordStatuses\(changedWords = \[\]\) \{[\s\S]*?\n    \},/)?.[0] || ''
  assert.match(
    fn,
    /if \(!this\.recitationCheckRecording\) this\.syncAmdMushafSurface\(\{ force: true \}\)/,
    'patch fallback rebuild must be gated off during live recording',
  )
}

console.log('amd-live-paint-isolation: ok')
