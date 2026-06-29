import { mutateMutqinState } from './useMutqinPersistence'

export const RETENTION_ZONE_STEPS = {
  Fresh: [0, 1, 2],
  Stable: [3, 7, 14],
  Strong: [30, 60, 90]
}

const zones = ['Fresh', 'Stable', 'Strong']

function localDateKey(date = new Date()) {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) return date.slice(0, 10)
  const value = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(value.getTime())) return localDateKey()
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(days, from = new Date()) {
  const date = new Date(from)
  date.setDate(date.getDate() + days)
  return localDateKey(date)
}

function scheduleFor(zone, zoneStep, from) {
  const steps = RETENTION_ZONE_STEPS[zone] || RETENTION_ZONE_STEPS.Fresh
  const index = Math.max(0, Math.min(Number(zoneStep || 0), steps.length - 1))
  return addDays(steps[index], from)
}

export function getDueReviews(state, today = localDateKey()) {
  const todayKey = localDateKey(today)
  const seen = new Set()
  return Object.values(state.ayahs || {})
    .filter(ayah => {
      if (['new', 'learning'].includes(ayah.status)) return true
      return ayah.next_review && localDateKey(ayah.next_review) <= todayKey
    })
    .filter(ayah => {
      if (seen.has(ayah.id)) return false
      seen.add(ayah.id)
      return true
    })
}

export function scoreRetention(state, id, score) {
  return mutateMutqinState(state, draft => {
    const ayah = draft.ayahs[id]
    if (!ayah) return null
    ayah.zone = zones.includes(ayah.zone) ? ayah.zone : 'Fresh'
    ayah.zone_step = Math.max(0, Math.min(2, Number(ayah.zone_step || 0)))
    const currentIndex = Math.max(0, zones.indexOf(ayah.zone))
    const currentStep = Math.max(0, Number(ayah.zone_step || 0))
    if (score === 'Easy') {
      if (currentStep >= 2) {
        ayah.zone = zones[Math.min(zones.length - 1, currentIndex + 1)]
        ayah.zone_step = 0
      } else {
        ayah.zone_step = currentStep + 1
      }
    }
    if (score === 'Shaky') ayah.zone_step = currentStep
    if (score === 'Forgot') {
      ayah.zone = zones[Math.max(0, currentIndex - 1)]
      ayah.zone_step = 0
      ayah.weak_count = Number(ayah.weak_count || 0) + 1
    }
    const reviewedAt = new Date()
    ayah.last_review = reviewedAt.toISOString()
    ayah.next_review = scheduleFor(ayah.zone, ayah.zone_step, reviewedAt)
    ayah.status = score === 'Forgot' ? 'weak' : 'reviewed'
    return ayah
  })
}
