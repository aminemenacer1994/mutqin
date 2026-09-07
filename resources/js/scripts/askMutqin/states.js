/** Single Ask Mutqin session state. Avoid scattered booleans. */
export const ASK_MUTQIN_STATES = Object.freeze({
  INTRO: 'intro',
  RECITING: 'reciting',
  MATCHING: 'matching',
  FOUND: 'found',
  LISTENING_COMMAND: 'listening_command',
  INTERPRETING: 'interpreting',
  READY: 'ready',
  OPENING: 'opening',
  AMBIGUOUS: 'ambiguous',
  ERROR: 'error',
})

/** States where the microphone / live listen session is active. */
export const ASK_MUTQIN_RECORDING_STATES = Object.freeze([
  ASK_MUTQIN_STATES.RECITING,
  ASK_MUTQIN_STATES.MATCHING,
  ASK_MUTQIN_STATES.AMBIGUOUS,
])

export function isAskMutqinRecordingState(state) {
  return ASK_MUTQIN_RECORDING_STATES.includes(String(state || ''))
}

export function normalizeAskMutqinState(value, fallback = ASK_MUTQIN_STATES.INTRO) {
  const next = String(value || '').trim()
  return Object.values(ASK_MUTQIN_STATES).includes(next) ? next : fallback
}
