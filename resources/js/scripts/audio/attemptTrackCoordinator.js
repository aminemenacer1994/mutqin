/** @type {{ id: string, stop: () => void } | null} */
let activeTrack = null

export function claimTrackPlayback(trackId, stopFn) {
  if (activeTrack && activeTrack.id !== trackId && typeof activeTrack.stop === 'function') {
    try {
      activeTrack.stop()
    } catch {
      // ignore
    }
  }
  activeTrack = { id: trackId, stop: stopFn }
}

export function releaseTrackPlayback(trackId) {
  if (activeTrack?.id === trackId) activeTrack = null
}

export function stopAllTrackPlayback() {
  if (typeof activeTrack?.stop === 'function') {
    try {
      activeTrack.stop()
    } catch {
      // ignore
    }
  }
  activeTrack = null
}
