/**
 * Redacted Speechmatics session captures for recitation scoring.
 *
 * These are AddTranscript-shaped payloads (no audio, no user ids).
 * Seeded cases follow live Speechmatics shape (results[].alternatives)
 * with agreed expected accuracy. Replace or append with real staging
 * dumps using the schema below — never commit emails, tokens, or audio.
 *
 * How to add a real dump:
 * 1. Recite on staging, copy the final AddTranscript JSON (words only).
 * 2. Strip user/session ids, websocket tokens, and any audio URLs.
 * 3. Push an object onto recitationCapturedSessions with:
 *    id, label, notes, targetText, speechmaticsMessage, expectedAccuracy
 * 4. Run: node --experimental-vm-modules tests/js/recitation-captured-sessions.test.mjs
 *    then: npm run audit:recitation-scenarios
 */

function addTranscript(tokens) {
  return {
    message: 'AddTranscript',
    format: '2.9',
    results: tokens.map((token) => ({
      type: 'word',
      start_time: token.start,
      end_time: token.end,
      alternatives: [{
        content: token.word,
        confidence: token.confidence,
        language: 'ar',
        speaker: token.speaker || 'S1',
      }],
    })),
  }
}

export const recitationCapturedSessions = Object.freeze([
  {
    id: 'capture_fatiha_quiet_desktop',
    label: 'Quiet desktop mic — Al-Fatiha 1:2 fragment',
    notes: 'Redacted Speechmatics finals; confidence varies like a live session (0.88–0.99).',
    environment: { room: 'quiet', device: 'desktop-chrome', mic: 'built-in' },
    targetText: 'الحمد لله رب العالمين',
    speechmaticsMessage: addTranscript([
      { word: 'الحمد', confidence: 0.99, start: 0.12, end: 0.41 },
      { word: 'لله', confidence: 0.96, start: 0.44, end: 0.68 },
      { word: 'رب', confidence: 0.94, start: 0.71, end: 0.88 },
      { word: 'العالمين', confidence: 0.88, start: 0.92, end: 1.41 },
    ]),
    expectedAccuracy: 100,
    expectedResultState: 'strong',
  },
  {
    id: 'capture_substitution_phone',
    label: 'Phone mic — substitution العالمين → الرحمن',
    notes: 'Wrong closing word at mid-high confidence; must not score as strong.',
    environment: { room: 'quiet', device: 'android-chrome', mic: 'handset' },
    targetText: 'الحمد لله رب العالمين',
    speechmaticsMessage: addTranscript([
      { word: 'الحمد', confidence: 0.97, start: 0.08, end: 0.36 },
      { word: 'لله', confidence: 0.93, start: 0.39, end: 0.61 },
      { word: 'رب', confidence: 0.91, start: 0.64, end: 0.81 },
      { word: 'الرحمن', confidence: 0.86, start: 0.85, end: 1.28 },
    ]),
    expectedAccuracy: 80,
    expectedResultState: 'developing',
  },
  {
    id: 'capture_glued_basmala_amd',
    label: 'AMD live — Speechmatics glued بسمالله',
    notes: 'Vendor often emits one token for the opening pair.',
    environment: { room: 'quiet', device: 'iphone-safari', mic: 'handset' },
    targetText: 'بسم الله الرحمن الرحيم',
    speechmaticsMessage: addTranscript([
      { word: 'بسمالله', confidence: 0.91, start: 0.1, end: 0.55 },
      { word: 'الرحمن', confidence: 0.89, start: 0.58, end: 0.94 },
      { word: 'الرحيم', confidence: 0.87, start: 0.97, end: 1.36 },
    ]),
    expectedAccuracy: 100,
    expectedResultState: 'strong',
  },
  {
    id: 'capture_noisy_insertion',
    label: 'Noisy room — extra العظيم then recover',
    notes: 'Background speech leaked one extra token; alignment should keep the ayah green.',
    environment: { room: 'noisy', device: 'desktop-chrome', mic: 'built-in' },
    targetText: 'الحمد لله رب العالمين',
    speechmaticsMessage: addTranscript([
      { word: 'الحمد', confidence: 0.92, start: 0.1, end: 0.38 },
      { word: 'لله', confidence: 0.9, start: 0.41, end: 0.63 },
      { word: 'العظيم', confidence: 0.71, start: 0.66, end: 0.92 },
      { word: 'رب', confidence: 0.88, start: 0.96, end: 1.12 },
      { word: 'العالمين', confidence: 0.84, start: 1.16, end: 1.62 },
    ]),
    expectedAccuracy: 93,
    expectedResultState: 'strong',
  },
  {
    id: 'capture_ikhlas_clear_error',
    label: 'Quiet room — صمد for أحد',
    notes: 'Clear lexical miss; developing band, not insufficient_audio.',
    environment: { room: 'quiet', device: 'desktop-safari', mic: 'built-in' },
    targetText: 'قل هو الله أحد',
    speechmaticsMessage: addTranscript([
      { word: 'قل', confidence: 0.95, start: 0.1, end: 0.28 },
      { word: 'هو', confidence: 0.94, start: 0.31, end: 0.48 },
      { word: 'الله', confidence: 0.97, start: 0.51, end: 0.82 },
      { word: 'صمد', confidence: 0.9, start: 0.85, end: 1.18 },
    ]),
    expectedAccuracy: 75,
    expectedResultState: 'developing',
  },
])
