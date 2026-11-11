/**
 * YouTube IFrame Player API, loaded only when a tutorial is opened.
 * Playback falls back to a nocookie iframe if the API is slow or blocked.
 */

import { youtubeNoCookieEmbedSrc } from '../seo/youtubeEmbed.js'

const API_SRC = 'https://www.youtube.com/iframe_api'
const API_WAIT_MS = 1500

let apiPromise = null

export function loadYouTubeIframeApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('youtube-api'))
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    const timer = window.setTimeout(() => reject(new Error('youtube-api-timeout')), 8000)
    window.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timer)
      try {
        previous?.()
      } catch {
        /* ignore a previous hook */
      }
      if (window.YT?.Player) resolve(window.YT)
      else reject(new Error('youtube-api'))
    }
    const script = document.createElement('script')
    script.src = API_SRC
    script.async = true
    script.onerror = () => {
      window.clearTimeout(timer)
      apiPromise = null
      reject(new Error('youtube-api'))
    }
    document.head.appendChild(script)
  })
  return apiPromise
}

function mountFallbackIframe(mount, videoId) {
  const src = youtubeNoCookieEmbedSrc(videoId)
  if (!mount || !src) return { destroy() {} }
  mount.replaceChildren()
  const frame = document.createElement('iframe')
  frame.className = 'tutorials-modal__frame'
  frame.src = src
  frame.title = 'Tutorial'
  frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
  frame.allowFullscreen = true
  frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
  mount.appendChild(frame)
  return {
    destroy() {
      try {
        mount.replaceChildren()
      } catch {
        /* node already gone */
      }
    },
  }
}

function createPlayer(YT, mount, videoId, handlers) {
  let timer = 0
  let player = null
  const stop = () => {
    if (!timer) return
    window.clearInterval(timer)
    timer = 0
  }
  const poll = () => {
    try {
      const duration = player?.getDuration?.()
      const current = player?.getCurrentTime?.()
      handlers.onTime?.(current, duration)
    } catch {
      /* ignore player races */
    }
  }
  player = new YT.Player(mount, {
    videoId,
    host: 'https://www.youtube-nocookie.com',
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 1,
      rel: 0,
      enablejsapi: 1,
      origin: handlers.origin || undefined,
      modestbranding: 1,
    },
    events: {
      onReady(event) {
        try {
          const duration = event.target.getDuration?.()
          if (duration > 0) handlers.onDuration?.(duration)
          event.target.playVideo?.()
        } catch {
          /* playback still starts from autoplay */
        }
      },
      onStateChange(event) {
        try {
          const state = event.data
          if (state === YT.PlayerState.PLAYING) {
            handlers.onPlay?.()
            stop()
            timer = window.setInterval(poll, 500)
            return
          }
          if (state === YT.PlayerState.ENDED) {
            stop()
            handlers.onComplete?.()
            return
          }
          if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.CUED) {
            stop()
          }
        } catch {
          /* never interrupt playback */
        }
      },
      onError() {
        stop()
        try {
          player?.destroy?.()
        } catch {
          /* ignore */
        }
        mountFallbackIframe(mount, videoId)
      },
    },
  })
  return {
    destroy() {
      stop()
      try {
        player?.destroy?.()
      } catch {
        /* ignore */
      }
    },
  }
}

export function mountTutorialPlayback(mount, videoId, handlers = {}) {
  let settled = false
  let handle = { destroy() {} }
  const finish = (next) => {
    if (settled) {
      next?.destroy?.()
      return handle
    }
    settled = true
    handle = next || handle
    return handle
  }
  const fallback = () => finish(mountFallbackIframe(mount, videoId))
  const timer = window.setTimeout(fallback, API_WAIT_MS)
  return loadYouTubeIframeApi()
    .then((YT) => {
      window.clearTimeout(timer)
      if (settled) return handle
      return finish(createPlayer(YT, mount, videoId, handlers))
    })
    .catch(() => {
      window.clearTimeout(timer)
      return fallback()
    })
}
