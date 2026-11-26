/** Interval polling that skips ticks while the tab is hidden and refreshes once when visible again. */
export function startVisiblePoll(callback, ms = 10000) {
  let timer = null
  const tick = () => {
    if (typeof document !== 'undefined' && document.hidden) return
    callback()
  }
  const onVisibility = () => {
    if (!document.hidden) tick()
  }
  timer = window.setInterval(tick, ms)
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibility)
  }
  return () => {
    if (timer !== null) window.clearInterval(timer)
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }
}