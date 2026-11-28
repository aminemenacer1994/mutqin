import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const api = readFileSync(new URL('../../resources/js/scripts/api/learning.js', import.meta.url), 'utf8')

assert.match(api, /buildTeacherLearningPlanRequestBody/, 'learning plan API supports multipart voice payloads')
assert.match(api, /items_instruction_audio_/, 'plan voice files are indexed for upload')

console.log('teacher-learning-plan-voice.test.mjs: ok')