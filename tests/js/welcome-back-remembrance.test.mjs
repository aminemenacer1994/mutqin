import test from 'node:test'
import assert from 'node:assert/strict'
import {
  WELCOME_BACK_REMEMBRANCE_COUNT,
  buildWelcomeBackRemembrance,
} from '../../resources/js/utils/emotionalTouches.js'

test('welcome-back remembrance rotates by calendar day', () => {
  const dayA = buildWelcomeBackRemembrance({
    mode: 'fresh',
    now: Date.parse('2026-07-29T10:00:00Z'),
    userId: 7,
  })
  const sameDay = buildWelcomeBackRemembrance({
    mode: 'fresh',
    now: Date.parse('2026-07-29T22:00:00Z'),
    userId: 7,
  })
  const dayB = buildWelcomeBackRemembrance({
    mode: 'fresh',
    now: Date.parse('2026-07-30T10:00:00Z'),
    userId: 7,
  })

  assert.equal(dayA.translation, sameDay.translation)
  assert.equal(dayA.source, sameDay.source)
  assert.notEqual(dayA.translation + dayA.source, dayB.translation + dayB.source)
  assert.ok(dayA.index >= 1 && dayA.index <= WELCOME_BACK_REMEMBRANCE_COUNT)
})

test('welcome-back remembrance uses i18n when available', () => {
  const t = (key) => {
    if (key.endsWith('.translation')) return 'Translated verse'
    if (key.endsWith('.source')) return "Qur'an test"
    if (key.endsWith('.intention')) return 'Translated intention'
    return key
  }
  const item = buildWelcomeBackRemembrance({ mode: 'resume', now: Date.parse('2026-07-29T10:00:00Z'), t })
  assert.equal(item.translation, 'Translated verse')
  assert.equal(item.source, "Qur'an test")
  assert.equal(item.intention, 'Translated intention')
})
