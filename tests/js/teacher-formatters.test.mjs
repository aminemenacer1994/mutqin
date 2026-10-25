import assert from 'node:assert/strict'
import { ayahRangeLabel, formatTeacherWhen, practiceMinutes } from '../../resources/js/scripts/teacher/formatters.js'

const t = (key, params = {}) => {
  if (key === 'teacher.ayahs_range') return `Ayahs ${params.from}–${params.to}`
  if (key === 'teacher.ayah_n') return `Ayah ${params.n}`
  return key
}

assert.equal(practiceMinutes(null), null)
assert.equal(practiceMinutes(0), 0)
assert.equal(practiceMinutes(1), 1)
assert.equal(practiceMinutes(59), 1)
assert.equal(practiceMinutes(60), 1)
assert.equal(practiceMinutes(61), 2)
assert.equal(practiceMinutes(120), 2)
assert.equal(formatTeacherWhen('2026-10-28T12:00:00Z'), '28 Oct 2026')
assert.equal(ayahRangeLabel('Al-Fatihah', 1, 7, t), 'Al-Fatihah · Ayahs 1–7')

console.log('teacher-formatters.test.mjs: ok')
