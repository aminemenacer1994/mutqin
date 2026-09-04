function asNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function asText(value) {
  return String(value || '').trim()
}

export function buildDashboardAiReciteStatsView(stats, t = (key) => key) {
  const payload = stats && typeof stats === 'object' ? stats : {}
  const total = asNumber(payload.total_attempts)
  const empty = total <= 0

  const cards = [
    {
      key: 'total',
      label: t('dashboard.ai_recite.total_attempts'),
      value: empty ? '—' : String(total),
    },
    {
      key: 'average',
      label: t('dashboard.ai_recite.average_accuracy'),
      value: payload.average_accuracy == null ? '—' : t('dashboard.drawer_accuracy', { n: payload.average_accuracy }),
    },
    {
      key: 'recent',
      label: t('dashboard.ai_recite.recent_accuracy'),
      value: payload.recent_accuracy == null ? '—' : t('dashboard.drawer_accuracy', { n: payload.recent_accuracy }),
    },
    {
      key: 'best',
      label: t('dashboard.ai_recite.best_accuracy'),
      value: payload.best_accuracy == null ? '—' : t('dashboard.drawer_accuracy', { n: payload.best_accuracy }),
    },
    {
      key: 'ayahs',
      label: t('dashboard.ai_recite.ayahs_tested'),
      value: empty ? '—' : String(asNumber(payload.ayahs_tested)),
    },
    {
      key: 'peek',
      label: t('dashboard.ai_recite.peek_usage'),
      value: payload.peek_used_percent == null
        ? '—'
        : `${asNumber(payload.peek_used_count)} · ${payload.peek_used_percent}%`,
    },
  ]

  if (payload.improvement != null) {
    cards.push({
      key: 'improvement',
      label: t('dashboard.ai_recite.improvement'),
      value: `${payload.improvement > 0 ? '+' : ''}${payload.improvement}%`,
    })
  }

  const weakest = Array.isArray(payload.weakest_ayahs)
    ? payload.weakest_ayahs.map((item, index) => ({
      key: `${item.surah_number}:${item.ayah}:${index}`,
      label: [asText(item.surah_name), t('dashboard.ayah_n', { n: item.ayah })].filter(Boolean).join(' · '),
      value: t('dashboard.drawer_accuracy', { n: item.accuracy }),
    }))
    : []

  const missed = Array.isArray(payload.missed_words)
    ? payload.missed_words.map((item, index) => ({
      key: `${item.text}:${index}`,
      text: asText(item.text),
      count: asNumber(item.count),
    })).filter((item) => item.text)
    : []

  const recent = Array.isArray(payload.recent_attempts)
    ? payload.recent_attempts.map((item) => ({
      id: Number(item.id || 0),
      surah_number: Number(item.surah_number || 0),
      surah_name: asText(item.surah_name),
      ayah_start: Number(item.ayah_start || 0),
      ayah_end: Number(item.ayah_end || item.ayah_start || 0),
      band: asText(item.band),
      accuracy_percent: item.accuracy_percent == null ? null : asNumber(item.accuracy_percent),
      peek_used: !!item.peek_used,
      occurred_at: asText(item.occurred_at),
    })).filter((item) => item.id > 0)
    : []

  return {
    empty,
    cards,
    weakest,
    missed,
    recent,
    lastLocation: payload.last_location && typeof payload.last_location === 'object'
      ? payload.last_location
      : null,
  }
}
