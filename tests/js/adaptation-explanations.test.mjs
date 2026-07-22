import assert from 'node:assert/strict'
import { buildAdaptationExplanations } from '../../resources/js/scripts/recommendations/adaptationExplanations.js'

const t = (key, params = {}) => {
  const map = {
    'memorisation.postSession.recommendation.paramHints.repetitionsHigh':
      `${params.count}× repetitions — more passes help challenging ayahs settle.`,
    'memorisation.postSession.recommendation.paramHints.focus':
      'Focus Mode — one ayah at a time, fewer distractions.',
    'memorisation.postSession.recommendation.paramHints.talqin':
      'Talqin — listen, then recite before moving on.',
    'memorisation.postSession.recommendation.paramHints.speedSlower':
      `${params.speed}× speed — more time to hear each phrase clearly.`,
  }
  return map[key] || key
}

{
  const lines = buildAdaptationExplanations({
    technique: 'focus',
    complementary_technique: 'anchor',
    repetitions: 4,
    playback_speed: 0.75,
  }, t)
  assert.ok(lines.some((line) => /4× repetitions/.test(line)))
  assert.ok(lines.some((line) => /Focus Mode/.test(line)))
  assert.ok(lines.some((line) => /0\.75× speed|Slower|speed/.test(line)))
}

{
  const lines = buildAdaptationExplanations({
    technique: 'talqin',
    repetitions: 3,
    playback_speed: 1,
  }, t)
  assert.ok(lines.some((line) => /Talqin/.test(line)))
  assert.equal(lines.some((line) => /Focus Mode/.test(line)), false)
}

{
  assert.deepEqual(buildAdaptationExplanations({}, t), [])
}

console.log('adaptation-explanations.test.mjs: ok')
