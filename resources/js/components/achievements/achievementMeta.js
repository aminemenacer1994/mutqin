/** Shared achievement presentation helpers (Bootstrap Icons). */

export const ACHIEVEMENT_ICONS = Object.freeze({
  book: 'bi bi-journal-bookmark-fill',
  flame: 'bi bi-fire',
  repeat: 'bi bi-arrow-repeat',
  calendar: 'bi bi-calendar-check',
  target: 'bi bi-bullseye',
  sprout: 'bi bi-graph-up-arrow',
  mic: 'bi bi-mic-fill',
  stars: 'bi bi-stars',
  compass: 'bi bi-compass',
  shield: 'bi bi-shield-check',
})

export const ACHIEVEMENT_TONES = Object.freeze({
  first_steps: 'sage',
  consistent: 'gold',
  reviser: 'blue',
  dedicated: 'emerald',
  focused: 'blue',
  growing: 'sage',
  checker: 'purple',
  memoriser: 'orange',
  explorer: 'red',
  steadfast: 'black',
})

export function achievementIconClass(icon) {
  return ACHIEVEMENT_ICONS[icon] || 'bi bi-award'
}

export function achievementTone(id) {
  return ACHIEVEMENT_TONES[id] || 'sage'
}

export function formatUnlockDate(iso, locale = 'en') {
  if (!iso) return ''
  try {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return ''
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date)
  } catch {
    return ''
  }
}
