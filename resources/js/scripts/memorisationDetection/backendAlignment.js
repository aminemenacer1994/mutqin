export function applyBackendAlignmentToResult(result = {}, assessment = {}) {
  const backendWords = Array.isArray(assessment?.word_results) ? assessment.word_results : []
  if (!backendWords.length) return result

  const wordStatuses = backendWords.map((word) => {
    const type = String(word?.type || '').toUpperCase()
    const status = (() => {
      if (type === 'MATCH' || type === 'REALIGNMENT') return 'correct'
      if (type === 'DELETION') return 'incorrect'
      if (type === 'SUBSTITUTION' || type === 'DIVERGENCE') return 'incorrect'
      if (type === 'UNASSESSED') return 'pending'
      return String(word?.status || 'pending')
    })()
    return {
      ...word,
      text: word?.displayText || word?.expected_word || word?.text || '',
      status,
      visualStatus: word?.highlight || word?.visual_status || (status === 'correct' ? 'green' : 'neutral'),
      ayahNumber: word?.ayah_number ?? null,
      expectedIndex: word?.expected_index ?? word?.target_index ?? null,
    }
  })

  return {
    ...result,
    accuracyScore: Number(assessment?.accuracy ?? result?.accuracyScore ?? 0),
    confidence: Number(assessment?.confidence ?? result?.confidence ?? 0),
    wordStatuses,
    word_results: backendWords,
    alignmentEvents: Array.isArray(assessment?.alignment?.events) ? assessment.alignment.events : [],
    extraWords: Array.isArray(assessment?.alignment?.extra_words) ? assessment.alignment.extra_words : [],
    scenarioCounts: assessment?.alignment?.scenario_counts || {},
    backendFinalised: true,
  }
}
