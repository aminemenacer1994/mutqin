import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { buildMushafAnnotationOverlayMap, parseMushafWordLocation } from '../../resources/js/scripts/teacher/mushafAnnotationOverlays.js'

test('parseMushafWordLocation', () => {
  assert.deepEqual(parseMushafWordLocation('2:255:12'), { surah: 2, ayah: 255, word_index: 11 })
})

test('overlay map distinguishes teacher marks from AI flags', () => {
  const map = buildMushafAnnotationOverlayMap({
    surah: 1,
    coachings: [{
      ayah: 3,
      word_index: 2,
      corrections: [{ id: 9, category: 'tajweed', body: 'Hold the madd.' }],
    }],
    words: [{ ayah: 4, word_index: 1, status: 'incorrect' }],
    includeAiFlags: true,
  })
  assert.equal(map['1:3:3'].source, 'teacher')
  assert.equal(map['1:4:2'].source, 'ai_word_match')
  assert.equal(map['1:4:2'].tentative, true)
})

test('playback studio wires page mushaf workspace', () => {
  const vue = readFileSync(new URL('../../resources/js/components/teacher/TeacherRecitationPlaybackReview.vue', import.meta.url), 'utf8')
  assert.match(vue, /TeacherMushafMarkingWorkspace/)
  assert.match(vue, /TeacherMushafReviewChrome/)
  assert.match(vue, /TeacherPlaybackSideSection/)
  assert.match(vue, /teacher-playback__mushaf-body/)
  assert.match(vue, /buildMushafAnnotationOverlayMap/)
})

test('madani words accept annotation overlays', () => {
  const word = readFileSync(new URL('../../resources/js/components/madani/MadaniWord.vue', import.meta.url), 'utf8')
  assert.match(word, /annotationOverlays/)
  assert.match(word, /mushaf-annotation-overlay/)
})