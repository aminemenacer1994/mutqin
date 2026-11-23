import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  PRACTICE_SELF_TOOL_IDS,
  practiceSessionContext,
  practiceToolHref,
} from '../../resources/js/scripts/dashboard/studentPractice.js'
import {
  acceptRecitationProviderResponse,
  attemptAffectsScoring,
  classifyRecitationAttempt,
} from '../../resources/js/scripts/audio/recitationAttemptGuard.js'

const base = '/memorisation?ignored=1'

assert.deepEqual(PRACTICE_SELF_TOOL_IDS, [
  'memorise', 'revise', 'recite', 'mushaf', 'hide', 'listen', 'one', 'find', 'saved',
])

const memorise = new URL(practiceToolHref(base, 'memorise'), 'https://mutqin.test')
assert.equal(memorise.searchParams.get('setup'), '1')
assert.equal(memorise.searchParams.get('goal'), 'memorise')
assert.equal(memorise.searchParams.get('return'), 'dashboard')
assert.equal(memorise.searchParams.get('return_tab'), 'home')
assert.equal(memorise.searchParams.get('assignment_recipient'), null)

const revise = new URL(practiceToolHref(base, 'revise'), 'https://mutqin.test')
assert.equal(revise.searchParams.get('goal'), 'revise')

const recite = new URL(practiceToolHref(base, 'recite'), 'https://mutqin.test')
assert.equal(recite.searchParams.get('goal'), 'test')
assert.equal(recite.searchParams.get('assignment_recipient'), null)

const mushaf = new URL(practiceToolHref(base, 'mushaf'), 'https://mutqin.test')
assert.equal(mushaf.searchParams.get('view'), 'madani_mushaf')

const hide = new URL(practiceToolHref(base, 'hide'), 'https://mutqin.test')
assert.equal(hide.searchParams.get('technique'), 'blur')
assert.equal(hide.searchParams.get('setup'), '1')

const listen = new URL(practiceToolHref(base, 'listen'), 'https://mutqin.test')
assert.equal(listen.searchParams.get('practice_tool'), 'talqin')
assert.equal(listen.searchParams.has('technique'), false)

const one = new URL(practiceToolHref(base, 'one'), 'https://mutqin.test')
assert.equal(one.searchParams.get('practice_tool'), 'focus')

const find = new URL(practiceToolHref(base, 'find'), 'https://mutqin.test')
assert.equal(find.searchParams.get('panel'), 'find')
assert.equal(find.searchParams.get('return_tab'), 'home')
assert.equal(find.searchParams.get('assignment_recipient'), null)

const saved = new URL(practiceToolHref(base, 'saved'), 'https://mutqin.test')
assert.equal(saved.searchParams.get('panel'), 'saved')
assert.equal(saved.searchParams.get('return'), 'dashboard')

assert.equal(practiceSessionContext(0), 'practice')
assert.equal(practiceSessionContext(null), 'practice')
assert.equal(practiceSessionContext(42), 'assignment')

const silence = classifyRecitationAttempt({ result: { noSpeech: true } })
assert.equal(silence.validCheck, false)
assert.equal(attemptAffectsScoring(silence), false)
assert.equal(silence.class, 'silence_no_speech')

const empty = classifyRecitationAttempt({ blob: new Blob([], { type: 'audio/webm' }), durationSeconds: 0 })
assert.equal(empty.validCheck, false)
assert.equal(attemptAffectsScoring(empty), false)

const denied = classifyRecitationAttempt({ result: { micDenied: true } })
assert.equal(denied.class, 'microphone_denied')
assert.equal(attemptAffectsScoring(denied), false)

const stale = classifyRecitationAttempt({ activeAttemptId: 'a', responseAttemptId: 'b' })
assert.equal(stale.class, 'cancelled_stale')
assert.equal(acceptRecitationProviderResponse('a', 'b'), false)
assert.equal(acceptRecitationProviderResponse('a', 'a'), true)

const navigation = fs.readFileSync(new URL('../../resources/js/scripts/dashboard/studentDashboardNavigation.js', import.meta.url), 'utf8')
assert.doesNotMatch(navigation, /id: 'practice'/)
assert.match(navigation, /pane === 'practice'/)

const dashboard = fs.readFileSync(new URL('../../resources/js/views/Dashboard.vue', import.meta.url), 'utf8')
assert.doesNotMatch(dashboard, /studentPane === 'practice'/)
assert.match(dashboard, /filterLearningAssignments/)

const memorisation = fs.readFileSync(new URL('../../resources/js/views/Memorisation.js', import.meta.url), 'utf8')
assert.match(memorisation, /const technique = techniqueParam === 'blur' \? 'blur' : null/)
assert.match(memorisation, /practice_tool/)
assert.match(memorisation, /entry\.panel === 'find'/)
assert.match(memorisation, /openQuranSearchModal\(\)/)
assert.match(memorisation, /flushSessionLifecycleForBackground/)
assert.match(memorisation, /Speechmatics|speechmatics/i)

const view = fs.readFileSync(new URL('../../resources/js/views/Memorisation.vue', import.meta.url), 'utf8')
assert.match(view, /workspace-session-context/)
assert.match(view, /practice-mic-status/)
assert.match(view, /data-reading-mode/)
