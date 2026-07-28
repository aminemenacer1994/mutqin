/**
 * Lightweight helpers for calm post-session coaching:
 * dynamic practice ETA, short guidance, and weak-word normalisation.
 */

/**
 * @param {string} technique
 * @param {number} ayahCount
 */
export function calculateTechniqueInteractionTime(technique, ayahCount = 1) {
  const count = Math.max(1, Number(ayahCount) || 1)
  const id = String(technique || '').toLowerCase()
  if (id === 'talqin') return count * 8
  if (id === 'blur') return count * 6
  if (id === 'focus') return count * 4
  if (id === 'chaining') return count * 5
  if (id === 'anchor') return count * 3
  return count * 2
}

/**
 * @param {number} minutes
 */
export function formatAboutMinutes(minutes) {
  const m = Math.max(1, Math.round(Number(minutes) || 1))
  if (m === 1) return 'About 1 minute'
  return `About ${m} minutes`
}

/**
 * Dynamic practice duration from audio + session settings.
 *
 * @param {{
 *   audioDurationSeconds?: number,
 *   playbackSpeed?: number,
 *   repetitions?: number,
 *   pauseBetweenRepeats?: number,
 *   technique?: string,
 *   ayahCount?: number,
 *   learnerReciteFactor?: number,
 * }} input
 */
export function estimatePracticeDuration(input = {}) {
  const ayahCount = Math.max(1, Number(input.ayahCount) || 1)
  const audioRaw = Number(input.audioDurationSeconds)
  const audioDuration = Number.isFinite(audioRaw) && audioRaw > 0
    ? audioRaw
    : ayahCount * 22
  const playbackSpeed = Math.max(0.5, Number(input.playbackSpeed) || 1)
  const repetitions = Math.max(1, Number(input.repetitions) || 3)
  const pauseBetweenRepeats = Math.max(0, Number(input.pauseBetweenRepeats) || 1.5)
  const learnerReciteFactor = Math.max(0, Number(input.learnerReciteFactor) || 0.35)

  const playbackSeconds = audioDuration / playbackSpeed
  const repetitionSeconds = playbackSeconds * repetitions
  const pauseSeconds = pauseBetweenRepeats * Math.max(repetitions - 1, 0) * ayahCount
  const interactionSeconds = calculateTechniqueInteractionTime(input.technique, ayahCount)
  const learnerSeconds = playbackSeconds * learnerReciteFactor * repetitions

  const estimatedSeconds = Math.max(
    30,
    Math.round(repetitionSeconds + pauseSeconds + interactionSeconds + learnerSeconds),
  )
  const minutes = Math.max(1, Math.round(estimatedSeconds / 60))
  return {
    seconds: estimatedSeconds,
    minutes,
    label: formatAboutMinutes(minutes),
  }
}

/**
 * Short post-practice line from real behaviour — never invents weaknesses.
 *
 * @param {{
 *   completed?: boolean,
 *   replayHeavyAyah?: number|null,
 *   pausedOften?: boolean,
 *   speedChanged?: boolean,
 *   hasAiResult?: boolean,
 *   t?: Function|null,
 * }} input
 */
export function buildPostPracticeGuidance(input = {}) {
  const t = typeof input.t === 'function' ? input.t : null
  const ayah = Number(input.replayHeavyAyah)
  if (Number.isFinite(ayah) && ayah > 0) {
    const key = 'memorisation.postSession.coach.ayahNeededMore'
    const msg = t?.(key, { ayah })
    if (msg && !String(msg).includes('ayahNeededMore')) return msg
    return `Āyah ${ayah} needed more repetition. Practise it once slowly before testing.`
  }
  if (input.pausedOften) {
    const msg = t?.('memorisation.postSession.coach.takeItSlow')
    if (msg && !String(msg).includes('takeItSlow')) return msg
    return 'You paused often. Take your time and focus on one āyah before testing.'
  }
  if (input.speedChanged) {
    const msg = t?.('memorisation.postSession.coach.speedSettled')
    if (msg && !String(msg).includes('speedSettled')) return msg
    return 'You adjusted the speed. Keep that pace when you test.'
  }
  if (input.completed) {
    const msg = t?.('memorisation.postSession.coach.readyToTest')
    if (msg && !String(msg).includes('readyToTest')) return msg
    return 'You completed the passage smoothly. You are ready to test.'
  }
  const msg = t?.('memorisation.postSession.coach.firstPracticeDone')
  if (msg && !String(msg).includes('firstPracticeDone')) return msg
  return 'You have completed your first practice. Test when you feel ready.'
}

/**
 * Compact live coach line during an active practice session.
 * Keep wording simple, Islamic, and free of jargon so beginners
 * understand what the active memorisation method is doing right now.
 *
 * @param {{
 *   isPlaying?: boolean,
 *   isPaused?: boolean,
 *   isCompleted?: boolean,
 *   technique?: string,
 *   readyToTest?: boolean,
 *   suggestedSpeed?: number,
 *   difficulty?: boolean,
 *   focusWordText?: string,
 *   hasFocusWords?: boolean,
 *   ayahNumber?: number|null,
 *   t?: Function|null,
 * }} input
 */
export function buildLiveSessionGuidance(input = {}) {
  const t = typeof input.t === 'function' ? input.t : null
  const pick = (key, fallback, params) => {
    const msg = t?.(key, params)
    if (msg && !String(msg).includes(key.split('.').pop())) return msg
    return fallback
  }

  const technique = String(input.technique || '').toLowerCase().trim()
  const focusWord = String(input.focusWordText || '').trim()
  if (focusWord && (input.isPlaying || input.isPaused)) {
    return pick(
      'memorisation.postSession.coach.live.focusWord',
      `Focus on the highlighted word: ${focusWord}`,
      { word: focusWord },
    )
  }

  if (input.readyToTest) {
    return pick(
      'memorisation.postSession.coach.live.ready',
      'Mā shā’ Allāh. You are ready to test.',
    )
  }
  if (input.isCompleted) {
    return pick(
      'memorisation.postSession.coach.live.after',
      'Recite this āyah without looking.',
    )
  }
  if (input.difficulty && Number(input.suggestedSpeed) > 0) {
    return pick(
      'memorisation.postSession.coach.live.difficulty',
      `Take it slower — try this āyah at ${input.suggestedSpeed}×.`,
      { speed: input.suggestedSpeed },
    )
  }

  if (input.isPaused) {
    if (String(input.technique || '').toLowerCase() === 'talqin') {
      return pick(
        'memorisation.postSession.coach.live.talqin.pause',
        'Now repeat this phrase aloud.',
      )
    }
    return pickTechniqueGuidance(technique, 'pause', pick, input)
  }
  if (input.isPlaying) {
    return pickTechniqueGuidance(technique, 'playing', pick, input)
  }
  return pick(
    'memorisation.postSession.coach.live.before',
    'Listen once and follow the words.',
  )
}

/**
 * Beginner-facing label + short hint for the active method.
 *
 * @param {string} technique
 * @param {Function|null} t
 * @returns {{ id: string, label: string, hint: string }}
 */
export function resolveLiveTechniqueGuide(technique = '', t = null) {
  const id = String(technique || '').toLowerCase().trim() || 'listen'
  const pick = (key, fallback) => {
    const msg = typeof t === 'function' ? t(key) : null
    if (msg && !String(msg).includes(key.split('.').pop())) return msg
    return fallback
  }

  const guides = {
    talqin: {
      label: pick('memorisation.postSession.coach.live.technique.talqin.label', 'Listen, then recite'),
      hint: pick(
        'memorisation.postSession.coach.live.technique.talqin.hint',
        'The reciter leads. When it pauses, you say it aloud.',
      ),
    },
    focus: {
      label: pick('memorisation.postSession.coach.live.technique.focus.label', 'One āyah at a time'),
      hint: pick(
        'memorisation.postSession.coach.live.technique.focus.hint',
        'Stay with this āyah until it feels steady in your heart.',
      ),
    },
    blur: {
      label: pick('memorisation.postSession.coach.live.technique.blur.label', 'Hide the text little by little'),
      hint: pick(
        'memorisation.postSession.coach.live.technique.blur.hint',
        'As words fade, let your memory lead — ask Allah for firmness.',
      ),
    },
    chaining: {
      label: pick('memorisation.postSession.coach.live.technique.chaining.label', 'Join the āyahs'),
      hint: pick(
        'memorisation.postSession.coach.live.technique.chaining.hint',
        'Connect each āyah to the next as one smooth flow.',
      ),
    },
    anchor: {
      label: pick('memorisation.postSession.coach.live.technique.anchor.label', 'Hold onto key words'),
      hint: pick(
        'memorisation.postSession.coach.live.technique.anchor.hint',
        'Gold-marked words are your hooks — say them clearly, then the full āyah.',
      ),
    },
    listen: {
      label: pick('memorisation.postSession.coach.live.technique.listen.label', 'Listen with presence'),
      hint: pick(
        'memorisation.postSession.coach.live.technique.listen.hint',
        'Follow the words calmly and recite with sincerity.',
      ),
    },
  }

  const guide = guides[id] || guides.listen
  return { id, label: guide.label, hint: guide.hint }
}

/**
 * @param {string} technique
 * @param {'before'|'playing'|'pause'} phase
 * @param {Function} pick
 * @param {object} input
 */
function pickTechniqueGuidance(technique, phase, pick, input = {}) {
  const ayah = Number(input.ayahNumber)
  const ayahPart = Number.isFinite(ayah) && ayah > 0
    ? pick('memorisation.postSession.coach.live.ayahCue', `Āyah ${ayah}`, { ayah })
    : ''

  const keys = {
    talqin: {
      before: ['memorisation.postSession.coach.live.talqin.before', 'Bismillāh. Listen once, then recite aloud.'],
      playing: ['memorisation.postSession.coach.live.talqin.playing', 'Listen carefully. Your turn comes after the audio.'],
      pause: ['memorisation.postSession.coach.live.talqin.pause', 'Your turn — recite this āyah aloud, slowly.'],
    },
    focus: {
      before: ['memorisation.postSession.coach.live.focus.before', 'We stay with one āyah. Do not rush ahead.'],
      playing: ['memorisation.postSession.coach.live.focus.playing', 'Follow this āyah only. Let it settle.'],
      pause: ['memorisation.postSession.coach.live.focus.pause', 'Repeat this same āyah aloud before moving on.'],
    },
    blur: {
      before: ['memorisation.postSession.coach.live.blur.before', 'Words will hide gradually. Trust your memory.'],
      playing: ['memorisation.postSession.coach.live.blur.playing', 'As the text fades, recite from the heart.'],
      pause: ['memorisation.postSession.coach.live.blur.pause', 'Try again from memory. May Allah make it firm.'],
    },
    chaining: {
      before: ['memorisation.postSession.coach.live.chaining.before', 'We will join these āyahs into one flow.'],
      playing: ['memorisation.postSession.coach.live.chaining.playing', 'Listen for how this āyah links to the next.'],
      pause: ['memorisation.postSession.coach.live.chaining.pause', 'Recite what you just heard, then join the next āyah.'],
    },
    anchor: {
      before: ['memorisation.postSession.coach.live.anchor.before', 'Gold words are your hooks — notice them first.'],
      playing: ['memorisation.postSession.coach.live.anchor.playing', 'Watch the marked words. They will help you remember.'],
      pause: ['memorisation.postSession.coach.live.anchor.pause', 'Say the key words first, then the full āyah.'],
    },
  }

  const fallbacks = {
    before: ['memorisation.postSession.coach.live.before', 'Bismillāh. Listen once and follow the words.'],
    playing: ['memorisation.postSession.coach.live.playing', 'Follow the words calmly — may Allah open your heart.'],
    pause: ['memorisation.postSession.coach.live.pause', 'Now recite aloud with presence.'],
  }

  if (input.hasFocusWords && phase !== 'playing') {
    if (phase === 'before') {
      return pick(
        'memorisation.postSession.coach.live.beforeFocus',
        'Listen once — gold-marked words need extra care.',
      )
    }
    if (phase === 'pause') {
      return pick(
        'memorisation.postSession.coach.live.pauseFocus',
        'Repeat the gold-marked words aloud, then the full āyah.',
      )
    }
  }
  if (input.hasFocusWords && phase === 'playing') {
    return pick(
      'memorisation.postSession.coach.live.playingFocus',
      'Gold marks need your care — listen with presence.',
    )
  }

  const row = keys[technique]?.[phase] || fallbacks[phase]
  const line = pick(row[0], row[1])
  if (ayahPart && phase === 'playing') {
    return `${ayahPart} · ${line}`
  }
  return line
}

/**
 * @param {Array<object>} raw
 * @param {{ surahId?: number, ayahNumber?: number }} fallback
 */
export function normaliseWeakWordRecords(raw = [], fallback = {}) {
  if (!Array.isArray(raw)) return []
  const out = []
  const seen = new Set()
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const text = String(item.text || item.word || item.ar || '').trim()
    const wordIndex = Number(item.wordIndex ?? item.index ?? item.ayahWordIndex)
    const ayahNumber = Number(item.ayahNumber ?? item.ayah ?? fallback.ayahNumber)
    const surahId = Number(item.surahId ?? item.surah ?? fallback.surahId)
    if (!Number.isFinite(wordIndex) || wordIndex < 0) continue
    const key = `${surahId || 0}:${ayahNumber || 0}:${wordIndex}`
    if (seen.has(key)) continue
    seen.add(key)
    const reasonRaw = String(item.reason || item.status || 'pronunciation').toLowerCase()
    let reason = 'pronunciation'
    if (reasonRaw.includes('replay') || reasonRaw.includes('frequent')) reason = 'frequent_replay'
    else if (reasonRaw.includes('hesitat') || reasonRaw.includes('partial') || reasonRaw.includes('amber')) {
      reason = 'hesitation'
    } else if (
      reasonRaw.includes('omission')
      || reasonRaw.includes('miss')
      || reasonRaw.includes('incorrect')
      || reasonRaw.includes('red')
      || reasonRaw.includes('black')
    ) {
      reason = 'pronunciation'
    }
    out.push({
      surahId: Number.isFinite(surahId) ? surahId : null,
      ayahNumber: Number.isFinite(ayahNumber) ? ayahNumber : null,
      wordIndex,
      text,
      reason,
      confidence: Number.isFinite(Number(item.confidence)) ? Number(item.confidence) : undefined,
      verseKey: item.verseKey || (
        Number.isFinite(surahId) && Number.isFinite(ayahNumber)
          ? `${surahId}:${ayahNumber}`
          : (item.ayahKey || null)
      ),
    })
    if (out.length >= 12) break
  }
  return out
}

/**
 * @param {string} reason
 * @param {Function|null} t
 */
export function weakWordReasonLabel(reason, t = null) {
  const key = `memorisation.postSession.coach.reason.${reason}`
  const msg = typeof t === 'function' ? t(key) : null
  if (msg && !String(msg).includes('reason.')) return msg
  if (reason === 'frequent_replay') return 'Frequent replay'
  if (reason === 'hesitation') return 'Hesitation'
  return 'Pronunciation'
}
