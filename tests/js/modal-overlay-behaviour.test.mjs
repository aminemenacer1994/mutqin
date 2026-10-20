import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const vue = fs.readFileSync(path.join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
const js = fs.readFileSync(path.join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const hifz = fs.readFileSync(path.join(root, 'resources/js/components/HifzPlanCreatorModal.vue'), 'utf8')
const feedback = fs.readFileSync(path.join(root, 'resources/js/components/FeedbackModal.vue'), 'utf8')
const workspaceRecite = fs.readFileSync(
  path.join(root, 'resources/js/components/WorkspaceAiReciteResultModal.vue'),
  'utf8',
)

const centredOverlays = [
  {
    label: 'help learning',
    overlay: 'help-learning-overlay',
    ref: 'helpLearningModalDialog',
    close: 'closeHelpLearningModal',
  },
  {
    label: 'planner completion',
    overlay: 'planner-completion-overlay',
    ref: 'plannerCompletionModalDialog',
    close: 'closePlannerCompletionModal',
  },
  {
    label: 'advanced metrics',
    overlay: 'advanced-metrics-overlay',
    ref: 'advancedMetricsModalDialog',
    close: 'closeAdvancedMetricsModal',
  },
  {
    label: 'recordings library',
    overlay: 'recordings-library-overlay',
    ref: 'recordingsLibraryModalDialog',
    close: 'closeRecordingsLibrary',
  },
]

for (const item of centredOverlays) {
  assert.match(
    vue,
    new RegExp(`${item.overlay}[\\s\\S]*?onModalOverlayKeydown\\([\\s\\S]*?containerRef:\\s*'${item.ref}'[\\s\\S]*?onClose:\\s*${item.close}`),
    `${item.label} overlay must wire shared keydown + focus container`,
  )
  assert.match(vue, new RegExp(`ref="${item.ref}"`), `${item.label} dialog must expose ref ${item.ref}`)
}

assert.match(
  vue,
  /showRenameRecordingModal[\s\S]*?onModalOverlayKeydown\([\s\S]*?renameRecordingModalDialog[\s\S]*?closeRenameRecordingModal/,
  'rename recording overlay must wire shared keydown + focus container',
)
assert.match(vue, /ref="renameRecordingModalDialog"/)

assert.match(js, /if \(this\.showAdvancedMetricsModal\)[\s\S]*?closeAdvancedMetricsModal\(\)/)
assert.match(js, /if \(this\.showPlannerCompletionModal\)[\s\S]*?closePlannerCompletionModal\(\)/)
assert.match(js, /if \(this\.showRenameRecordingModal\)[\s\S]*?closeRenameRecordingModal\(\)/)

assert.match(hifz, /mutqin-modal-overlay hifz-plan-modal-overlay/)
assert.match(hifz, /mutqin-modal-dialog--full/)
assert.match(hifz, /onOverlayKeydown/)
assert.match(hifz, /handleModalKeydown/)

assert.match(feedback, /modal-overlay mutqin-modal-overlay feedback-modal-overlay/)
assert.match(feedback, /mutqin-modal-btn--primary/)

assert.match(workspaceRecite, /onDialogKeydown/)
assert.match(workspaceRecite, /handleModalKeydown/)

console.log('modal-overlay-behaviour.test.mjs: ok')
