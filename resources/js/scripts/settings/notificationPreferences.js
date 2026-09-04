/**
 * Device-local notification preferences. Mutqin does not send email
 * campaigns; these stay on this browser and owner.
 */

import { userScopedMutqinKey, readLocalJson, writeLocalJson } from '../../utils/mutqinStorageKeys.js'

export const NOTIFICATION_PREFS_SUFFIX = 'notificationPrefs'

export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  practiceReminders: false,
  sessionComplete: true,
})

function resolveOwnerId(userId) {
  if (userId != null && String(userId).trim() !== '') return String(userId)
  if (typeof window !== 'undefined' && window.mutqinUserId != null) {
    return String(window.mutqinUserId)
  }
  return 'guest'
}

export function notificationPrefsStorageKey(userId = 'guest') {
  return userScopedMutqinKey(NOTIFICATION_PREFS_SUFFIX, resolveOwnerId(userId))
}

function toBool(value, fallback) {
  if (value === true || value === 1 || value === '1' || value === 'true') return true
  if (value === false || value === 0 || value === '0' || value === 'false') return false
  return fallback
}

export function normaliseNotificationPreferences(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  return {
    practiceReminders: toBool(src.practiceReminders, DEFAULT_NOTIFICATION_PREFERENCES.practiceReminders),
    sessionComplete: toBool(src.sessionComplete, DEFAULT_NOTIFICATION_PREFERENCES.sessionComplete),
  }
}

export function readNotificationPreferences(userId = null) {
  const key = notificationPrefsStorageKey(userId)
  return normaliseNotificationPreferences(readLocalJson(key, DEFAULT_NOTIFICATION_PREFERENCES))
}

export function writeNotificationPreferences(userId, prefs) {
  const next = normaliseNotificationPreferences(prefs)
  writeLocalJson(notificationPrefsStorageKey(userId), next)
  return next
}

export function notificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

/**
 * @param {boolean} enabled
 * @param {string|number|null|undefined} userId
 */
export async function setPracticeRemindersEnabled(enabled, userId = null) {
  const current = readNotificationPreferences(userId)
  if (!enabled) {
    return writeNotificationPreferences(userId, { ...current, practiceReminders: false })
  }

  if (typeof Notification === 'undefined') {
    return writeNotificationPreferences(userId, { ...current, practiceReminders: false })
  }

  let permission = Notification.permission
  if (permission === 'default') {
    try {
      permission = await Notification.requestPermission()
    } catch {
      permission = Notification.permission
    }
  }

  return writeNotificationPreferences(userId, {
    ...current,
    practiceReminders: permission === 'granted',
  })
}
