const INSIGHT_KEYS = {
  practised_days_of_period: 'dashboard.advanced_analytics.insight_practised_days',
  ai_accuracy_improved: 'dashboard.advanced_analytics.insight_ai_improved',
  surah_revised_n: 'dashboard.advanced_analytics.insight_surah_revised',
  ayahs_need_attention: 'dashboard.advanced_analytics.insight_attention',
  practice_time_up: 'dashboard.advanced_analytics.insight_practice_time_up',
}

export function resolveInsightCopy(insight, t) {
  if (!insight || typeof insight !== 'object') return null
  const key = INSIGHT_KEYS[insight.key] || `dashboard.advanced_analytics.insight_${insight.key}`
  const params = insight.params && typeof insight.params === 'object' ? insight.params : {}
  const text = t(key, params)
  if (!text || text === key) return null
  return {
    key: insight.key,
    tone: insight.tone || 'trend',
    text,
  }
}

export function resolveInsights(insights, t) {
  if (!Array.isArray(insights)) return []
  return insights.map((item) => resolveInsightCopy(item, t)).filter(Boolean)
}
