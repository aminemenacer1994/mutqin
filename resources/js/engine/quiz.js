// Deterministic quiz engine snapshot.
// UI should use simple language (e.g., "Start Quiz") without exposing internals.

export function quizInitialState(nowIso = new Date().toISOString()) {
  return {
    nowIso,
    active: false,
    quizId: null,
    mode: 'recall', // recall | recognition
    queue: [], // list of verse keys to quiz
    currentIndex: 0,
    correct: 0,
    incorrect: 0
  }
}

export function quizStart(snapshot, { mode = 'recall', queue = [] } = {}, nowIso = new Date().toISOString()) {
  return {
    ...snapshot,
    nowIso,
    active: true,
    quizId: snapshot.quizId || `quiz_${Date.now()}`,
    mode,
    queue: Array.isArray(queue) ? [...queue] : [],
    currentIndex: 0,
    correct: 0,
    incorrect: 0
  }
}

export function quizAnswer(snapshot, isCorrect, nowIso = new Date().toISOString()) {
  if (!snapshot.active) return snapshot
  const nextIndex = Math.min((snapshot.currentIndex || 0) + 1, (snapshot.queue || []).length)
  return {
    ...snapshot,
    nowIso,
    currentIndex: nextIndex,
    correct: snapshot.correct + (isCorrect ? 1 : 0),
    incorrect: snapshot.incorrect + (isCorrect ? 0 : 1),
    active: nextIndex < (snapshot.queue || []).length
  }
}

export function quizStop(snapshot, nowIso = new Date().toISOString()) {
  return { ...snapshot, nowIso, active: false }
}

