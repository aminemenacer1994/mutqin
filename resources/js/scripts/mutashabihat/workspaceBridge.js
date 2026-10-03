import { buildAyahComparison, renderComparedAyahWordHtml } from './compareAyahs.js'
import {
  findPairsForVerseKey,
  listAllMutashabihatPairs,
  otherVerseKeyInPair,
} from './pairsIndex.js'
import { detectMutashabihatDrift } from './detectDrift.js'
import {
  fetchMutashabihatProgress,
  recordMutashabihatConfusion,
  recordMutashabihatPractice,
} from './api.js'
import {
  buildMutashabihatPracticePlan as buildPlan,
  distinctionRemembered,
  gradeIdentifyChoice,
  shouldRecitePairedAyah,
  summarisePracticeSuccess,
} from './practiceExercises.js'
import {
  filterMutashabihatRows,
  loadLocalMutashabihatProgress,
  mergeCatalogWithProgress,
  normalizeMutashabihatStatus,
  prioritiseMutashabihatRows,
  recordLocalMutashabihatPractice,
} from './pairStatus.js'
import { getSurahEdition } from '../lib/quranApis.js'
import {
  buildMutashabihatCardRow,
  formatPairTitle,
  formatVerseLabel,
  getVerseLookup,
  resolveArabicFromSearchIndex,
  resolveTranslationFromSearchIndex,
} from './pairRows.js'

export { resolveArabicFromSearchIndex, resolveTranslationFromSearchIndex }

function currentScope(ctx) {
  return {
    chapterId: Number(ctx?.chapterId || ctx?.currentChapter?.id || 0),
    rangeStart: Number(ctx?.rangeStart || 0),
    rangeEnd: Number(ctx?.rangeEnd || ctx?.rangeStart || 0),
  }
}

function localUserId(ctx) {
  return ctx?.auth?.id || ctx?.user?.id || 'guest'
}

export function buildMutashabihatCompareView(ctx, { pair, anchorVerseKey, row } = {}) {
  const fromRow = row || null
  const resolvedPair = pair || fromRow?.pair
  const anchor = String(anchorVerseKey || fromRow?.leftVerseKey || resolvedPair?.verse_key_1 || '').trim()
  const other = fromRow?.rightVerseKey || otherVerseKeyInPair(resolvedPair, anchor)
  const leftText = fromRow?.leftArabic || resolveArabicFromSearchIndex(ctx, anchor)
  const rightText = fromRow?.rightArabic || resolveArabicFromSearchIndex(ctx, other)
  if (!leftText || !rightText) return null

  const comparison = buildAyahComparison(leftText, rightText)

  return {
    pair: resolvedPair,
    anchorVerseKey: anchor,
    otherVerseKey: other,
    leftLabel: fromRow?.leftCompareLabel || formatVerseLabel(ctx, anchor, { separator: ' · ' }),
    rightLabel: fromRow?.rightCompareLabel || formatVerseLabel(ctx, other, { separator: ' · ' }),
    leftHtml: fromRow?.leftWordHtml
      || renderComparedAyahWordHtml(comparison.left, anchor)
      || fromRow?.leftHtml
      || comparison.leftHtml,
    rightHtml: fromRow?.rightWordHtml
      || renderComparedAyahWordHtml(comparison.right, other)
      || fromRow?.rightHtml
      || comparison.rightHtml,
    leftTranslation: fromRow?.leftTranslation || resolveTranslationFromSearchIndex(ctx, anchor),
    rightTranslation: fromRow?.rightTranslation || resolveTranslationFromSearchIndex(ctx, other),
    leftVerseKey: anchor,
    rightVerseKey: other,
    leftPhrase: comparison.leftPhrase,
    rightPhrase: comparison.rightPhrase,
  }
}

function withTimeout(promise, ms, label = 'timeout') {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(label)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

export async function refreshMutashabihatProgress(ctx) {
  if (ctx.isLoggedIn) {
    try {
      ctx.mutashabihatProgressRows = await withTimeout(
        fetchMutashabihatProgress(),
        8000,
        'mutashabihat-progress-timeout',
      )
      return
    } catch {
      ctx.mutashabihatProgressRows = loadLocalMutashabihatProgress(localUserId(ctx))
      return
    }
  }
  ctx.mutashabihatProgressRows = loadLocalMutashabihatProgress(localUserId(ctx))
}

export function listMutashabihatRankedPairs(ctx, { status = 'all', query = '' } = {}) {
  const merged = mergeCatalogWithProgress(
    listAllMutashabihatPairs(),
    Array.isArray(ctx.mutashabihatProgressRows) ? ctx.mutashabihatProgressRows : [],
  )
  const ranked = prioritiseMutashabihatRows(merged, currentScope(ctx))
  return filterMutashabihatRows(ranked, { status, query })
}

export function countMutashabihatRows(ctx, options = {}) {
  return listMutashabihatRankedPairs(ctx, options).length
}

function rowPreviewsReady(row) {
  return !!(row?.leftPreviewHtml && row?.rightPreviewHtml)
}

export function listMutashabihatCardRows(ctx, { limit = 0, status = 'all', query = '' } = {}) {
  const ranked = listMutashabihatRankedPairs(ctx, { status, query })
  const rows = []
  for (const item of ranked) {
    const row = buildMutashabihatCardRow(ctx, item)
    if (!row || !rowPreviewsReady(row)) continue
    rows.push(row)
    if (limit > 0 && rows.length >= limit) break
  }
  return rows
}

/** Fetch ayah text until visible rows can render without empty previews. */
export async function hydrateMutashabihatPanelRows(ctx, { target = 0 } = {}) {
  const want = Math.max(1, Number(target || ctx.mutashabihatVisibleLimit || 3))
  const ranked = listMutashabihatRankedPairs(ctx)
  if (!ranked.length) return []

  const maxPairs = Math.min(ranked.length, 48)
  await hydrateMutashabihatAyahs(ctx, { limit: maxPairs })
  let best = listMutashabihatCardRows(ctx, { limit: want })
  if (best.length < want) {
    await hydrateMutashabihatAyahs(ctx, { limit: maxPairs })
    best = listMutashabihatCardRows(ctx, { limit: want })
  }

  ctx.mutashabihatAyahRevision = Number(ctx.mutashabihatAyahRevision || 0) + 1
  return best
}

function pairVerseKeys(item) {
  const pair = item?.pair || item
  const left = pair?.verse_key_1 || `${pair?.surah_number_1}:${pair?.ayah_number_1}`
  const right = pair?.verse_key_2 || `${pair?.surah_number_2}:${pair?.ayah_number_2}`
  return [left, right].filter((key) => /^\d{1,3}:\d{1,3}$/.test(String(key)))
}

export async function hydrateMutashabihatAyahs(ctx, { keys = [], limit = 0 } = {}) {
  if (!ctx) return false
  const verseKeys = (Array.isArray(keys) && keys.length)
    ? keys
    : listMutashabihatRankedPairs(ctx)
      .slice(0, Math.max(1, Number(limit || ctx.mutashabihatVisibleLimit || 3)))
      .flatMap(pairVerseKeys)
  const uniqueKeys = [...new Set(verseKeys.map((key) => String(key || '').trim()).filter(Boolean))]
  if (!uniqueKeys.length) return false

  const lookup = getVerseLookup(ctx)
  const missing = uniqueKeys.filter((key) => !verseArabic(lookup.get(key)))
  if (!missing.length) return false

  const surahs = [...new Set(missing.map((key) => Number(String(key).split(':')[0] || 0)))]
    .filter((surah) => surah > 0)
  const translationEdition = ctx.translationEditionId || 'en.sahih'
  const next = { ...(ctx.mutashabihatAyahByKey || {}) }

  await Promise.all(surahs.map(async (surah) => {
    try {
      const [arabicRes, translationRes] = await Promise.all([
        withTimeout(getSurahEdition(surah, 'quran-uthmani'), 12000, 'mutashabihat-surah-arabic'),
        withTimeout(getSurahEdition(surah, translationEdition), 12000, 'mutashabihat-surah-translation').catch(() => null),
      ])
      const ayahs = arabicRes?.data?.data?.ayahs || []
      const translations = translationRes?.data?.data?.ayahs || []
      const tMap = new Map(translations.map((ayah) => [Number(ayah.numberInSurah), String(ayah.text || '').trim()]))
      for (const ayah of ayahs) {
        const key = `${surah}:${ayah.numberInSurah}`
        next[key] = {
          key,
          arabic: String(ayah.text || '').trim(),
          translation: tMap.get(Number(ayah.numberInSurah)) || '',
        }
      }
    } catch {
      // Non-blocking: cards still render refs until the full index arrives.
    }
  }))

  ctx.mutashabihatAyahByKey = next
  ctx.mutashabihatAyahRevision = Number(ctx.mutashabihatAyahRevision || 0) + 1
  return Object.keys(next).length > 0
}

function verseArabic(row) {
  return String(row?.arabic || row?.text || '').trim()
}

export function startMutashabihatPractice(ctx, { pair, anchorVerseKey, row } = {}) {
  const resolvedPair = pair || row?.pair
  const anchor = String(anchorVerseKey || row?.expected_verse_key || row?.leftVerseKey || resolvedPair?.verse_key_1 || '').trim()
  const other = otherVerseKeyInPair(resolvedPair, anchor)
  const arabicByKey = {
    [anchor]: row?.leftArabic || resolveArabicFromSearchIndex(ctx.quranSearchIndex, anchor),
    [other]: row?.rightArabic || resolveArabicFromSearchIndex(ctx.quranSearchIndex, other),
  }
  const translationByKey = {
    [anchor]: row?.leftTranslation || resolveTranslationFromSearchIndex(ctx.quranSearchIndex, anchor),
    [other]: row?.rightTranslation || resolveTranslationFromSearchIndex(ctx.quranSearchIndex, other),
  }
  const labelsByKey = {
    [anchor]: formatVerseLabel(ctx, anchor, { separator: ' · ' }),
    [other]: formatVerseLabel(ctx, other, { separator: ' · ' }),
  }
  const steps = buildPlan({
    pair: resolvedPair,
    anchorVerseKey: anchor,
    arabicByKey,
    translationByKey,
    labelsByKey,
  })
  if (!steps.length) return false

  ctx.mutashabihatPracticeSession = {
    pair: resolvedPair,
    anchorVerseKey: anchor,
    otherVerseKey: other,
    steps,
    stepIndex: 0,
    correctCount: 0,
    arabicByKey,
    labelsByKey,
    pairLabel: formatPairTitle(ctx, resolvedPair),
    results: {
      recall: { remembered: null },
      choose: { correct: null, selectedId: '' },
      recite: { attempted: false, skipped: false, success: null, confused: false, unassessed: false, verseKey: anchor },
    },
  }
  ctx.mutashabihatPracticeOpen = true
  ctx.mutashabihatCompareOpen = false
  ctx.mutashabihatCatalogOpen = false
  ctx.mutashabihatPracticeResume = false
  return true
}

export function currentMutashabihatPracticeStep(ctx) {
  const session = ctx.mutashabihatPracticeSession
  if (!session) return null
  if (session.finished) return { kind: 'result' }
  return session.steps[session.stepIndex] || null
}

function persistPracticeOutcome(ctx, session) {
  if (!session?.pair) return
  const success = summarisePracticeSuccess(session.results)
  session.resultSuccess = success
  session.distinctionRemembered = distinctionRemembered(session.results)
  if (ctx.isLoggedIn && session.pair.id) {
    void recordMutashabihatPractice({
      pair_id: session.pair.id,
      success,
    }).then(() => refreshMutashabihatProgress(ctx)).catch(() => {})
    return
  }
  recordLocalMutashabihatPractice({
    pair: session.pair,
    success,
    userId: localUserId(ctx),
  })
  ctx.mutashabihatProgressRows = loadLocalMutashabihatProgress(localUserId(ctx))
}

export function advanceMutashabihatPractice(ctx, { success = true, finish = false } = {}) {
  const session = ctx.mutashabihatPracticeSession
  if (!session) return
  if (success) session.correctCount += 1
  if (finish || session.stepIndex >= session.steps.length - 1) {
    session.finished = true
    session.stepIndex = session.steps.length
    persistPracticeOutcome(ctx, session)
    return
  }
  session.stepIndex += 1
}

export function recordMutashabihatRecall(ctx, remembered) {
  const session = ctx.mutashabihatPracticeSession
  if (!session) return
  session.results.recall = { remembered: !!remembered }
  advanceMutashabihatPractice(ctx, { success: !!remembered })
}

export function gradeMutashabihatIdentify(ctx, selectedId) {
  const session = ctx.mutashabihatPracticeSession
  const step = currentMutashabihatPracticeStep(ctx)
  if (!session || step?.kind !== 'choose') return false
  const ok = gradeIdentifyChoice(step.options, selectedId)
  session.results.choose = { correct: ok, selectedId }
  return ok
}

export function continueAfterMutashabihatChoose(ctx) {
  const session = ctx.mutashabihatPracticeSession
  if (!session) return
  advanceMutashabihatPractice(ctx, { success: session.results.choose?.correct !== false })
}

export function applyMutashabihatReciteResult(ctx, result = {}) {
  const session = ctx.mutashabihatPracticeSession
  const step = currentMutashabihatPracticeStep(ctx)
  if (!session || step?.kind !== 'recite') return
  const verseKey = String(result.verseKey || step.targetVerseKey || session.anchorVerseKey)
  const skipped = !!result.skipped
  const unassessed = !!result.unassessed
  const confused = !!result.confused
  const success = skipped || unassessed ? null : result.success !== false && !confused
  const previous = session.results.recite || {}
  session.results.recite = {
    attempted: previous.attempted || !skipped,
    skipped: skipped && !previous.attempted,
    unassessed: previous.unassessed || unassessed,
    success: previous.success === false || success === false ? false : success,
    confused: previous.confused || confused,
    verseKey,
  }
  if (result.pairAlso && shouldRecitePairedAyah(session.results) && verseKey === session.anchorVerseKey) {
    step.targetVerseKey = session.otherVerseKey
    step.pairPass = true
    return
  }
  advanceMutashabihatPractice(ctx, {
    success: success !== false,
    finish: true,
  })
}

export function nextMutashabihatPairRow(ctx, currentPair) {
  const rows = listMutashabihatCardRows(ctx)
  const currentKey = currentPair?.pair_key || currentPair?.id
  const index = rows.findIndex((row) => (
    row.pair?.pair_key === currentKey || row.pair?.id === currentKey
  ))
  if (index >= 0 && index < rows.length - 1) return rows[index + 1]
  return rows.find((row) => row.pair?.pair_key !== currentKey && row.pair?.id !== currentKey) || null
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
  const resolved = normalizeMutashabihatStatus(status)
  const label = ctx.t?.(`memorisation.mutashabihat.status.${resolved}`)
  if (label && !String(label).includes('mutashabihat.status')) return label
  if (resolved === 'strong') return 'Strong'
  if (resolved === 'improving') return 'Improving'
  if (resolved === 'new') return 'New'
  return 'Needs Practice'
}

export { formatPairTitle, formatVerseLabel }
