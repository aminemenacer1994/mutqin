<template>
  <TeacherSectionPane tone="neutral" flat>
    <TeacherTabGuide kind="page" :title="t('teacher.nav_assignments')" :description="t('teacher.tasks_page_desc')" />
    <section class="teacher-review-block">
    <TeacherTabGuide kind="section" step="1" :title="t('teacher.tasks_list_title')" :description="t('teacher.tasks_list_desc')" />
    <div v-if="taskRows.length" class="teacher-context-stats teacher-context-stats--interactive" :aria-label="t('teacher.task_summary')">
      <button v-for="filter in filters" :key="filter.id" type="button" :class="[`is-${filter.id}`, { 'is-active': activeFilter === filter.id }]" :aria-pressed="activeFilter === filter.id ? 'true' : 'false'" @click="activeFilter = filter.id"><strong>{{ filter.count }}</strong> {{ filter.label }}</button>
    </div>
    <TeacherRecordList v-if="visibleRows.length" selectable :selected-key="selectedTaskKey" :rows="visibleRows" @select="chooseTask" />
    <p v-else-if="taskRows.length" class="teacher-task-filter-empty">{{ t('teacher.no_tasks_in_filter') }}</p>
    <TeacherEmpty v-else icon="bi bi-clipboard-check" :message="t('teacher.assignments_empty')" />
    </section>

    <section class="teacher-review-block">
    <TeacherTabGuide
      kind="section"
      step="2"
      :title="t('teacher.tasks_feedback_title')"
      :description="selectedPassageLabel ? t('teacher.tasks_feedback_for', { passage: selectedPassageLabel }) : t('teacher.tasks_feedback_desc')"
    />
    <TeacherAudioFeedbackComposer
      class="mt-3"
      :student-id="profile.student.id"
      :recipient-id="selectedRecipientId"
      :assignment-id="selectedAssignmentId"
      :surah-number="selectedPassage?.surah_number"
      :ayah-start="selectedPassage?.ayah_start"
      :ayah-end="selectedPassage?.ayah_end"
      :passage-label="selectedPassageLabel"
    />
    </section>
  </TeacherSectionPane>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import { assignmentProgressLabel } from '../../../scripts/teacher/formatters'
import {
  resolveDisplayTaskState,
  TASK_STATE,
  taskStateLabelKey,
  teacherStatusToneFromDisplay,
} from '../../../scripts/teacher/taskState'
import TeacherAudioFeedbackComposer from '../TeacherAudioFeedbackComposer.vue'
import TeacherEmpty from '../TeacherEmpty.vue'
import TeacherRecordList from '../TeacherRecordList.vue'
import TeacherSectionPane from '../TeacherSectionPane.vue'
import TeacherTabGuide from '../TeacherTabGuide.vue'

export default {
  name: 'TeacherStudentProfileTasks',
  components: { TeacherAudioFeedbackComposer, TeacherEmpty, TeacherRecordList, TeacherSectionPane, TeacherTabGuide },
  mixins: [i18nMixin],
  props: {
    profile: { type: Object, required: true },
    formatWhen: { type: Function, required: true },
  },
  data() { return { activeFilter: 'all', selectedTaskKey: null } },
  watch: {
    'profile.student.id'() {
      this.activeFilter = 'all'
      this.selectedTaskKey = null
    },
    assignments: {
      immediate: true,
      handler(list) {
        if (!list?.length) {
          this.selectedTaskKey = null
          return
        }
        if (!list.some((item) => String(item.id) === String(this.selectedTaskKey))) {
          this.selectedTaskKey = list[0].id
        }
      },
    },
  },
  computed: {
    assignments() {
      return this.profile.payload.assignments || []
    },
    selectedAssignment() {
      if (!this.assignments.length) return null
      const match = this.assignments.find((item) => String(item.id) === String(this.selectedTaskKey))
      return match || this.assignments[0]
    },
    selectedRecipientId() {
      return this.selectedAssignment?.id || null
    },
    selectedAssignmentId() {
      return this.selectedAssignment?.assignment?.id || null
    },
    selectedPassage() {
      const a = this.selectedAssignment?.assignment
      if (!a) return null
      return {
        surah_number: a.surah_number,
        ayah_start: a.ayah_start,
        ayah_end: a.ayah_end,
        surah_name: a.surah_name,
      }
    },
    selectedPassageLabel() {
      const p = this.selectedPassage
      if (!p?.surah_name) return ''
      return `${p.surah_name} · ${p.ayah_start}–${p.ayah_end}`
    },
    overdueCount() {
      return this.assignments.filter((item) => resolveDisplayTaskState(item) === TASK_STATE.OVERDUE).length
    },
    completedCount() {
      return this.assignments.filter((item) => resolveDisplayTaskState(item) === TASK_STATE.DONE).length
    },
    openCount() {
      return this.assignments.filter((item) => {
        const state = resolveDisplayTaskState(item)
        return state !== TASK_STATE.DONE && state !== TASK_STATE.OVERDUE
      }).length
    },
    filters() {
      return [
        { id: 'all', label: this.t('teacher.task_filter_all'), count: this.taskRows.length },
        { id: 'overdue', label: this.t('teacher.overdue'), count: this.overdueCount },
        { id: 'open', label: this.t('teacher.open_tasks'), count: this.openCount },
        { id: 'done', label: this.t('teacher.status_completed'), count: this.completedCount },
      ]
    },
    visibleRows() {
      if (this.activeFilter === 'all') return this.taskRows
      return this.taskRows.filter((row) => {
        if (this.activeFilter === 'done') return row.displayState === TASK_STATE.DONE
        if (this.activeFilter === 'overdue') return row.displayState === TASK_STATE.OVERDUE
        return row.displayState !== TASK_STATE.DONE && row.displayState !== TASK_STATE.OVERDUE
      })
    },
    taskRows() {
      return this.assignments.map((item) => {
        const a = item.assignment || {}
        const hifzCategory = a.hifz_category || this.inferHifzCategory(a)
        const kind = a.kind === 'ai_recite' ? 'bi bi-mic' : 'bi bi-journal-text'
        const displayState = resolveDisplayTaskState(item)
        const tone = teacherStatusToneFromDisplay(displayState)
        const statusLabelKey = item.review_state === 'needs_correction'
          ? 'teacher.status_needs_correction'
          : taskStateLabelKey(displayState)
        const evidence = item.evidence || {}
        const attemptId = evidence.attempt_id || null
        return {
          key: item.id,
          displayState,
          filterStatus: item.status || 'pending',
          icon: kind,
          iconTone: tone,
          studentId: this.profile.student.id,
          attemptId,
          title: `${a.surah_name} ${a.ayah_start}–${a.ayah_end}`,
          hint: [
            this.t(`teacher.hifz_${hifzCategory}`),
            a.kind === 'ai_recite' ? this.t('teacher.kind_ai') : this.t('teacher.kind_practice'),
            a.due_at ? this.t('teacher.task_due_date', { date: this.formatWhen(a.due_at) }) : this.t('teacher.no_due_date'),
            displayState === TASK_STATE.DONE
              ? this.completionEvidenceLabel(item)
              : this.targetLabel(item, a),
          ].filter(Boolean).join(' · '),
          badge: this.t(statusLabelKey),
          badgeTone: tone,
          source: displayState === TASK_STATE.IN_PROGRESS ? this.progressLabel(item) : '',
          audio: evidence.audio || null,
          transcript: evidence.transcript || '',
          words: evidence.words || [],
          range: evidence.range || null,
          href: attemptId
            ? ''
            : (a.surah_number && a.ayah_start
              ? `/memorisation?surah=${a.surah_number}&from=${a.ayah_start}&to=${a.ayah_end || a.ayah_start}&review=1&assignment_recipient=${item.id}`
              : ''),
        }
      })
    },
  },
  methods: {
    inferHifzCategory(assignment) {
      if (assignment.kind === 'ai_recite') return 'sabqi'
      return Number(assignment.repetition_target || 0) >= 5 ? 'manzil' : 'sabaq'
    },
    targetLabel(item, assignment) {
      const n = Math.max(1, Number(item.progress?.target || assignment.repetition_target || 1))
      return this.t(n === 1 ? 'teacher.task_target_context_one' : 'teacher.task_target_context_many', { n })
    },
    progressLabel(item) {
      return item?.progress ? assignmentProgressLabel(item, this.t.bind(this)) : ''
    },
    chooseTask(row) {
      this.selectedTaskKey = row?.key ?? null
    },
    completionEvidenceLabel(item) {
      if (item?.status !== 'completed' || !item?.completed_at) return ''
      return this.t('teacher.learner_assignments_completed_at', {
        date: this.formatWhen(item.completed_at),
      })
    },
  },
}
</script>