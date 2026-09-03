import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  capturePreRegistrationGuestResumeSnapshot,
  hasPreRegistrationGuestResumeEvidence,
  pickPreRegistrationGuestContinuePayload,
} from '../../resources/js/scripts/session/preRegistrationGuestResume.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const memorisationJs = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')

function createMemoryStorage() {
  const map = new Map()
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null
    },
    setItem(key, value) {
      map.set(key, String(value))
    },
    removeItem(key) {
      map.delete(key)
    },
    key(index) {
      return [...map.keys()][index] ?? null
    },
    get length() {
      return map.size
    },
  }
}

{
  const local = createMemoryStorage()
  const session = createMemoryStorage()
  local.setItem('mutqin.continueSession', JSON.stringify({
    config: { chapterId: 1, rangeStart: 1, rangeEnd: 3 },
    mode: 'advanced',
  }))

  const snapshot = capturePreRegistrationGuestResumeSnapshot({ localStorage: local, sessionStorage: session })
  assert.ok(hasPreRegistrationGuestResumeEvidence(snapshot))
  const payload = pickPreRegistrationGuestContinuePayload(snapshot)
  assert.equal(payload.config.chapterId, 1)
  assert.equal(payload.mode, 'advanced')
}

{
  const local = createMemoryStorage()
  const session = createMemoryStorage()
  local.setItem('mutqin.mode.advanced', JSON.stringify({
    chapterId: 67,
    rangeStart: 1,
    rangeEnd: 4,
  }))
  local.setItem('mutqin.sessionState.advanced', JSON.stringify({
    queueIndex: 2,
    activeVerseKey: '67:3',
  }))

  const snapshot = capturePreRegistrationGuestResumeSnapshot({ localStorage: local, sessionStorage: session })
  const payload = pickPreRegistrationGuestContinuePayload(snapshot)
  assert.equal(payload.config.chapterId, 67)
  assert.equal(payload.activeVerseKey, '67:3')
}

{
  assert.match(memorisationJs, /capturePreRegistrationGuestResumeSnapshot/)
  assert.match(memorisationJs, /maybeShowRegistrationResumeModal/)
  assert.match(memorisationJs, /shouldDeferRegistrationFirstRunPrompts/)
  assert.match(memorisationJs, /finalizeRegistrationFirstRunPrompts/)
  assert.match(memorisationJs, /preferRegistrationResume/)
}

console.log('pre-registration-guest-resume passed')
