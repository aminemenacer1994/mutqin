import { acquireAudioSlot, releaseAudioSlot, AUDIO_SLOTS } from './audioCoordinator.js'

let currentUtterance = null

export function speakMrMutqin(text, { lang, onEnd } = {}) {
  const value = String(text || '').trim()
  if (!value || typeof window === 'undefined' || !window.speechSynthesis) {
    onEnd?.()
    return false
  }

  stopMrMutqinSpeech()
  if (!acquireAudioSlot(AUDIO_SLOTS.ASSISTANT_TTS)) {
    onEnd?.()
    return false
  }

  const utterance = new SpeechSynthesisUtterance(value)
  utterance.lang = lang || document.documentElement.lang || 'en'
  utterance.onend = () => {
    releaseAudioSlot(AUDIO_SLOTS.ASSISTANT_TTS)
    currentUtterance = null
    onEnd?.()
  }
  utterance.onerror = () => {
    releaseAudioSlot(AUDIO_SLOTS.ASSISTANT_TTS)
    currentUtterance = null
    onEnd?.()
  }
  currentUtterance = utterance
  window.speechSynthesis.speak(utterance)
  return true
}

export function stopMrMutqinSpeech() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
  if (currentUtterance) {
    releaseAudioSlot(AUDIO_SLOTS.ASSISTANT_TTS)
    currentUtterance = null
  }
}