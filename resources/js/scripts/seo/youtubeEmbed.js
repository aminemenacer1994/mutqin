const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

const WATCH_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube-nocookie\.com\/embed\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
]

export function extractYoutubeVideoId(value) {
  const raw = String(value ?? '').trim()
  if (!raw) {
    return ''
  }
  if (VIDEO_ID_PATTERN.test(raw)) {
    return raw
  }
  for (const pattern of WATCH_PATTERNS) {
    const match = raw.match(pattern)
    if (match?.[1]) {
      return match[1]
    }
  }
  return ''
}

export function youtubeNoCookieEmbedSrc(videoId) {
  const id = extractYoutubeVideoId(videoId)
  return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0` : ''
}
