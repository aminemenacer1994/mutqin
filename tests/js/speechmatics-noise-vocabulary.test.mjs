import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  APPROVED_QURAN_VOCABULARY,
  QURAN_VOCABULARY_VERSION,
  buildSpeechmaticsRecitationConfig,
  getSpeechmaticsQuranVocabulary,
} from '../../resources/js/scripts/speechmatics/quranVocabulary.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const runtime = readFileSync(join(root, 'resources/js/scripts/memorisationRuntime.js'), 'utf8')

const config = buildSpeechmaticsRecitationConfig({
  language: 'ar',
  selectedText: 'الحمد لله رب العالمين',
})
assert.equal(config.diarization, 'speaker')
assert.equal(config.speaker_diarization_config.speaker_sensitivity, 0.5)
assert.ok(QURAN_VOCABULARY_VERSION.includes('v1'))
assert.deepEqual(config.additional_vocab, getSpeechmaticsQuranVocabulary())
assert.ok(APPROVED_QURAN_VOCABULARY.every((entry) => entry.benchmark))
assert.ok(APPROVED_QURAN_VOCABULARY.every((entry) => (
  entry.benchmark.custom_correct
  && !entry.benchmark.baseline_correct
  && entry.benchmark.substitution_preserved
)), 'every approved entry improves its correct fixture without hiding substitutions')
assert.ok(config.additional_vocab.some((entry) => entry.content === 'كهيعص'), 'approved difficult vocabulary is sent')
assert.ok(!config.additional_vocab.some((entry) => entry.content === 'الحمد'), 'selected ayah is never copied into vocabulary')
assert.ok(!config.additional_vocab.some((entry) => 'sounds_like' in entry), 'unproven sounds_like values are not sent')

assert.match(runtime, /speaker:\s*String\(alternative\?\.speaker/, 'provider speaker labels are retained')
assert.match(runtime, /\.\.\.buildSpeechmaticsRecitationConfig\(options\)/, 'central config is used by StartRecognition')
assert.doesNotMatch(runtime, /selectedText.*additional_vocab/s, 'selected text cannot become provider vocabulary')

console.log('speechmatics-noise-vocabulary.test.mjs: ok')
