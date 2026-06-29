// Deterministic audio engine snapshot for playback state.
// No autoplay on restore.

export function audioInitialState(nowIso = new Date().toISOString()) {
  return {
    nowIso,
    src: '',
    currentTime: 0,
    playbackRate: 1,
    volume: 1,
    muted: false,
    ayahNumberInSurah: null
  }
}

export function audioSetSource(snapshot, src, nowIso = new Date().toISOString()) {
  return { ...snapshot, nowIso, src: String(src || ''), currentTime: 0 }
}

export function audioSetTime(snapshot, currentTime, nowIso = new Date().toISOString()) {
  return { ...snapshot, nowIso, currentTime: Math.max(0, Number(currentTime) || 0) }
}

export function audioSetPlayback(snapshot, patch = {}, nowIso = new Date().toISOString()) {
  return {
    ...snapshot,
    nowIso,
    playbackRate: patch.playbackRate !== undefined ? Number(patch.playbackRate) || 1 : snapshot.playbackRate,
    volume: patch.volume !== undefined ? Math.max(0, Math.min(1, Number(patch.volume) || 0)) : snapshot.volume,
    muted: patch.muted !== undefined ? !!patch.muted : snapshot.muted
  }
}

