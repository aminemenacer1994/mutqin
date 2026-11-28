export function buildMrMutqinContext({
  role = 'student',
  shell = 'dashboard',
  view = null,
  surah = null,
  ayahStart = null,
  ayahEnd = null,
  playbackActive = false,
  assessmentActive = false,
  studentId = null,
} = {}) {
  return {
    role,
    shell,
    view,
    pane: view,
    student_id: studentId,
    surah,
    ayah_start: ayahStart,
    ayah_end: ayahEnd,
    playback_active: playbackActive,
    assessment_active: assessmentActive,
  }
}