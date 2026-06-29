// Deterministic SM-2 implementation for scheduling review items.
// UI must not expose algorithm details; treat as internal engine.

export function sm2InitialState(nowIso = new Date().toISOString()) {
  return {
    nowIso,
    items: {} // key -> { intervalDays, repetitions, easeFactor, dueIso, lastReviewedIso }
  }
}

export function sm2Review(snapshot, key, grade, nowIso = new Date().toISOString()) {
  const safeGrade = Math.max(0, Math.min(5, Number(grade) || 0))
  const prev = snapshot.items[key] || {
    intervalDays: 0,
    repetitions: 0,
    easeFactor: 2.5,
    dueIso: nowIso,
    lastReviewedIso: null
  }

  let { intervalDays, repetitions, easeFactor } = prev

  if (safeGrade < 3) {
    repetitions = 0
    intervalDays = 1
  } else {
    repetitions += 1
    if (repetitions === 1) intervalDays = 1
    else if (repetitions === 2) intervalDays = 6
    else intervalDays = Math.max(1, Math.round(intervalDays * easeFactor))

    // EF adjustment
    easeFactor = easeFactor + (0.1 - (5 - safeGrade) * (0.08 + (5 - safeGrade) * 0.02))
    easeFactor = Math.max(1.3, easeFactor)
  }

  const dueDate = new Date(nowIso)
  dueDate.setUTCDate(dueDate.getUTCDate() + intervalDays)

  return {
    ...snapshot,
    nowIso,
    items: {
      ...snapshot.items,
      [key]: {
        intervalDays,
        repetitions,
        easeFactor,
        dueIso: dueDate.toISOString(),
        lastReviewedIso: nowIso
      }
    }
  }
}

