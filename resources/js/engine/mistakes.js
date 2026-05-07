// Deterministic mistake tracking snapshot.
// Tracks user-reported mistakes; no AI mutation.

export function mistakesInitialState(nowIso = new Date().toISOString()) {
  return {
    nowIso,
    items: [] // { id, verseKey, type, note, createdIso }
  }
}

export function mistakesAdd(snapshot, { verseKey, type = 'general', note = '' } = {}, nowIso = new Date().toISOString()) {
  const entry = {
    id: `m_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    verseKey: String(verseKey || ''),
    type: String(type || 'general'),
    note: String(note || ''),
    createdIso: nowIso
  }
  return {
    ...snapshot,
    nowIso,
    items: [...snapshot.items, entry]
  }
}

export function mistakesRemove(snapshot, id, nowIso = new Date().toISOString()) {
  return {
    ...snapshot,
    nowIso,
    items: snapshot.items.filter(i => i.id !== id)
  }
}

