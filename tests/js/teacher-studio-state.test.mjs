import assert from 'node:assert/strict'
import test from 'node:test'
import { studioConfidenceValue, studioHasDraft, studioWordStatusKey } from '../../resources/js/scripts/teacher/teacherStudioState.js'

test('studio labels only explicit matches as correct', () => {
  for (const status of ['correct', 'matched', 'green']) assert.equal(studioWordStatusKey(status), 'teacher.word_status_correct')
  for (const status of [null, undefined, '', 'pending', 'unknown', 'unassessed', 'grey', 'not_attempted', 'future_status']) {
    assert.equal(studioWordStatusKey(status), 'teacher.playback_word_unassessed')
  }
  assert.equal(studioWordStatusKey('mismatch'), 'teacher.playback_legend_flagged')
  assert.equal(studioWordStatusKey('low_confidence'), 'teacher.playback_legend_uncertain')
  assert.equal(studioWordStatusKey('skipped'), 'teacher.word_status_skipped')
  assert.equal(studioWordStatusKey('omitted'), 'teacher.word_status_omitted')
  assert.equal(studioWordStatusKey('extra'), 'teacher.word_status_extra')
})

test('confidence keeps actual zero but does not invent it for missing evidence', () => {
  for (const value of [undefined, null, '', true, false, NaN, -1, Infinity, 'unavailable']) assert.equal(studioConfidenceValue(value), '')
  assert.equal(studioConfidenceValue(0), '0%')
  assert.equal(studioConfidenceValue(0.924), '92%')
  assert.equal(studioConfidenceValue(1), '100%')
  assert.equal(studioConfidenceValue('0.51'), '51%')
})

test('all teacher composers protect unsent text, recordings and revision dates', () => {
  const clean = { feedback: '', privateNote: '', revisionNote: '', wordNote: '', wordStatus: '', wordDrafts: {}, dueAt: '2026-11-22', initialDueAt: '2026-11-22' }
  assert.equal(studioHasDraft(clean), false)
  for (const key of ['feedback', 'privateNote', 'revisionNote', 'wordNote', 'wordStatus']) assert.equal(studioHasDraft({ ...clean, [key]: 'unsent' }), true, key)
  assert.equal(studioHasDraft({ ...clean, dueAt: '2026-11-23' }), true)
  assert.equal(studioHasDraft({ ...clean, dueAt: '' }), true, 'Clearing a revision date is still an edit')
  assert.equal(studioHasDraft({ ...clean, wordDueAt: '2026-11-23', initialWordDueAt: '2026-11-22' }), true)
  assert.equal(studioHasDraft({ ...clean, wordStatusDrafts: { '1:2': 'needs_practice' } }), true)
  assert.equal(studioHasDraft({ ...clean, wordDrafts: { '1:2': 'a correction' } }), true)
  assert.equal(studioHasDraft({ ...clean, wordDrafts: { '1:2': ' \n' }, revisionNote: '  ' }), false)
  for (const key of ['voiceState', 'wordVoiceState']) {
    assert.equal(studioHasDraft({ ...clean, [key]: { hasRecording: true, active: false } }), true, key)
    assert.equal(studioHasDraft({ ...clean, [key]: { hasRecording: false, active: true } }), true, key)
  }
})
