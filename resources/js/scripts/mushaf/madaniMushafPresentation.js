import { formatMadaniAyahEndLabel, isVerseInteractiveOnPage } from './madaniPageLayout.js'
import { buildMadaniMushafPageModel, isQcfSlotText } from './madaniMushafLayout.js'
import { isQcfFontLoaded } from './qcfFontLoader.js'

/**
 * Enrich QUL-authoritative Mushaf lines with session/audio/AI presentation state.
 */
export function enrichMadaniMushafLines(lines = [], context = {}) {
  const {
    pageNumber = 1,
    sessionKeys = null,
    useGlyphs = true,
    fontReady = false,
    fontFamily = '',
    tajweedEnabled = false,
    audioIndexMap = new Map(),
    resolveAudioWordIndex = () => null,
    getRecitationStatus = () => '',
    isVerseBlurred = () => false,
    isVersePeekRevealed = () => false,
    isVerseActive = () => false,
    isVersePlaying = () => false,
    isWordHighlighted = () => false,
    isPracticeFocusWord = () => false,
    isMasteredAyah = () => false,
    focusModeEnabled = false,
    anchorModeEnabled = false,
    getAnchorIndices = () => [],
    getVerseAudioWordCount = () => 0,
    resolveWordGloss = () => '',
    resolvePlainArabic = () => '',
    showWordByWord = false,
    shouldShowAiReview = () => false,
    hideQuranText = false,
    hiddenAyahKeys = new Set(),
    revealCurrentWordOnly = false,
    effectiveActiveVerseKey = '',
    currentHighlightedVerseKey = '',
    currentWordIndex = null,
    keepFullPage = false,
  } = context

  const anchorIndexCache = new Map()

  return (lines || []).map((line, lineIndex) => {
    if (line.type === 'surah_name' || line.type === 'basmala') {
      return {
        ...line,
        key: line.key || `mm-${pageNumber}-${line.lineNumber}-${line.type}-${lineIndex}`,
        fontFamily,
        fontReady,
        useGlyphs,
        words: [],
      }
    }

    if (line.type === 'empty') {
      return {
        ...line,
        key: line.key || `mm-${pageNumber}-${line.lineNumber}-empty-${lineIndex}`,
        fontFamily,
        fontReady,
        useGlyphs,
        words: [],
      }
    }

    const words = (line.words || [])
      .filter(word => keepFullPage || isVerseInteractiveOnPage(word?.verseKey, sessionKeys))
      .map(word => {
        const verseKey = word.verseKey
        const inSession = sessionKeys == null || sessionKeys === true || isVerseInteractiveOnPage(verseKey, sessionKeys)
        const isEnd = word.isEnd || word.charType === 'end'
        const hasCodeV2 = !!String(word.codeV2 || '').trim()
        const uthmani = String(word.textUthmani || word.text_uthmani || '').trim()
        const textQpc = String(word.textQpc || '').trim()
        const plainArabic = !isEnd
          ? (uthmani || (!isQcfSlotText(textQpc) ? textQpc : '') || String(resolvePlainArabic(word) || '').trim())
          : ''
        const readableUnicode = plainArabic && !isQcfSlotText(plainArabic) ? plainArabic : ''
        // KFGQPC V2 is glyph-first. Unicode is only a last-resort fallback when
        // the page has no QCF slot at all — never mix the two on one page.
        let useGlyph = useGlyphs && hasCodeV2
        let html = useGlyph
          ? (word.codeV2 || word.textQpc || '')
          : (isEnd
            ? formatMadaniAyahEndLabel(word)
            : (readableUnicode || word.codeV2 || word.textQpc || ''))
        if (isEnd && !String(html || '').trim()) {
          html = formatMadaniAyahEndLabel(word)
          useGlyph = false
        }

        const wordIndex = isEnd ? null : resolveAudioWordIndex(word, audioIndexMap)
        const isHighlighted = inSession && !isEnd && isWordHighlighted(verseKey, wordIndex)
        const isActive = inSession && isVerseActive(verseKey)
        const isPlayingAyah = inSession && isVersePlaying(verseKey)
        const recitationStatus = inSession && !isEnd && wordIndex != null
          ? getRecitationStatus(verseKey, wordIndex)
          : ''

        let isAnchor = false
        if (anchorModeEnabled && inSession && !isEnd && wordIndex != null) {
          if (!anchorIndexCache.has(verseKey)) {
            const total = getVerseAudioWordCount(verseKey)
            anchorIndexCache.set(verseKey, new Set(getAnchorIndices(total)))
          }
          isAnchor = anchorIndexCache.get(verseKey).has(wordIndex)
        }

        const isHidden = hideQuranText
          || (hiddenAyahKeys instanceof Set && hiddenAyahKeys.has(verseKey))
          || (revealCurrentWordOnly && !isHighlighted && verseKey === effectiveActiveVerseKey)

        const meaningLabel = showWordByWord && !isEnd
          ? resolveWordGloss(verseKey, wordIndex, word.textQpc)
          : ''

        return {
          ...word,
          html,
          useGlyph,
          isFallbackGlyph: useGlyphs && !useGlyph,
          inSession,
          wordIndex,
          isActive,
          isPlayingAyah,
          isHighlighted,
          isAnchor,
          isBlurred: inSession && isVerseBlurred(verseKey),
          isPeekRevealed: inSession && isVersePeekRevealed(verseKey),
          isMastered: inSession && isMasteredAyah(verseKey),
          isPracticeFocus: inSession && !isEnd && isPracticeFocusWord(verseKey, wordIndex, word.textQpc),
          recitationStatus,
          hasAiReview: inSession && shouldShowAiReview(verseKey),
          isFocusDimmed: focusModeEnabled && inSession && !isActive && !isPlayingAyah && !isHighlighted,
          isHidden,
          preserveWidth: isHidden,
          meaningLabel,
        }
      })

    return {
      ...line,
      key: line.key || `mm-${pageNumber}-${line.lineNumber}-${line.type}-${lineIndex}`,
      fontFamily,
      fontReady,
      useGlyphs,
      words,
    }
  })
}

export function buildMadaniMushafPageView(apiPayload, context = {}) {
  const model = buildMadaniMushafPageModel(apiPayload, {
    tajweed: !!context.tajweedEnabled,
  })
  const pageNumber = model.pageNumber
  const fontReady = context.fontReady != null
    ? !!context.fontReady
    : !!context.useGlyphs && isQcfFontLoaded(pageNumber, { tajweed: !!context.tajweedEnabled })

  const lines = enrichMadaniMushafLines(model.lines, {
    ...context,
    pageNumber,
    fontFamily: model.fontFamily,
    fontReady,
  })

  return {
    ...model,
    lines,
    glyphsReady: fontReady,
    loading: false,
  }
}
