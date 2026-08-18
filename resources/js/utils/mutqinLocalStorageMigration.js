import {
  MUTQIN_SCHEMA_VERSION_KEY,
  MODE_STORAGE_KEYS,
  mutqinStorageKey,
} from './mutqinStorageKeys'
import {
  createBeginnerState,
  createAdvancedState,
} from '../scripts/memorisationRuntime'

/**
 * Legacy v1 → v2 shape migration for workspace UI state (browser-only).
 * @param {{ cloneModeState: (state: object) => object }} helpers
 */
export function migrateLegacyWorkspaceLocalStorage(helpers) {
  if (typeof localStorage === 'undefined') return

  const schemaKey = MUTQIN_SCHEMA_VERSION_KEY
  const legacySchemaKey = mutqinStorageKey(schemaKey).replace(/^mutqin\./, 'telawa.')

  if (!localStorage.getItem(schemaKey) && localStorage.getItem(legacySchemaKey)) {
    localStorage.setItem(schemaKey, localStorage.getItem(legacySchemaKey))
    localStorage.removeItem(legacySchemaKey)
  }

  if (!localStorage.getItem(schemaKey)) {
    localStorage.setItem(schemaKey, '2')
  }

  if (localStorage.getItem(schemaKey) !== '1') return

  try {
    const uiStateKey = mutqinStorageKey('mutqin.uiState')
    const legacyUiStateKey = 'telawa.uiState'
    const raw = localStorage.getItem(uiStateKey) || localStorage.getItem(legacyUiStateKey)
    if (!raw) return

    const state = JSON.parse(raw)
    if (state.beginner && !localStorage.getItem(MODE_STORAGE_KEYS.beginner)) {
      localStorage.setItem(
        MODE_STORAGE_KEYS.beginner,
        JSON.stringify(helpers.cloneModeState({
          ...createBeginnerState(),
          ...state.beginner,
        }))
      )
    }
    if (state.advanced && !localStorage.getItem(MODE_STORAGE_KEYS.advanced)) {
      localStorage.setItem(
        MODE_STORAGE_KEYS.advanced,
        JSON.stringify(helpers.cloneModeState({
          ...createAdvancedState(),
          ...state.advanced,
        }))
      )
    }
    localStorage.setItem(schemaKey, '2')
  } catch (error) {
    console.error(error)
  }
}
