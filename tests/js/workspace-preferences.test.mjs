import assert from 'node:assert/strict'
import {
  DEFAULT_WORKSPACE_PREFERENCES,
  applyAudioDefaultsToModeState,
  applyWorkspacePreferenceOverlay,
  normaliseWorkspacePreferences,
  patchWorkspacePreferences,
  readWorkspacePreferences,
  resetWorkspacePreferences,
} from '../../resources/js/scripts/settings/workspacePreferences.js'
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  notificationPrefsStorageKey,
  readNotificationPreferences,
  writeNotificationPreferences,
} from '../../resources/js/scripts/settings/notificationPreferences.js'

class MemoryStorage {
  constructor() {
    this.store = new Map()
  }

  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null
  }

  setItem(key, value) {
    this.store.set(key, String(value))
  }

  removeItem(key) {
    this.store.delete(key)
  }
}

const storage = new MemoryStorage()
globalThis.localStorage = storage

{
  const normalised = normaliseWorkspacePreferences({
    quranFont: 'uthmani',
    defaultFontSize: 999,
    defaultReciterId: 'missing.reciter',
    defaultSpeed: 3,
    mushafBorder: 'gold',
    gapBetweenVerses: 'forever',
  })
  assert.equal(normalised.quranFont, 'uthmanic')
  assert.equal(normalised.defaultFontSize, 280)
  assert.equal(normalised.defaultReciterId, 'ar.alafasy')
  assert.equal(normalised.defaultSpeed, 1)
  assert.equal(normalised.mushafBorder, 'classic')
  assert.equal(normalised.gapBetweenVerses, '1x')
}

{
  storage.store.clear()
  storage.setItem('mutqin.uiState', JSON.stringify({
    tab: 'tools',
    quranFont: 'amiri',
    showTools: true,
  }))

  const next = patchWorkspacePreferences({ tajweedEnabled: true }, { userId: '9' })
  assert.equal(next.quranFont, 'amiri')
  assert.equal(next.tajweedEnabled, true)
  assert.ok(next.updatedAt > 0)

  const scoped = JSON.parse(storage.getItem('mutqin.uiState.9'))
  assert.equal(scoped.tab, 'tools')
  assert.equal(scoped.tajweedEnabled, true)
  assert.equal(scoped.showTools, true)
}

{
  storage.store.clear()
  patchWorkspacePreferences({
    defaultReciterId: 'ar.husary',
    defaultSpeed: 0.75,
  }, { userId: '3' })

  const beginner = JSON.parse(storage.getItem('mutqin.mode.beginner.3'))
  assert.equal(beginner.reciterId, 'ar.husary')
  assert.equal(beginner.speed, 0.75)
}

{
  storage.store.clear()
  const overlay = applyWorkspacePreferenceOverlay({
    quranFont: 'lateef',
    prefsAppliedAt: 10,
  }, 'guest')
  assert.equal(overlay.quranFont, 'lateef')

  storage.store.clear()
  patchWorkspacePreferences({ quranFont: 'scheherazade' }, { userId: 'guest' })
  const applied = applyWorkspacePreferenceOverlay({
    quranFont: 'lateef',
    prefsAppliedAt: 1,
  }, 'guest')
  assert.equal(applied.quranFont, 'scheherazade')
}

{
  storage.store.clear()
  patchWorkspacePreferences({
    defaultReciterId: 'ar.minshawi',
    defaultSpeed: 1.25,
  }, { userId: '4' })
  const mode = applyAudioDefaultsToModeState({
    reciterId: 'ar.alafasy',
    speed: 1,
    prefsAppliedAt: 1,
  }, '4')
  assert.equal(mode.reciterId, 'ar.minshawi')
  assert.equal(mode.speed, 1.25)
}

{
  storage.store.clear()
  resetWorkspacePreferences({ userId: '5' })
  const prefs = readWorkspacePreferences('5')
  assert.equal(prefs.quranFont, DEFAULT_WORKSPACE_PREFERENCES.quranFont)
  assert.equal(prefs.tajweedEnabled, DEFAULT_WORKSPACE_PREFERENCES.tajweedEnabled)
}

{
  assert.equal(notificationPrefsStorageKey('11'), 'mutqin.notificationPrefs.11')
  writeNotificationPreferences('11', { practiceReminders: true, sessionComplete: false })
  writeNotificationPreferences('12', { practiceReminders: false, sessionComplete: true })
  assert.deepEqual(readNotificationPreferences('11'), {
    practiceReminders: true,
    sessionComplete: false,
  })
  assert.deepEqual(readNotificationPreferences('12'), DEFAULT_NOTIFICATION_PREFERENCES)
}

console.log('workspace-preferences.test.mjs: ok')
