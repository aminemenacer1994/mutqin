import { DIFFICULTY_PERCENTS } from '../memorisationDetection/hiddenWords.js'

export const PROGRESSIVE_HIDING_VISIBILITY_OPTIONS = Object.freeze([...DIFFICULTY_PERCENTS])

/** @returns {import('./assignmentListeningSettings').AssignmentSessionSettings & { progressive_hiding: ProgressiveHidingSettings }} */
export function defaultProgressiveHidingSettings() {
  return {
    enabled: false,
    blur_intensity: 10,
    hints_allowed: true,
    stage_repetitions: 3,
    starting_visibility_percent: 100,
    final_hidden_recitation: false,
    final_ai_assessment: false,
  }
}

/**
 * @typedef {ReturnType<typeof defaultProgressiveHidingSettings>} ProgressiveHidingSettings
 */

export function assignmentSupportsProgressiveHiding(form = {}) {
  const taskType = String(form.task_type || form.activity || '')
  if (form.kind === 'ai_recite' || form.recording_required) return false
  return ['hifz', 'new_memorisation', 'revision', 'nazra', 'hifz_examination'].includes(taskType)
}

export function sanitizeTeacherProgressiveHidingSettings(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (raw.enabled === false || raw.enabled === 'false' || raw.enabled === 0) {
    return null
  }
  const enabled = raw.enabled === true || raw.enabled === 'true' || raw.enabled === 1
  if (!enabled) return null

  const clean = { enabled: true }
  const intensity = Number(raw.blur_intensity)
  if (Number.isFinite(intensity)) {
    clean.blur_intensity = Math.max(4, Math.min(18, Math.round(intensity)))
  } else {
    clean.blur_intensity = 10
  }
  clean.hints_allowed = raw.hints_allowed !== false && raw.hints_allowed !== 'false' && raw.hints_allowed !== 0

  const stageReps = Number(raw.stage_repetitions)
  if (Number.isFinite(stageReps)) {
    clean.stage_repetitions = Math.max(1, Math.min(8, Math.round(stageReps)))
  } else {
    clean.stage_repetitions = 3
  }

  const visibility = Number(raw.starting_visibility_percent)
  clean.starting_visibility_percent = PROGRESSIVE_HIDING_VISIBILITY_OPTIONS.includes(visibility)
    ? visibility
    : 100

  clean.final_hidden_recitation = raw.final_hidden_recitation === true || raw.final_hidden_recitation === 'true'
  clean.final_ai_assessment = raw.final_ai_assessment === true || raw.final_ai_assessment === 'true'

  return clean
}

export function progressiveHidingFromSessionSettings(settings) {
  const defaults = defaultProgressiveHidingSettings()
  const raw = settings?.progressive_hiding
  if (!raw || typeof raw !== 'object') return { ...defaults }
  return {
    ...defaults,
    ...raw,
    enabled: Boolean(raw.enabled),
  }
}

export function validateProgressiveHidingCompatibility(sessionSettings = {}) {
  const hiding = sanitizeTeacherProgressiveHidingSettings(sessionSettings.progressive_hiding)
  if (!hiding) return { ok: true, hiding: null, session_settings: sessionSettings }

  const technique = String(sessionSettings.technique || '').toLowerCase()
  const next = { ...sessionSettings, progressive_hiding: hiding, technique: 'blur' }
  if (technique === 'focus') {
    return {
      ok: false,
      messageKey: 'teacher.assignment_hiding_incompatible_focus',
    }
  }
  if (sessionSettings.repetitions_per_ayah && Object.keys(sessionSettings.repetitions_per_ayah).length) {
    return {
      ok: false,
      messageKey: 'teacher.assignment_hiding_incompatible_per_ayah',
    }
  }
  return { ok: true, hiding, session_settings: next }
}

export function buildTeacherHidingPreviewHref(memorisationBase, form, settings) {
  const hiding = sanitizeTeacherProgressiveHidingSettings(settings)
  if (!hiding || !assignmentSupportsProgressiveHiding(form)) return null
  const base = String(memorisationBase || '/memorisation').replace(/\?.*$/, '')
  try {
    const url = new URL(base, typeof window !== 'undefined' ? window.location.origin : 'https://mutqin.test')
    url.searchParams.set('setup', '1')
    url.searchParams.set('technique', 'blur')
    url.searchParams.set('surah', String(form.surah_number || 1))
    url.searchParams.set('from', String(form.ayah_start || 1))
    url.searchParams.set('to', String(form.ayah_end || form.ayah_start || 1))
    url.searchParams.set('blur_intensity', String(hiding.blur_intensity))
    return `${url.pathname}${url.search}`
  } catch {
    return `${base}?setup=1&technique=blur`
  }
}

export function mergeProgressiveHidingIntoSessionSettings(sessionSettings) {
  const settings = sessionSettings && typeof sessionSettings === 'object'
    ? { ...sessionSettings }
    : {}
  const compatibility = validateProgressiveHidingCompatibility(settings)
  if (!compatibility.ok) return compatibility
  if (!compatibility.hiding) {
    delete settings.progressive_hiding
    return { ok: true, session_settings: settings }
  }
  return { ok: true, session_settings: compatibility.session_settings }
}