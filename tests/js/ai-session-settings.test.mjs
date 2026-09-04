import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  DEFAULT_AI_SESSION_SETTINGS,
  aiSessionSettingsStorageKey,
  migrateLegacyAmdPrefsIntoAiSessionSettings,
  normaliseAiSessionSettings,
  readLocalAiSessionSettings,
  resolveAiSessionSettings,
  shouldApplyAmdHidePercentImmediately,
  writeLocalAiSessionSettings,
} from '../../resources/js/scripts/session/aiSessionSettings.js'
import {
  AMD_DIFFICULTY_PREF_KEY,
} from '../../resources/js/scripts/memorisationDetection/hiddenWords.js'
import {
  AMD_MISTAKE_SOUND_PREF_KEY,
} from '../../resources/js/scripts/memorisationDetection/mistakeFeedback.js'

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

// Defaults and invalid value normalisation
{
  assert.deepEqual(normaliseAiSessionSettings(null), {
    ai_recite: {
      recall_mode_enabled: false,
      strict_progression: false,
      persist_mistakes: false,
    },
    amd: {
      hide_percent: 100,
      mistake_sound_enabled: true,
    },
  })

  const normalised = normaliseAiSessionSettings({
    ai_recite: {
      recall_mode_enabled: '1',
      strict_progression: 'off',
      persist_mistakes: 'true',
    },
    amd: {
      hide_percent: 999,
      mistake_sound_enabled: '0',
    },
  })
  assert.equal(normalised.ai_recite.recall_mode_enabled, true)
  assert.equal(normalised.ai_recite.strict_progression, false)
  assert.equal(normalised.ai_recite.persist_mistakes, true)
  assert.equal(normalised.amd.hide_percent, 100)
  assert.equal(normalised.amd.mistake_sound_enabled, false)
}

// User-scoped local keys prevent cross-user reads
{
  const storage = new MemoryStorage()
  writeLocalAiSessionSettings('7', {
    amd: { hide_percent: 25, mistake_sound_enabled: false },
  }, storage)
  writeLocalAiSessionSettings('8', {
    amd: { hide_percent: 75, mistake_sound_enabled: true },
  }, storage)

  assert.equal(aiSessionSettingsStorageKey('7'), 'mutqin.aiSessionSettings.7')
  assert.equal(readLocalAiSessionSettings('7', storage)?.amd.hide_percent, 25)
  assert.equal(readLocalAiSessionSettings('8', storage)?.amd.hide_percent, 75)
  assert.equal(readLocalAiSessionSettings('guest', storage), null)
}

// Legacy AMD key migration into scoped store
{
  const storage = new MemoryStorage()
  storage.setItem(AMD_DIFFICULTY_PREF_KEY, '50')
  storage.setItem(AMD_MISTAKE_SOUND_PREF_KEY, '0')

  const { migrated, settings } = migrateLegacyAmdPrefsIntoAiSessionSettings('42', storage)
  assert.equal(migrated, true)
  assert.equal(settings.amd.hide_percent, 50)
  assert.equal(settings.amd.mistake_sound_enabled, false)
  assert.equal(storage.getItem(AMD_DIFFICULTY_PREF_KEY), null)
  assert.equal(storage.getItem(AMD_MISTAKE_SOUND_PREF_KEY), null)
  assert.equal(readLocalAiSessionSettings('42', storage)?.amd.hide_percent, 50)
}

// Bootstrap wins over local cache when authenticated
{
  const storage = new MemoryStorage()
  writeLocalAiSessionSettings('9', {
    amd: { hide_percent: 10, mistake_sound_enabled: true },
  }, storage)

  const resolved = resolveAiSessionSettings({
    userId: '9',
    bootstrap: {
      amd: { hide_percent: 75, mistake_sound_enabled: false },
    },
    storage,
  })
  assert.equal(resolved.amd.hide_percent, 75)
  assert.equal(resolved.amd.mistake_sound_enabled, false)
}

// Mid-session hide% deferred apply helper
{
  assert.equal(shouldApplyAmdHidePercentImmediately('listening', true), false)
  assert.equal(shouldApplyAmdHidePercentImmediately('starting', true), false)
  assert.equal(shouldApplyAmdHidePercentImmediately('processing', true), false)
  assert.equal(shouldApplyAmdHidePercentImmediately('ready', true), true)
  assert.equal(shouldApplyAmdHidePercentImmediately('listening', false), true)
}

// Workspace wiring uses persisted AI session settings
{
  const js = readFileSync(new URL('../../resources/js/views/Memorisation.js', import.meta.url), 'utf8')
  assert.match(js, /hydrateAiSessionSettings\(/)
  assert.match(js, /persistAiSessionSettingsPatch\(/)
  assert.match(js, /shouldApplyAmdHidePercentImmediately\(/)
  assert.match(js, /amdPendingHidePercent/)
  assert.doesNotMatch(js, /readStoredDifficultyPercent\(\)/)
  assert.doesNotMatch(js, /storeDifficultyPercent\(/)
  assert.doesNotMatch(js, /persistAiRecallModeToServer/)
}

assert.deepEqual(DEFAULT_AI_SESSION_SETTINGS.amd.hide_percent, 100)
