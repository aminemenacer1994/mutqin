/** Prevents assistant TTS from overlapping Qur'an playback or assessments. */
export const AUDIO_SLOTS = Object.freeze({
  QURAN_PLAYBACK: 'quran_playback',
  ASSESSMENT: 'assessment',
  ASSISTANT_TTS: 'assistant_tts',
  ASSISTANT_MIC: 'assistant_mic',
})

const active = new Set()

export function acquireAudioSlot(slot) {
  const key = String(slot || '')
  if (!key) return false
  if (active.has(AUDIO_SLOTS.ASSESSMENT) && key === AUDIO_SLOTS.ASSISTANT_TTS) {
    return false
  }
  if (active.has(AUDIO_SLOTS.QURAN_PLAYBACK) && key === AUDIO_SLOTS.ASSISTANT_TTS) {
    return false
  }
  active.add(key)
  return true
}

export function releaseAudioSlot(slot) {
  active.delete(String(slot || ''))
}

export function isAssessmentActive() {
  return active.has(AUDIO_SLOTS.ASSESSMENT)
}

export function setAssessmentActive(value) {
  if (value) active.add(AUDIO_SLOTS.ASSESSMENT)
  else active.delete(AUDIO_SLOTS.ASSESSMENT)
}

export function setQuranPlaybackActive(value) {
  if (value) active.add(AUDIO_SLOTS.QURAN_PLAYBACK)
  else active.delete(AUDIO_SLOTS.QURAN_PLAYBACK)
}