/**
 * Session automation (Talqin turns, follow windows, auto-advance) must halt while
 * the session is paused, completed, or the tools offcanvas is still open.
 */
export function isSessionAutomationHalted({
  sessionPaused = false,
  sessionCompleted = false,
  toolsOpen = false,
} = {}) {
  return !!sessionPaused || !!sessionCompleted || !!toolsOpen
}

/**
 * Deferred Talqin advance callbacks (nested timeouts after ayah audio) must not
 * reopen "your turn" or call next() after the user pauses.
 */
export function shouldRunDeferredTalqinAdvance({
  sessionPaused = false,
  sessionCompleted = false,
  toolsOpen = false,
  talqinModeActive = false,
} = {}) {
  if (isSessionAutomationHalted({ sessionPaused, sessionCompleted, toolsOpen })) return false
  return !!talqinModeActive
}
