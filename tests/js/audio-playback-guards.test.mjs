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
})
