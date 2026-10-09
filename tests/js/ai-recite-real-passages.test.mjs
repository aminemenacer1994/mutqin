/**
 * AI Recite regression against real Qur'an passages (mocked recognition).
 *
 * Separates:
 * - mocked_recognition → automated PASS/FAIL here
 * - real_audio / live Speechmatics → BLOCKED (no committed audio corpus)
 */
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildQuranAlignment,
  buildRealtimePreviewAlignment,
} from '../../resources/js/scripts/engine/recitation_analysis.js'
import { attemptAffectsScoring, classifyRecitationAttempt } from '../../resources/js/scripts/audio/recitationAttemptGuard.js'
import { resolveRecitationResultState } from '../../resources/js/scripts/recommendations/recitationResultState.js'
import { applyRecitationMasteryFromResult } from '../../resources/js/scripts/recommendations/recitationMastery.js'
import {
  PASSAGE_KEYS,
  buildAllRealPassageScenarios,
  passages,
} from './fixtures/ai-recite-real-passages.mjs'
import { scoreSpeechmaticsPath } from './helpers/scoreRecitationScenario.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const scenarios = buildAllRealPassageScenarios()
const reportRows = []

assert.ok(scenarios.length >= 80, `expected a dense real-passage matrix, got ${scenarios.length}`)
assert.equal(passages[PASSAGE_KEYS.QURAYSH].ayahs.length, 4)
assert.ok(passages[PASSAGE_KEYS.FATIHA].tokens.length >= 4)
// Quraysh ayah 1 must NOT keep glued basmala after convention strip.
assert.ok(!passages[PASSAGE_KEYS.QURAYSH].ayahs[0].text.startsWith('بِسْمِ'))
assert.ok(passages[PASSAGE_KEYS.QURAYSH].tokens.length >= 4)
assert.match(passages[PASSAGE_KEYS.BAQARAH_255].ayahs[0].text, /القيوم|ٱلْحَى/)

function ayahKeysFromStatuses(statuses = []) {
  return statuses.map((word) => String(word.ayahKey || word.ayah_key || ''))
}

/**
 * Accuracy rule: unspoken *remaining* words (incomplete/early-stop) must not be
 * painted as incorrect. Mid-range skips / wrong-order drift may still use
 * DELETION with a hard visual — that is a different product path.
 */
function assertUnreadTailNotIncorrect(scored, scenario) {
  if (!(scenario.expectations.incomplete || scenario.expectations.liveUnreadPending)) return
  const statuses = scored.result.wordStatuses || []
  let lastSpoken = -1
  for (let i = 0; i < statuses.length; i += 1) {
    const status = String(statuses[i]?.status || '')
    if (status === 'correct' || status === 'partial' || status === 'incorrect') lastSpoken = i
  }
  for (let i = lastSpoken + 1; i < statuses.length; i += 1) {
    assert.notEqual(
      statuses[i]?.status,
      'incorrect',
      `${scenario.id}: unread tail word ${i} marked incorrect`,
    )
  }
}

function scoreLiveIncremental(scenario) {
  const heard = scenario.recognitionWords
  const opts = {
    lifecycle: 'live',
    strictProgression: true,
    targetAyahs: scenario.targetAyahs,
    partialAdvances: true,
    exactSkipLookahead: 3,
    allowArticleMatch: true,
  }
  // Full step-by-step is O(n²); sample checkpoints on long ayahs.
  const checkpoints = []
  if (heard.length <= 24) {
    for (let n = 1; n <= heard.length; n += 1) checkpoints.push(n)
  } else {
    checkpoints.push(1, 2, Math.floor(heard.length / 3), Math.floor((heard.length * 2) / 3), heard.length)
  }
  let lastSettled = -1
  for (const n of checkpoints) {
    const alignment = buildRealtimePreviewAlignment(
      scenario.targetText,
      heard.slice(0, n),
      opts,
    )
    const statuses = alignment.wordStatuses || []
    for (let i = 0; i < statuses.length; i += 1) {
      if (['correct', 'partial'].includes(String(statuses[i]?.status || ''))) {
        lastSettled = Math.max(lastSettled, i)
      }
    }
    // Unspoken tail must stay pending/neutral live — never incorrect.
    for (const word of statuses) {
      if (word.type === 'UNASSESSED' || word.status === 'pending') {
        assert.notEqual(word.status, 'incorrect', `${scenario.id}: live unread marked incorrect`)
      }
    }
  }
  return lastSettled
}

function evaluateScenario(scenario) {
  const scored = scoreSpeechmaticsPath({
    id: scenario.id,
    targetText: scenario.targetText,
    recognitionWords: scenario.recognitionWords,
  })
  const exp = scenario.expectations
  const failures = []

  try {
    assertUnreadTailNotIncorrect(scored, scenario)

    if (exp.requireAllMatch) {
      assert.ok(
        scored.types.every((type) => type === 'MATCH'),
        `${scenario.id}: expected all MATCH, got ${scored.types.join(',')}`,
      )
    }
    if (exp.exactAccuracy != null) {
      assert.ok(
        Math.abs(scored.accuracy - exp.exactAccuracy) <= 1,
        `${scenario.id}: accuracy ${scored.accuracy} != ${exp.exactAccuracy}`,
      )
    }
    if (exp.minAccuracy != null) {
      assert.ok(
        scored.accuracy >= exp.minAccuracy,
        `${scenario.id}: accuracy ${scored.accuracy} < ${exp.minAccuracy}`,
      )
    }
    if (exp.maxAccuracy != null) {
      assert.ok(
        scored.accuracy <= exp.maxAccuracy,
        `${scenario.id}: accuracy ${scored.accuracy} > ${exp.maxAccuracy}`,
      )
    }
    for (const type of exp.mustIncludeTypes || []) {
      assert.ok(scored.types.includes(type), `${scenario.id}: missing type ${type}`)
    }
    for (const extra of exp.mustIncludeExtras || []) {
      assert.ok(scored.extras.includes(extra), `${scenario.id}: missing extra ${extra}`)
    }
    if (exp.maxIncorrect != null) {
      const incorrect = scored.statuses.filter((status) => status === 'incorrect').length
      assert.ok(
        incorrect <= exp.maxIncorrect,
        `${scenario.id}: too many incorrect (${incorrect} > ${exp.maxIncorrect})`,
      )
    }

    // Ayah positioning: every status with an ayah key must belong to the passage.
    const allowedKeys = new Set((scenario.targetAyahs || []).map((a) => a.ayahKey))
    for (const key of ayahKeysFromStatuses(scored.result.wordStatuses || [])) {
      if (!key) continue
      assert.ok(allowedKeys.has(key), `${scenario.id}: unexpected ayah key ${key}`)
    }

    // Live highlighting / unread tail.
    if (exp.liveUnreadPending || exp.incomplete) {
      const live = buildQuranAlignment(scenario.targetText, scenario.recognitionWords, {
        strictProgression: false,
        lifecycle: 'live',
        targetAyahs: scenario.targetAyahs,
      })
      const unread = (live.wordStatuses || []).filter((word) => (
        word.type === 'UNASSESSED' || word.status === 'pending'
      ))
      assert.ok(unread.length > 0, `${scenario.id}: live incomplete should leave unread pending`)
      for (const word of unread) {
        assert.notEqual(word.status, 'incorrect')
      }
    }

    // Incremental live should not freeze (settles forward for non-empty heard).
    // Skip wrong-order chaos for live paint — final scoring covers that path.
    if (scenario.kind !== 'wrong_ayah_order' && scenario.recognitionWords.length >= 2) {
      const settled = scoreLiveIncremental(scenario)
      if (exp.requireAllMatch || scenario.kind === 'perfect') {
        assert.ok(settled >= 0, `${scenario.id}: live incremental never settled`)
      }
    }

    // No false scoring / progress write for empty-commit silence path.
    if (scenario.recognitionWords.length === 0) {
      const guard = classifyRecitationAttempt({
        result: {
          ...scored.result,
          durationSeconds: 5,
          committedWords: [],
          transcript: '',
          noSpeech: true,
        },
      })
      assert.equal(attemptAffectsScoring(guard), false)
      assert.equal(applyRecitationMasteryFromResult({
        result: { noSpeech: true, accuracyScore: 0, transcript: '' },
        outcome: 'weak',
        accuracyPercent: 0,
        range: { surahId: Number(scenario.targetAyahs?.[0]?.ayahKey?.split(':')[0]) || 1, from: 1, to: 1 },
      }).length, 0)
    }

    // Result state resolves without throwing.
    resolveRecitationResultState(scored.result, {
      confidence: scored.confidence,
      recordingDurationSeconds: 12,
      usableSpeechSeconds: 6,
    })
  } catch (error) {
    failures.push(String(error.message || error))
  }

  return {
    id: scenario.id,
    passageKey: scenario.passageKey,
    kind: scenario.kind,
    source: scenario.source,
    status: failures.length ? 'FAIL' : 'PASS',
    accuracy: scored.accuracy,
    typesSample: scored.types.slice(0, 12).join(','),
    extras: scored.extras.join(',') || '—',
    failures,
  }
}

const byPassage = new Map()
for (const scenario of scenarios) {
  const row = evaluateScenario(scenario)
  reportRows.push(row)
  if (!byPassage.has(row.passageKey)) byPassage.set(row.passageKey, [])
  byPassage.get(row.passageKey).push(row)
  assert.equal(row.status, 'PASS', `${row.id} failed: ${row.failures.join('; ')}`)
}

// Explicit BLOCKED real-audio rows (no corpus in repo).
const blockedRealAudio = [
  { id: 'REAL-AUDIO-QURAYSH', passageKey: PASSAGE_KEYS.QURAYSH, kind: 'recorded_audio', reason: 'No committed Quraysh WAV/WebM in repo' },
  { id: 'REAL-AUDIO-FATIHA', passageKey: PASSAGE_KEYS.FATIHA, kind: 'recorded_audio', reason: 'No committed Al-Fatihah WAV/WebM in repo' },
  { id: 'REAL-SM-LIVE', passageKey: 'live-speechmatics', kind: 'live_provider', reason: 'Live Speechmatics not executed in this suite' },
]
for (const row of blockedRealAudio) {
  reportRows.push({
    id: row.id,
    passageKey: row.passageKey,
    kind: row.kind,
    source: 'real_audio_or_live_provider',
    status: 'BLOCKED',
    accuracy: null,
    typesSample: '—',
    extras: '—',
    failures: [row.reason],
  })
}

const pass = reportRows.filter((row) => row.status === 'PASS').length
const fail = reportRows.filter((row) => row.status === 'FAIL').length
const blocked = reportRows.filter((row) => row.status === 'BLOCKED').length

const lines = []
lines.push('# AI Recite — Real Qur’an Passage QA')
lines.push('')
lines.push(`Generated: ${new Date().toISOString().slice(0, 10)}`)
lines.push('')
lines.push('Reference edition: **quran-uthmani** (Al Quran Cloud), with Mutqin assessment basmala stripping for surahs ≥ 2.')
lines.push('Provider unchanged (Speechmatics). Word-accuracy only — no Tajweed/harakat scoring.')
lines.push('')
lines.push('## Summary')
lines.push('')
lines.push('| Status | Count |')
lines.push('|---|---:|')
lines.push(`| PASS (mocked recognition) | ${pass} |`)
lines.push(`| FAIL | ${fail} |`)
lines.push(`| BLOCKED (real audio / live provider) | ${blocked} |`)
lines.push(`| **Total rows** | **${reportRows.length}** |`)
lines.push('')
lines.push('## Per-passage results')
lines.push('')
lines.push('| Passage | Scenario | Source | Status | Accuracy | Notes |')
lines.push('|---|---|---|---|---:|---|')
for (const row of reportRows) {
  const notes = row.failures.length
    ? row.failures.join('; ').replace(/\|/g, '\\|')
    : (row.extras !== '—' ? `extras: ${row.extras}` : 'ok')
  lines.push(`| ${row.passageKey} | ${row.kind} | ${row.source} | ${row.status} | ${row.accuracy ?? '—'} | ${notes} |`)
}
lines.push('')
lines.push('## Coverage checklist')
lines.push('')
lines.push('| Requirement | Result |')
lines.push('|---|---|')
lines.push('| Word alignment + ayah positioning | PASS (mocked) |')
lines.push('| Real-time highlighting / state updates | PASS (live incremental mocked path) |')
lines.push('| Insertions / omissions / substitutions / repetitions | PASS (scenario kinds) |')
lines.push('| Pauses / restarts / self-corrections / incomplete | PASS (mocked) |')
lines.push('| No false scoring of unspoken words | PASS (live pending / final omitted) |')
lines.push('| No freeze / duplicate mastery on silence | PASS (guards) |')
lines.push('| Real recorded audio processed | BLOCKED |')
lines.push('')
lines.push('## How to re-run')
lines.push('')
lines.push('```bash')
lines.push('node --experimental-vm-modules tests/js/ai-recite-real-passages.test.mjs')
lines.push('```')
lines.push('')

const docPath = join(root, 'docs/ai-recite-real-passages-qa.md')
writeFileSync(docPath, `${lines.join('\n')}\n`)

console.log(
  `ai-recite-real-passages.test.mjs: ok (${pass} PASS, ${fail} FAIL, ${blocked} BLOCKED) → ${docPath}`,
)
