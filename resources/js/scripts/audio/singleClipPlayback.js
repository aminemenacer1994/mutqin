/** @type {(() => void) | null} */
let activeStop = null

/** Stop any other clip and register this one as active. */
export function claimClipPlayback(stopFn) {
  if (typeof activeStop === 'function' && activeStop !== stopFn) {
    try {
      activeStop()
    } catch {
      // ignore
    }
  }
  activeStop = stopFn
}

export function releaseClipPlayback(stopFn) {
  if (activeStop === stopFn) {
    activeStop = null
  }
}

export function stopActiveClipPlayback() {
  if (typeof activeStop === 'function') {
    try {
      activeStop()
    } catch {
      // ignore
    }
  }
  activeStop = null
}
