import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildMainFocusExplanation,
  buildPostSessionInfoArchitecture,
  formatRecommendationAyahLabel,
  formatRecommendationSetLabel,
  formatRecommendationSurahSet,
} from '../../resources/js/scripts/recommendations/postSessionInfoArchitecture.js'
import { buildRevisionScopeOptions } from '../../resources/js/scripts/recommendations/revisionPracticeScope.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const vue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
const js = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const en = JSON.parse(readFileSync(join(root, 'resources/js/locales/en.json'), 'utf8'))
const rec = en.memorisation.postSession.recommendation

const completionModal = vue.match(/post-session-simple__dialog[\s\S]*?<\/footer>/)?.[0] || ''

// Terminology helpers
{
  assert.equal(formatRecommendationAyahLabel(3), 'Ayah 3')
  assert.equal(formatRecommendationSetLabel({ from: 1, to: 4 }), 'Ayahs 1–4')
  assert.equal(formatRecommendationSetLabel({ from: 2, to: 2 }), 'Ayah 2')
  assert.equal(formatRecommendationSurahSet('Al-Ikhlas', { from: 1, to: 4 }), 'Al-Ikhlas · Ayahs 1–4')
  assert.doesNotMatch(formatRecommendationAyahLabel(1), /verse/i)
}

// Main focus explanation from structured fields (never invents ayahs)
{
  assert.match(
    buildMainFocusExplanation({ primaryWeakAyah: 2 }),
    /Strengthen Ayah 2/,
  )
  assert.match(
    buildMainFocusExplanation({ weakAyahCount: 3 }),
    /weak ayahs/i,
  )
  assert.match(
    buildMainFocusExplanation({ outcome: 'strong' }),
    /secure/i,
  )
  assert.equal(
    buildMainFocusExplanation({ primaryWeakAyah: null, weakAyahCount: 0, outcome: 'mixed' }),
    '',
  )
}

// Full IA payload separates concepts
{
  const ia = buildPostSessionInfoArchitecture({
    outcome: 'weak',
    outcomeLabel: 'Focused revision recommended',
    primaryWeakAyah: 2,
    weakAyahRows: [
      { ayah: 2, ayahLabel: 'Ayah 2', wordsLabel: 'قُل', words: ['قُل'] },
      { ayah: 4, ayahLabel: 'Ayah 4', words: [] },
    ],
    surahName: 'Al-Ikhlas',
    nextRange: { from: 1, to: 4 },
    nextHeadline: 'Continue with care',
    methodTitle: 'Talqin',
    timeLabel: 'About 4 minutes',
    planWhy: 'Based on this session.',
    revisionOptions: buildRevisionScopeOptions(),
    showRevisionOptions: true,
    isRevision: true,
  })

  assert.equal(ia.mainFocus.title, 'Main focus')
  assert.match(ia.mainFocus.explanation, /Ayah 2/)
  assert.equal(ia.weakAreas.title, 'Weak areas')
  assert.equal(ia.weakAreas.items.length, 2)
  assert.equal(ia.weakAreas.items[0].ayahLabel, 'Ayah 2')
  assert.equal(ia.revisionOptions.title, 'Revision options')
  assert.equal(ia.revisionOptions.visible, true)
  assert.ok(ia.revisionOptions.options.length >= 2)
  assert.equal(ia.whatToPractiseNext.title, 'What to practise next')
  assert.equal(ia.whatToPractiseNext.surahSetDisplay, 'Al-Ikhlas · Ayahs 1–4')
  assert.equal(ia.whatToPractiseNext.setLabel, 'Ayahs 1–4')
  assert.equal(ia.whatToPractiseNext.targetLabel, 'Continue with care')
  assert.equal(ia.whatToPractiseNext.methodTitle, 'Talqin')
}

// Revision options use set/ayah terminology — not mixed "range/session/ayat"
{
  const options = buildRevisionScopeOptions()
  const blob = JSON.stringify(options)
  assert.match(blob, /weak ayahs/i)
  assert.match(blob, /full set/i)
  assert.doesNotMatch(blob, /\bayat\b/i)
  assert.doesNotMatch(options[1].label, /full range/i)
}

// EN copy uses consistent Surah / Ayah / Set wording
{
  assert.equal(rec.mainFocus, 'Main focus')
  assert.equal(rec.weakSpotsTitle, 'Weak areas')
  assert.equal(rec.whatNext, 'What to practise next')
  assert.equal(rec.revisionOptions, 'Revision options')
  assert.equal(rec.planDetail.focusVerse, 'Ayah {ayah}')
  assert.equal(rec.singleAyah, 'Ayah {ayah}')
  assert.match(rec.scopeFullRangeLabel, /full set/i)
  assert.match(rec.scopeWeakAreasLabel, /weak ayahs/i)
  assert.match(rec.weakSpotsLead, /ayahs need more practice/i)
  assert.doesNotMatch(rec.planDetail.focusVerse, /Verse/i)
  assert.doesNotMatch(rec.scopeFullRangeBenefit, /\bayat\b/i)
}

// Modal consumes structured IA instead of free-form inference for hierarchy
{
  assert.match(js, /postSessionInfoArchitecture\(\)/)
  assert.match(js, /buildPostSessionInfoArchitecture/)
  assert.match(js, /formatRecommendationAyahLabel/)
  assert.match(completionModal, /postSessionInfoArchitecture\.mainFocus\.explanation/)
  assert.match(completionModal, /postSessionInfoArchitecture\.weakAreas\.items/)
  assert.match(completionModal, /postSessionInfoArchitecture\.revisionOptions/)
  assert.match(completionModal, /postSessionInfoArchitecture\.whatToPractiseNext\.surahSetDisplay/)
  assert.match(completionModal, /data-section="main-focus-explanation"/)
  // Footer actions remain action verbs, not descriptive section copy
  assert.match(completionModal, /postSessionCtaButtons/)
  assert.match(js, /Continue|Review|Repeat Weak Ayah/)
}

console.log('post-session-info-architecture tests passed')
