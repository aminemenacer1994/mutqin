<template>
  <section class="teacher-stack">
    <TeacherPageHeader
      :title="t('teacher.nav_assignments')"
      :subtitle="t('teacher.tasks_subtitle')"
    >
      <template #actions>
        <button type="button" class="dash-btn dash-btn--primary dash-btn--sm" @click="$emit('update:formOpen', true)">
          <i class="bi bi-plus-lg" aria-hidden="true"></i>
          {{ t('teacher.add_task') }}
        </button>
      </template>
    </TeacherPageHeader>

    <p v-if="success" class="teacher-alert teacher-alert--success" role="status">{{ success }}</p>

    <label class="teacher-search teacher-search--tasks">
      <span class="visually-hidden">{{ t('teacher.search') }}</span>
      <i class="bi bi-search" aria-hidden="true"></i>
      <input v-model="query" type="search" :placeholder="t('teacher.search_placeholder')" autocomplete="off">
    </label>

    <TeacherSectionPane
      v-if="filteredItems.length"
      :title="t('teacher.sent_tasks')"
      :hint="t('teacher.sent_tasks_hint')"
      icon="bi bi-send"
      tone="neutral"
    >
      <ul class="teacher-records teacher-records--interactive">
        <li v-for="item in visibleItems" :key="item.key">
          <button
            type="button"
            class="teacher-records__item teacher-records__item--btn"
            :disabled="!item.studentId"
            @click="item.studentId && $emit('open-student', item.studentId)"
          >
            <span class="teacher-records__icon" :class="`teacher-records__icon--${item.statusTone}`" aria-hidden="true">
              <i :class="item.kind === 'ai_recite' ? 'bi bi-mic' : 'bi bi-journal-text'"></i>
            </span>
            <span class="teacher-records__copy">
              <span class="teacher-records__title teacher-quran">{{ item.title }}</span>
              <span class="teacher-records__hint">{{ item.studentName }}</span>
            </span>
            <span class="teacher-records__aside">
              <span class="teacher-badge" :class="`teacher-badge--${item.statusTone}`">{{ t(`teacher.status_${item.status}`) }}</span>
              <span v-if="item.progress || item.due" class="teacher-records__meta">{{ item.progress || item.due }}</span>
              <i class="bi bi-chevron-right teacher-records__chev" aria-hidden="true"></i>
            </span>
          </button>
        </li>
      </ul>
      <TeacherMore :remaining="filteredItems.length - shown" @more="shown += STEP" />
    </TeacherSectionPane>
    <TeacherEmpty v-else icon="bi bi-clipboard-check" :message="t('teacher.assignments_empty')" />

    <TeacherTaskSheet
      :open="formOpen"
      :form="form"
      :saving="saving"
      :students="students"
      :surahs="surahs"
      @close="closeForm"
      @submit="$emit('create')"
      @update:form="$emit('update:form', $event)"
    />
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { formatTeacherWhen } from '../../scripts/teacher/formatters'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherMore from './TeacherMore.vue'
import TeacherPageHeader from './TeacherPageHeader.vue'
import TeacherSectionPane from './TeacherSectionPane.vue'
import TeacherTaskSheet from './TeacherTaskSheet.vue'

const STEP = 8

export default {
  name: 'TeacherAssignmentsSection',
  components: { TeacherEmpty, TeacherMore, TeacherPageHeader, TeacherSectionPane, TeacherTaskSheet },
  mixins: [i18nMixin],
  props: {
    form: { type: Object, required: true },
    formOpen: { type: Boolean, default: false },
    saving: { type: Boolean, default: false },
    success: { type: String, default: '' },
    rows: { type: Array, default: () => [] },
    students: { type: Array, default: () => [] },
    surahs: { type: Array, default: () => [] },
  },
  emits: ['update:form', 'update:formOpen', 'create', 'open-student'],
  data() {
    return { shown: STEP, STEP, query: '' }
  },
  computed: {
    flatItems() {
      return this.rows.flatMap((row) => {
        const assignment = row.assignment || {}
        const title = `${assignment.surah_name} ${assignment.ayah_start}–${assignment.ayah_end}`
        const recipients = row.recipients?.length ? row.recipients : [{
          id: assignment.id,
          student_id: null,
          student_name: this.t('teacher.no_authorised'),
          status: 'pending',
        }]
        return recipients.map((recipient) => {
          const status = recipient.status || 'pending'
          return {
            key: `${assignment.id}-${recipient.id}`,
            kind: assignment.kind,
            title,
            studentId: recipient.student_id,
            studentName: recipient.student_name,
            status,
            statusTone: this.statusTone(status),
            due: assignment.due_at ? formatTeacherWhen(assignment.due_at) : '',
            progress: this.progressLabel(recipient),
          }
        })
      })
    },
    filteredItems() {
      const needle = this.query.trim().toLowerCase()
      if (!needle) return this.flatItems
      return this.flatItems.filter((item) => (
        item.title.toLowerCase().includes(needle)
        || item.studentName.toLowerCase().includes(needle)
      ))
    },
    visibleItems() {
      return this.filteredItems.slice(0, this.shown)
    },
  },
  methods: {
    patch(key, value) {
      this.$emit('update:form', { ...this.form, [key]: value })
    },
    closeForm() {
      this.$emit('update:formOpen', false)
    },
    progressLabel(recipient) {
      const progress = recipient.progress
      if (!progress?.target) return ''
      return this.t('teacher.learner_assignments_progress', {
        completed: progress.completed ?? 0,
        target: progress.target,
      })
    },
    statusTone(status) {
      if (status === 'completed') return 'good'
      if (status === 'overdue') return 'danger'
      if (status === 'in_progress') return 'mid'
      return 'muted'
    },
  },
}
</script>
