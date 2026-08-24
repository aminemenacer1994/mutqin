import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const memorisationSource = readFileSync(
  new URL('../../resources/js/views/Memorisation.js', import.meta.url),
  'utf8'
)
const swSource = readFileSync(
  new URL('../../public/sw.js', import.meta.url),
  'utf8'
)

function extractNormalizeAudioUrl() {
  const match = memorisationSource.match(
    /normalizeAudioUrl\(url\) \{\n(?<body>[\s\S]*?)\n    \},/
  )
  assert.ok(match?.groups?.body, 'normalizeAudioUrl body should exist')
  // eslint-disable-next-line no-new-func
  return new Function('url', `${match.groups.body}\n`)
}

describe('audio playback guards', () => {
  it('ignores MEDIA_ERR_ABORTED in wait/error handlers', () => {
    assert.match(memorisationSource, /isAudioLoadAbortError\(audio = null\) \{/)
    assert.match(
      memorisationSource,
      /waitForAudioElementReady\(audio, timeoutMs = 15000\) \{[\s\S]*isAudioLoadAbortError\(audio\)/
    )
    assert.match(
      memorisationSource,
      /this\.audioError = \(e\) => \{[\s\S]*isAudioLoadAbortError\(audio\)/
    )
    assert.match(
      memorisationSource,
      /code === 4 && !src/,
      'empty-src MEDIA_ERR_SRC_NOT_SUPPORTED must be treated as benign'
    )
    assert.match(
      memorisationSource,
      /describeAudioMediaError\(audio = null\) \{/,
      'real audio failures should log structured MediaError details'
    )
    assert.doesNotMatch(
      memorisationSource,
      /nudge = setTimeout\(\(\) => \{[\s\S]*try \{ audio\.load\(\) \} catch/
    )
  })

  it('normalizes islamic.network relative audio paths', () => {
    const normalizeAudioUrl = extractNormalizeAudioUrl()
    assert.equal(
      normalizeAudioUrl('https://cdn.islamic.network/quran/audio/128/ar.minshawi/6234.mp3'),
      'https://cdn.islamic.network/quran/audio/128/ar.minshawi/6234.mp3'
    )
    assert.equal(
      normalizeAudioUrl('/quran/audio/128/ar.minshawi/6234.mp3'),
      'https://cdn.islamic.network/quran/audio/128/ar.minshawi/6234.mp3'
    )
    assert.equal(
      normalizeAudioUrl('/wbw/foo.mp3'),
      'https://verses.quran.com/wbw/foo.mp3'
    )
    assert.equal(
      normalizeAudioUrl('/audio/ayah/ar.alafasy/1.mp3'),
      '/audio/ayah/ar.alafasy/1.mp3'
    )
    assert.equal(
      normalizeAudioUrl('relative-without-host.mp3'),
      'relative-without-host.mp3'
    )
  })

  it('does not cache CDN audio in the service worker', () => {
    assert.match(
      swSource,
      /if \(isAudio \|\| url\.host === 'cdn\.islamic\.network'\) \{\s*[\s\S]*event\.respondWith\(fetch\(request\)\);/
    )
    assert.doesNotMatch(swSource, /cacheFirst\(request, AUDIO_CACHE\)/)
  })

  it('unlocks advanceLocked when cancelling the gap timer (prevents frozen transport)', () => {
    assert.match(
      memorisationSource,
      /clearPlaybackAdvanceTimer\(options = \{\}\) \{[\s\S]*options\.unlock[\s\S]*advanceLocked = false/
    )
    assert.match(
      memorisationSource,
      /async playVerse\([\s\S]*clearPlaybackAdvanceTimer\(\{\s*unlock:\s*true\s*\}\)/
    )
  })

  it('cancels stale playVerse work with a generation token', () => {
    assert.match(memorisationSource, /playGeneration:\s*0/)
    assert.match(
      memorisationSource,
      /async playVerse\([\s\S]*playGeneration = \+\+this\.playGeneration[\s\S]*playGeneration !== this\.playGeneration/
    )
  })

  it('attaches fallback ayah audio when Play is pressed without a source', () => {
    assert.match(memorisationSource, /ensureVerseAudioUrl\(verse/)
    assert.match(memorisationSource, /ensureLiveSessionAudioAttached\(\)/)
    assert.match(memorisationSource, /toPlayableAudioUrl\(/)
    assert.match(memorisationSource, /listAyahAudioCandidates\(/)
    assert.match(memorisationSource, /attachMainAudioSource\(/)
    assert.match(
      memorisationSource,
      /togglePlay\(\) \{[\s\S]*isMainAudioReady[\s\S]*playQueueEntry\(entry, \{ force: true/,
    )
    assert.match(
      memorisationSource,
      /async playVerse\([\s\S]*listAyahAudioCandidates\(verse\)/,
    )
  })

  it('plays bundled Al-Fatihah audio first and keeps same-origin paths local', () => {
    const normalizeAudioUrl = extractNormalizeAudioUrl()
    assert.equal(
      normalizeAudioUrl('/audio/ayah/ar.alafasy/1.mp3'),
      '/audio/ayah/ar.alafasy/1.mp3',
    )
    assert.equal(
      normalizeAudioUrl('/memorisation/audio-download?url=https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3'),
      '/memorisation/audio-download?url=https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3',
    )
    assert.match(memorisationSource, /bundledAyahAudioUrl\(/)
    assert.match(memorisationSource, /\/audio\/ayah\/ar\.alafasy\/\$\{n\}\.mp3/)
    assert.match(
      memorisationSource,
      /audioLoadedMetadata = \(\) => \{[\s\S]*syncAudioUiState/,
    )
    assert.match(
      memorisationSource,
      /async playVerse\([\s\S]*await this\.audioElement\.play\(\)/,
    )
    assert.doesNotMatch(
      memorisationSource,
      /toPlayableAudioUrl\(url\) \{[\s\S]*mode=play/,
    )
  })

  it('recovers main-audio waiting/stalled freezes', () => {
    assert.match(memorisationSource, /addEventListener\('waiting',\s*this\.audioWaiting\)/)
    assert.match(memorisationSource, /addEventListener\('stalled',\s*this\.audioStalled\)/)
    assert.match(memorisationSource, /recoverStalledMainAudio\(\)/)
    assert.match(
      memorisationSource,
      /togglePlay\(\) \{[\s\S]*audioElement\.ended[\s\S]*currentTime = 0/
    )
  })
})
