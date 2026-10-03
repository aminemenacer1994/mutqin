import {
  compareAyahTexts,
  renderComparedAyahHtml,
  findPairsForVerseKey,
  otherVerseKeyInPair,
  detectMutashabihatDrift,
  fetchMutashabihatProgress,
  recordMutashabihatConfusion,
  recordMutashabihatPractice,
} from './index.js'
import { buildMutashabihatPracticePlan as buildPlan, gradeIdentifyChoice } from './practiceExercises.js'

export function resolveArabicFromSearchIndex(index, verseKey) {
  const vk = String(verseKey || '').trim()
  if (!vk || !Array.isArray(index)) return ''
  const hit = index.find((row) => row.key === vk || `${row.surah}:${row.ayah}` === vk)
  return String(hit?.arabic || hit?.text || '').trim()
}

export function buildMutashabihatCompareView(ctx, { pair, anchorVerseKey }) {
  const anchor = String(anchorVerseKey || '').trim()
  const other = otherVerseKeyInPair(pair, anchor)
  const leftText = resolveArabicFromSearchIndex(ctx.quranSearchIndex, anchor)
  const rightText = resolveArabicFromSearchIndex(ctx.quranSearchIndex, other)
  if (!leftText || !rightText) return null

  const diff = compareAyahTexts(leftText, rightText)
  const [s1, a1] = anchor.split(':')
  const [s2, a2] = other.split(':')
  const leftName = ctx.getChapterLatinName?.(Number(s1)) || `Surah ${s1}`
  const rightName = ctx.getChapterLatinName?.(Number(s2)) || `Surah ${s2}`

  return {
    pair,
    anchorVerseKey: anchor,
    otherVerseKey: other,
    leftLabel: `${leftName} · ${s1}:${a1}`,
    rightLabel: `${rightName} · ${s2}:${a2}`,
    leftHtml: renderComparedAyahHtml(diff.left),
    rightHtml: renderComparedAyahHtml(diff.right),
    leftVerseKey: anchor,
    rightVerseKey: other,
  }
}

export async function refreshMutashabihatProgress(ctx) {
  if (!ctx.isLoggedIn) {
    ctx.mutashabihatProgressRows = []
    return
  }
  try {
    ctx.mutashabihatProgressRows = await fetchMutashabihatProgress()
  } catch {
    ctx.mutashabihatProgressRows = []
  }
}

export function startMutashabihatPractice(ctx, { pair, anchorVerseKey }) {
  const anchor = String(anchorVerseKey || pair?.verse_key_1 || '').trim()
  const other = otherVerseKeyInPair(pair, anchor)
  const arabicByKey = {
    [anchor]: resolveArabicFromSearchIndex(ctx.quranSearchIndex, anchor),
    [other]: resolveArabicFromSearchIndex(ctx.quranSearchIndex, other),
  }
  const steps = buildPlan({ pair, anchorVerseKey: anchor, arabicByKey })
  if (!steps.length) return false

  ctx.mutashabihatPracticeSession = {
    pair,
    anchorVerseKey: anchor,
    otherVerseKey: other,
    steps,
    stepIndex: 0,
    correctCount: 0,
    arabicByKey,
  }
  ctx.mutashabihatPracticeOpen = true
  ctx.mutashabihatCompareOpen = false
  return true
}

export function currentMutashabihatPracticeStep(ctx) {
  const session = ctx.mutashabihatPracticeSession
  if (!session) return null
  return session.steps[session.stepIndex] || null
}

export function advanceMutashabihatPractice(ctx, { success = true } = {}) {
  const session = ctx.mutashabihatPracticeSession
  if (!session) return
  if (success) session.correctCount += 1
  if (session.stepIndex < session.steps.length - 1) {
    session.stepIndex += 1
    return
  }
  session.finished = true
  session.stepIndex = session.steps.length
  session.resultSuccess = session.correctCount >= Math.max(1, session.steps.length - 1)
  if (ctx.isLoggedIn && session.pair?.id) {
    void recordMutashabihatPractice({
      pair_id: session.pair.id,
      success: session.resultSuccess,
    }).then(() => refreshMutashabihatProgress(ctx)).catch(() => {})
  }
}

export function detectDriftForWorkspaceRecite(ctx, { expectedVerseKey, expectedArabic, wordStatuses }) {
  const pairs = findPairsForVerseKey(expectedVerseKey)
  const candidateArabicByKey = {}
  for (const pair of pairs) {
    const other = otherVerseKeyInPair(pair, expectedVerseKey)
    candidateArabicByKey[other] = resolveArabicFromSearchIndex(ctx.quranSearchIndex, other)
  }
  return detectMutashabihatDrift({
    expectedVerseKey,
    expectedArabic,
    wordStatuses,
    candidateArabicByKey,
  })
}

export async function persistMutashabihatConfusion(ctx, drift) {
  if (!ctx.isLoggedIn || !drift?.pair?.id) return
  try {
    await recordMutashabihatConfusion({
      pair_id: drift.pair.id,
      expected_verse_key: drift.expectedVerseKey,
      confused_verse_key: drift.confusedVerseKey,
    })
    await refreshMutashabihatProgress(ctx)
  } catch {
    // non-blocking
  }
}

export function mutashabihatStatusLabel(ctx, status) {
  const key = String(status || 'needs_practice')
  const label = ctx.t?.(`memorisation.mutashabihat.status.${key}`)
  if (label && !label.includes('mutashabihat.status')) return label
  if (key === 'strong') return 'Strong'
  if (key === 'improving') return 'Improving'
  return 'Needs Practice'
}

export function gradeMutashabihatIdentify(ctx, selectedId) {
  const session = ctx.mutashabihatPracticeSession
  const step = currentMutashabihatPracticeStep(ctx)
  if (!session || step?.kind !== 'identify') return
  const ok = gradeIdentifyChoice(step.options, selectedId)
  advanceMutashabihatPractice(ctx, { success: ok })
}
