// Deterministic chaining engine snapshot.
// Provides "Continue Chain" behavior without exposing mechanics in UI.

export function chainingInitialState(nowIso = new Date().toISOString()) {
  return {
    nowIso,
    active: false,
    chainId: null,
    // Identifiers are deterministic keys like "2:255" or "2:255-257"
    lastAnchorKey: null,
    streak: 0
  }
}

export function chainingStart(snapshot, anchorKey, nowIso = new Date().toISOString()) {
  return {
    ...snapshot,
    nowIso,
    active: true,
    chainId: snapshot.chainId || `chain_${Date.now()}`,
    lastAnchorKey: anchorKey,
    streak: snapshot.streak || 0
  }
}

export function chainingAdvance(snapshot, nextAnchorKey, nowIso = new Date().toISOString()) {
  if (!snapshot.active) return snapshot
  return {
    ...snapshot,
    nowIso,
    lastAnchorKey: nextAnchorKey,
    streak: (snapshot.streak || 0) + 1
  }
}

export function chainingStop(snapshot, nowIso = new Date().toISOString()) {
  return { ...snapshot, nowIso, active: false }
}

