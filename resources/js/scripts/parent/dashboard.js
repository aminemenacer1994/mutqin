export function formatWhen(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function activityName(t, activity) {
  if (!activity) return ''
  const key = `parent.activity_${activity}`
  const label = t(key)
  return label && label !== key ? label : activity
}

export function passageLabel(item) {
  if (!item) return ''
  const range = item.ayah_start && item.ayah_end ? `${item.ayah_start}–${item.ayah_end}` : ''
  return [item.surah_name, range].filter(Boolean).join(' · ')
}

export function learningLabel(t, learning) {
  if (!learning) return ''
  if (learning.plan_title) return learning.plan_title
  return [activityName(t, learning.activity), passageLabel(learning)].filter(Boolean).join(' · ')
}

export function initial(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?'
}
