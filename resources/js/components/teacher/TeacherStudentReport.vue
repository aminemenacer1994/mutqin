<template>
  <Teleport to="body">
    <div v-if="open" class="teacher-report-overlay" role="dialog" aria-modal="true" :aria-label="t('teacher.report_title')" @keydown.esc="$emit('close')">
      <div class="teacher-report">
        <header class="teacher-report__toolbar">
          <div><h2>{{ t('teacher.report_title') }}</h2><p>{{ t('teacher.report_export_hint') }}</p></div>
          <div><button type="button" class="btn btn-primary" :disabled="loading || !!error" @click="printReport"><i class="bi bi-printer" aria-hidden="true"></i> {{ t('teacher.report_print_pdf') }}</button><button ref="closeButton" type="button" class="btn btn-outline-secondary" @click="$emit('close')">{{ t('common.close') }}</button></div>
        </header>
        <div v-if="loading" class="teacher-report__loading" role="status">{{ t('teacher.loading') }}</div>
        <p v-else-if="error" class="alert alert-danger" role="alert">{{ error }}</p>
        <main v-else class="teacher-report__paper">
          <header class="teacher-report__identity">
            <div>
              <p class="teacher-report__eyebrow">Mutqin · {{ mode === 'semester' ? t('teacher.report_semester') : t('teacher.report_parent') }}</p>
              <h1>{{ profile.student.name }}</h1>
              <p class="teacher-report__meta">{{ [profile.student.organisation, profile.student.groups?.map((group) => group.name).join(', ')].filter(Boolean).join(' · ') }}</p>
            </div>
            <dl>
              <div><dt>{{ t('teacher.report_prepared') }}</dt><dd>{{ today }}</dd></div>
              <div v-if="mode === 'semester'"><dt>{{ t('teacher.report_period') }}</dt><dd>{{ shortDate(semesterStart) }} – {{ today }}</dd></div>
            </dl>
          </header>

          <section class="teacher-report__section" :aria-labelledby="reportSummaryId">
            <h2 :id="reportSummaryId">{{ t('teacher.report_progress_summary') }}</h2>
          <div class="teacher-report__metrics">
            <div><i class="bi bi-play-circle" aria-hidden="true"></i><span>{{ t('teacher.sessions_recorded') }}</span><strong>{{ summary.sessions_recorded || 0 }}</strong></div>
            <div><i class="bi bi-soundwave" aria-hidden="true"></i><span>{{ t('teacher.ai_check_average') }}</span><strong>{{ summary.ai_word_match_average == null ? '—' : `${summary.ai_word_match_average}%` }}</strong><small>{{ t('teacher.report_ai_note') }}</small></div>
            <div><i class="bi bi-check2-circle" aria-hidden="true"></i><span>{{ t('teacher.scored_checks') }}</span><strong>{{ summary.scored_checks || 0 }}</strong></div>
            <div><i class="bi bi-journal-check" aria-hidden="true"></i><span>{{ t('teacher.report_tasks') }}</span><strong>{{ summary.tasks_assigned || 0 }}</strong></div>
          </div>
          </section>

          <section class="teacher-report__section teacher-report__attendance">
            <div class="teacher-report__section-heading"><h2>{{ t('teacher.attendance_summary') }}</h2><span>{{ attendanceTotal }} {{ t('teacher.attendance_marks') }}</span></div>
            <div class="teacher-report__attendance-grid">
              <div v-for="status in attendanceStatuses" :key="status.key" :class="`is-${status.key}`"><i :class="status.icon" aria-hidden="true"></i><span>{{ status.label }}</span><strong>{{ status.count }}</strong></div>
            </div>
          </section>

          <p class="teacher-report__scope"><i class="bi bi-info-circle" aria-hidden="true"></i><span>{{ t('teacher.report_scope') }}</span></p>

          <section class="teacher-report__section">
            <h2>{{ t('teacher.report_recent_checks') }}</h2>
            <div class="teacher-report__table-wrap"><table><thead><tr><th>{{ t('teacher.date') }}</th><th>{{ t('teacher.ayah_range') }}</th><th>{{ t('teacher.ai_word_match') }}</th></tr></thead>
              <tbody><tr v-for="attempt in reportAttempts" :key="attempt.id"><td>{{ shortDate(attempt.created_at) }}</td><td>{{ attempt.range?.surah_name }} {{ attempt.range?.from }}–{{ attempt.range?.to }}</td><td><strong class="teacher-report__score">{{ attempt.accuracy_percent == null ? '—' : `${attempt.accuracy_percent}%` }}</strong></td></tr><tr v-if="!reportAttempts.length"><td colspan="3" class="teacher-report__empty">{{ t('teacher.report_no_checks') }}</td></tr></tbody>
            </table></div>
          </section>

          <section class="teacher-report__section">
            <h2>{{ t('teacher.report_tasks') }}</h2>
            <div class="teacher-report__table-wrap"><table><thead><tr><th>{{ t('teacher.ayah_range') }}</th><th>{{ t('teacher.kind') }}</th><th>{{ t('teacher.status') }}</th><th>{{ t('teacher.date') }}</th></tr></thead>
              <tbody><tr v-for="task in reportTasks" :key="task.id"><td>{{ task.assignment?.surah_name }} {{ task.assignment?.ayah_start }}–{{ task.assignment?.ayah_end }}</td><td>{{ task.assignment?.kind === 'ai_recite' ? t('teacher.kind_ai') : t('teacher.kind_practice') }}</td><td><span class="teacher-report__status">{{ t(`teacher.status_${task.status}`) }}</span></td><td>{{ shortDate(task.assignment?.due_at) }}</td></tr><tr v-if="!reportTasks.length"><td colspan="4" class="teacher-report__empty">{{ t('teacher.report_no_tasks') }}</td></tr></tbody>
            </table></div>
          </section>
          <footer><span>{{ t('teacher.report_teacher_signature') }}</span><strong aria-hidden="true"></strong></footer>
        </main>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'

export default {
  name: 'TeacherStudentReport',
  mixins: [i18nMixin],
  props: { open: { type: Boolean, default: false }, mode: { type: String, default: 'parent' }, profile: { type: Object, required: true } },
  emits: ['close'],
  data() {
    return { loading: false, error: '', ai: {}, tasks: {}, summary: {}, requestId: 0, reportSummaryId: `teacher-report-summary-${Math.random().toString(36).slice(2, 9)}` }
  },
  computed: {
    today() { return new Date().toLocaleDateString() },
    semesterStart() {
      const today = new Date()
      const month = today.getMonth()
      return new Date(today.getFullYear() - (month < 2 ? 1 : 0), month >= 8 || month < 2 ? 8 : 2, 1)
    },
    reportAttempts() { return (this.ai.attempts || []).filter((row) => this.mode !== 'semester' || new Date(row.created_at) >= this.semesterStart).slice(0, this.mode === 'semester' ? 30 : 8) },
    reportTasks() { return (this.tasks.assignments || []).filter((row) => this.mode !== 'semester' || new Date(row.assignment?.created_at) >= this.semesterStart).slice(0, this.mode === 'semester' ? 30 : 8) },
    requestKey() { return `${this.open}:${this.mode}:${this.profile.student.id}` },
    attendanceStatuses() {
      return [
        { key: 'present', icon: 'bi bi-check-lg', label: this.t('teacher.attendance_present'), count: Number(this.summary.attendance?.present || 0) },
        { key: 'late', icon: 'bi bi-clock', label: this.t('teacher.attendance_late'), count: Number(this.summary.attendance?.late || 0) },
        { key: 'absent', icon: 'bi bi-x-lg', label: this.t('teacher.attendance_absent'), count: Number(this.summary.attendance?.absent || 0) },
        { key: 'excused', icon: 'bi bi-shield-check', label: this.t('teacher.attendance_excused'), count: Number(this.summary.attendance?.excused || 0) },
      ]
    },
    attendanceTotal() { return this.attendanceStatuses.reduce((total, status) => total + status.count, 0) },
  },
  watch: { requestKey() { if (this.open) { this.load(); this.$nextTick(() => this.$refs.closeButton?.focus()) } } },
  methods: {
    shortDate(value) { return value ? new Date(value).toLocaleDateString() : '—' },
    async load() {
      const requestId = ++this.requestId
      this.loading = true; this.error = ''
      try {
        const id = this.profile.student.id
        const params = this.mode === 'semester' ? { from: this.dateKey(this.semesterStart), to: this.dateKey(new Date()) } : {}
        const [ai, tasks, summary] = await Promise.all([
          ...['ai', 'tasks'].map((section) => learningApi.getTeacherStudent(id, section)),
          learningApi.getTeacherStudentReport(id, params),
        ])
        if (requestId !== this.requestId) return
        this.ai = ai.payload || {}; this.tasks = tasks.payload || {}; this.summary = summary || {}
      } catch (error) { if (requestId === this.requestId) this.error = error?.response?.data?.message || this.t('teacher.action_failed') }
      finally { if (requestId === this.requestId) this.loading = false }
    },
    printReport() { window.print() },
    dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` },
  },
}
</script>
