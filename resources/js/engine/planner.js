// Deterministic Hifz planner snapshot + reducer-style updates.
// Keep UI language simple; do not expose internal mechanics.

export function plannerInitialState(nowIso = new Date().toISOString()) {
  return {
    nowIso,
    planId: null,
    // memorisation | revision | mixed | recovery (planner derived only)
    intent: null,
    // A plan is a static intent + schedule; do not mutate without explicit user action.
    goals: {
      surahNumber: null,
      startAyah: null,
      endAyah: null
    },
    schedule: {
      daysPerWeek: 7,
      minutesPerDay: 15
    }
  }
}

export function plannerSetGoal(snapshot, goalPatch, nowIso = new Date().toISOString()) {
  return {
    ...snapshot,
    nowIso,
    goals: { ...snapshot.goals, ...goalPatch }
  }
}

export function plannerSetSchedule(snapshot, schedulePatch, nowIso = new Date().toISOString()) {
  return {
    ...snapshot,
    nowIso,
    schedule: { ...snapshot.schedule, ...schedulePatch }
  }
}
