/** Hifz examination settings stored on assignment session_settings.examination */

export const EXAMINATION_POOL_TYPES = ['surah', 'juz', 'hizb', 'custom']
export const EXAMINATION_GENERATION_MODES = ['random', 'manual', 'weak_ayah']
export const EXAMINATION_MODES = ['continue_recitation', 'previous_ayah', 'mushaf_hide', 'mixed']
export const EXAMINATION_DELIVERY = ['live', 'async']

export function defaultExaminationSettings() {
  return {
    enabled: true,
    pool_type: 'custom',
    pool: {},
    generation_mode: 'random',
    question_count: 5,
    recitation_length_ayahs: 3,
    repetitions: 1,
    exam_modes: ['continue_recitation'],
    permitted_prompts: ['repeat', 'start_ayah'],
    delivery: 'async',
    ai_wording_assessment: false,
    manual_questions: [],
    disclaimer_acknowledged: true,
  }
}

export function assignmentSupportsExamination(form) {
  return form?.activity === 'examination' || form?.task_type === 'hifz_examination'
}

export function mergeExaminationSettings(form) {
  const base = defaultExaminationSettings()
  const session = form?.session_settings && typeof form.session_settings === 'object' ? form.session_settings : {}
  const exam = session.examination && typeof session.examination === 'object' ? session.examination : {}
  return { ...base, ...exam, enabled: true }
}