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
const amdConfig = buildSpeechmaticsRecitationConfig({ language: 'ar', amdLive: true })
assert.equal('diarization' in amdConfig, false, 'AMD live skips speaker diarization')
assert.equal(QURAN_VOCABULARY_VERSION, 'quran-vocab-v2-empty')
assert.deepEqual(APPROVED_QURAN_VOCABULARY, [], 'no vocabulary is approved without real paired-audio evidence')
assert.deepEqual(getSpeechmaticsQuranVocabulary(), [])
assert.equal('additional_vocab' in config, false, 'empty or selected-range vocabulary is not sent')

assert.match(runtime, /speaker:\s*String\(alternative\?\.speaker/, 'provider speaker labels are retained')
assert.match(runtime, /buildSpeechmaticsRecitationConfig\(/, 'central config is used by StartRecognition')
assert.match(runtime, /amdLive:\s*options\.amdLive/, 'AMD flag is forwarded into StartRecognition config')
assert.doesNotMatch(runtime, /selectedText.*additional_vocab/s, 'selected text cannot become provider vocabulary')

console.log('speechmatics-noise-vocabulary.test.mjs: ok')
