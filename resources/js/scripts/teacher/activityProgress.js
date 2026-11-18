/**
 * Shared with App\Support\ActivityProgress.
 * 0/1 = 0%, 1/2 = 50%, 1/1 = 100%, and an empty plan stays at 0%.
 */
export function activityProgressPercent(completed, total) {
  const done = Math.max(0, Number(completed) || 0)
  const goal = Math.max(0, Number(total) || 0)
  if (goal <= 0 || done <= 0) return 0
  if (done >= goal) return 100
  return Math.max(0, Math.min(100, Math.round((done / goal) * 100)))
}

/** 0% must be 0px. A 0% width can resolve as auto and paint the whole track. */
export function progressMeterStyle(completed, total) {
  const percent = activityProgressPercent(completed, total)
  return { width: percent <= 0 ? '0px' : `${percent}%` }
}
