#!/usr/bin/env node
/**
 * Internal accuracy probe: Speechmatics client path vs PHP recitation API alignment.
 *
 * Usage:
 *   node scripts/recitation-scenario-accuracy.mjs
 *   node scripts/recitation-scenario-accuracy.mjs --json
 */

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  buildDeterministicRecitationResult,
  createRecognitionState,
  selectPrimaryReciterWords,
  stabilizeRecognitionEvent,
} from '../resources/js/scripts/engine/recitation_analysis.js'
import { recitationEdgeScenarios } from '../tests/js/fixtures/recitation-edge-scenarios.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const phpProbe = path.join(root, 'scripts/recitation-alignment-probe.php')
const jsonOut = process.argv.includes('--json')

function scoreSpeechmaticsPath(scenario) {
  let state = stabilizeRecognitionEvent(createRecognitionState(), {
    provider: 'speechmatics',
    isFinal: true,
    speechFinal: true,
    segmentId: scenario.id,
    words: scenario.recognitionWords,
  }, { confidenceThreshold: 0.35 })

  const selected = selectPrimaryReciterWords(state.committedWords, scenario.targetText)
  const words = selected.reliable ? selected.words : []
  const result = buildDeterministicRecitationResult(scenario.targetText, words, {
    strictProgression: false,
  })

  return {
    accuracy: Number(result.accuracyScore ?? 0),
    reliable: selected.reliable,
    speakerStatus: selected.status ?? 'clear',
    wordCount: words.length,
  }
}

function scoreApiPath(scenario) {
  const child = spawnSync('php', [phpProbe], {
    cwd: root,
    input: JSON.stringify({
      target_text: scenario.targetText,
      recognition_words: scenario.recognitionWords,
      options: { lifecycle: 'final' },
    }),
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  })

  if (child.status !== 0) {
    throw new Error(child.stderr || child.stdout || `PHP probe failed for ${scenario.id}`)
  }

  const parsed = JSON.parse(child.stdout)
  return {
    accuracy: Number(parsed.accuracy ?? 0),
    wordCount: Number(parsed.word_count ?? 0),
    scenarioCounts: parsed.scenario_counts ?? {},
  }
}

function behaviorAccuracy(actual, expected, tolerance = 1) {
  const delta = Math.abs(actual - expected)
  if (delta <= tolerance) return 100
  return Math.max(0, Math.round(100 - delta))
}

function parityAccuracy(a, b) {
  const delta = Math.abs(a - b)
  if (delta === 0) return 100
  return Math.max(0, 100 - delta)
}

const rows = []
let speechmaticsBehaviorTotal = 0
let apiBehaviorTotal = 0
let parityTotal = 0

for (const scenario of recitationEdgeScenarios) {
  const speechmatics = scoreSpeechmaticsPath(scenario)
  const api = scoreApiPath(scenario)

  const expectedSpeechmatics = scenario.expectedSpeechmaticsAccuracy ?? scenario.expectedAccuracy
  const expectedApi = scenario.expectedApiAccuracy ?? scenario.expectedAccuracy
  const speechmaticsBehavior = behaviorAccuracy(speechmatics.accuracy, expectedSpeechmatics)
  const apiBehavior = behaviorAccuracy(api.accuracy, expectedApi)
  const parity = parityAccuracy(speechmatics.accuracy, api.accuracy)

  speechmaticsBehaviorTotal += speechmaticsBehavior
  apiBehaviorTotal += apiBehavior
  parityTotal += parity

  rows.push({
    id: scenario.id,
    label: scenario.label,
    expectedSpeechmaticsAccuracy: expectedSpeechmatics,
    expectedApiAccuracy: expectedApi,
    speechmaticsAccuracy: speechmatics.accuracy,
    apiAccuracy: api.accuracy,
    speechmaticsBehavior,
    apiBehavior,
    parity,
    speechmaticsReliable: speechmatics.reliable,
  })
}

const count = rows.length
const summary = {
  scenarios: count,
  speechmaticsBehaviorMean: Math.round(speechmaticsBehaviorTotal / count),
  apiBehaviorMean: Math.round(apiBehaviorTotal / count),
  parityMean: Math.round(parityTotal / count),
  rows,
}

if (jsonOut) {
  console.log(JSON.stringify(summary, null, 2))
} else {
  const header = [
    'Scenario'.padEnd(34),
    'Expect SM/API'.padStart(13),
    'SM acc'.padStart(8),
    'API acc'.padStart(8),
    'SM beh'.padStart(8),
    'API beh'.padStart(8),
    'Parity'.padStart(8),
  ].join(' ')
  console.log('Recitation edge-scenario accuracy (internal probe)\n')
  console.log(header)
  console.log('-'.repeat(header.length))
  for (const row of rows) {
    const expectLabel = `${row.expectedSpeechmaticsAccuracy}/${row.expectedApiAccuracy}`
    console.log([
      row.label.slice(0, 34).padEnd(34),
      expectLabel.padStart(13),
      String(row.speechmaticsAccuracy).padStart(8),
      String(row.apiAccuracy).padStart(8),
      `${row.speechmaticsBehavior}%`.padStart(8),
      `${row.apiBehavior}%`.padStart(8),
      `${row.parity}%`.padStart(8),
    ].join(' '))
  }
  console.log('')
  console.log(`Mean behavior vs ground truth — Speechmatics path: ${summary.speechmaticsBehaviorMean}%`)
  console.log(`Mean behavior vs ground truth — Recitation API:   ${summary.apiBehaviorMean}%`)
  console.log(`Mean JS/PHP scored-accuracy parity:                 ${summary.parityMean}%`)
}

const strictParity = process.argv.includes('--strict-parity')
const failed = rows.some(row => row.speechmaticsBehavior < 100 || row.apiBehavior < 100)
  || (strictParity && rows.some(row => row.parity < 100))
process.exit(failed ? 1 : 0)
