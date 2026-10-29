/** In-memory playback speed (session only). */
let rememberedSpeed = 1

export const ATTEMPT_PLAYBACK_SPEEDS = Object.freeze([0.75, 1, 1.25])

export function getRememberedPlaybackSpeed() {
  const value = Number(rememberedSpeed)
  return ATTEMPT_PLAYBACK_SPEEDS.includes(value) ? value : 1
}

export function setRememberedPlaybackSpeed(rate) {
  const value = Number(rate)
  if (ATTEMPT_PLAYBACK_SPEEDS.includes(value)) {
    rememberedSpeed = value
  }
}

export function cycleRememberedPlaybackSpeed() {
  const current = getRememberedPlaybackSpeed()
  const index = ATTEMPT_PLAYBACK_SPEEDS.indexOf(current)
  const next = ATTEMPT_PLAYBACK_SPEEDS[(index + 1) % ATTEMPT_PLAYBACK_SPEEDS.length]
  setRememberedPlaybackSpeed(next)
  return next
}
