/**
 * Session automation (Talqin turns, follow windows, auto-advance) must halt while
 * the session is paused or already completed.
 */
export function isSessionAutomationHalted({
  sessionPaused = false,
  sessionCompleted = false,
} = {}) {
  return !!sessionPaused || !!sessionCompleted
}

/**
 * Deferred Talqin advance callbacks (nested timeouts after ayah audio) must not
 * reopen "your turn" or call next() after the user pauses.
 */
export function shouldRunDeferredTalqinAdvance({
  sessionPaused = false,
  sessionCompleted = false,
  talqinModeActive = false,
} = {}) {
  if (isSessionAutomationHalted({ sessionPaused, sessionCompleted })) return false
  return !!talqinModeActive
}
