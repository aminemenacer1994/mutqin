<template>
  <section class="teacher-stack">
    <TeacherPageHeader
      :title="t('teacher.nav_assignments')"
      :subtitle="t('teacher.tasks_subtitle')"
    />
    <TeacherPanel
      :title="t('teacher.assign_form_title')"
      :hint="t('teacher.assign_form_lead')"
      icon="bi bi-journal-text"
      compact
    >
      <form class="teacher-compose" @submit.prevent="$emit('create')">
        <fieldset class="teacher-compose__block">
          <legend class="teacher-compose__legend">{{ t('teacher.assign_section_student') }}</legend>
        <label class="teacher-field teacher-field--full">
          <span>{{ t('teacher.student') }}</span>
          <select :value="form.student_id" required @change="patch('student_id', $event.target.value)">
            <option value="">{{ t('teacher.choose') }}</option>
            <option v-for="student in students" :key="student.id" :value="String(student.id)">{{ student.name }}</option>
          </select>
        </label>
        </fieldset>

        <fieldset class="teacher-compose__block">
          <legend class="teacher-compose__legend">{{ t('teacher.assign_section_task') }}</legend>
        <div class="teacher-compose__row">
          <label class="teacher-field">
            <span>{{ t('teacher.kind') }}</span>
            <select :value="form.kind" @change="patch('kind', $event.target.value)">
              <option value="practice">{{ t('teacher.kind_practice') }}</option>
              <option value="ai_recite">{{ t('teacher.kind_ai') }}</option>
            </select>
          </label>
          <label class="teacher-field teacher-field--grow">
            <span>{{ t('teacher.surah') }}</span>
            <select :value="form.surah_number" @change="patch('surah_number', $event.target.value)">
              <option v-for="surah in surahs" :key="surah.number" :value="String(surah.number)">{{ surah.number }}. {{ surah.name }}</option>
            </select>
          </label>
        </div>

        <div class="teacher-compose__range">
          <label class="teacher-field">
            <span>{{ t('teacher.from') }}</span>
            <input :value="form.ayah_start" type="number" min="1" required @input="patch('ayah_start', Number($event.target.value))">
          </label>
          <label class="teacher-field">
            <span>{{ t('teacher.to') }}</span>
            <input :value="form.ayah_end" type="number" min="1" required @input="patch('ayah_end', Number($event.target.value))">
          </label>
          <label class="teacher-field">
            <span>{{ t('teacher.due') }}</span>
            <input :value="form.due_at" type="date" @input="patch('due_at', $event.target.value)">
          </label>
        </div>
        </fieldset>

        <button type="submit" class="teacher-compose__send" :disabled="saving">
          <i class="bi bi-send" aria-hidden="true"></i>
          {{ t('teacher.assign') }}
        </button>
      </form>
    </TeacherPanel>

    <TeacherPanel
      v-if="rows.length"
      :title="t('teacher.sent_tasks')"
      icon="bi bi-send"
      compact
    >
      <ul class="teacher-task-list">
        <li v-for="item in visibleItems" :key="item.key">
          <button type="button" class="teacher-task-row" :disabled="!item.studentId" @click="item.studentId && $emit('open-student', item.studentId)">
            <span class="teacher-list__avatar" aria-hidden="true">
              <i :class="item.kind === 'ai_recite' ? 'bi bi-mic' : 'bi bi-journal-text'"></i>
            </span>
            <span class="teacher-tile__copy">
              <strong>{{ item.title }}</strong>
              <span class="teacher-tile__meta">{{ item.studentName }} · {{ t(`teacher.status_${item.status}`) }}</span>
            </span>
            <span class="teacher-tile__go" aria-hidden="true">
              <i class="bi bi-arrow-right-short"></i>
            </span>
          </button>
        </li>
      </ul>
      <TeacherMore :remaining="flatItems.length - shown" @more="shown += STEP" />
    </TeacherPanel>
    <TeacherEmpty v-else icon="bi bi-clipboard-check" :message="t('teacher.assignments_empty')" />
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherMore from './TeacherMore.vue'
import TeacherPageHeader from './TeacherPageHeader.vue'
import TeacherPanel from './TeacherPanel.vue'

const STEP = 4

export default {
  name: 'TeacherAssignmentsSection',
  components: { TeacherEmpty, TeacherMore, TeacherPageHeader, TeacherPanel },
  mixins: [i18nMixin],
  props: {
    form: { type: Object, required: true },
    saving: { type: Boolean, default: false },
    rows: { type: Array, default: () => [] },
    students: { type: Array, default: () => [] },
    surahs: { type: Array, default: () => [] },
  },
  emits: ['update:form', 'create', 'open-student'],
  data() {
    return { shown: STEP, STEP }
  },
  computed: {
    flatItems() {
      return this.rows.flatMap((row) => {
        const title = `${row.assignment.surah_name} ${row.assignment.ayah_start} to ${row.assignment.ayah_end}`
        const recipients = row.recipients?.length ? row.recipients : [{ id: row.assignment.id, student_id: null, student_name: this.t('teacher.no_authorised'), status: 'pending' }]
        return recipients.map((recipient) => ({
          key: `${row.assignment.id}-${recipient.id}`,
          kind: row.assignment.kind,
          title,
          studentId: recipient.student_id,
          studentName: recipient.student_name,
          status: recipient.status || 'pending',
        }))
      })
    },
    visibleItems() {
      return this.flatItems.slice(0, this.shown)
    },
  },
  methods: {
    patch(key, value) {
      this.$emit('update:form', { ...this.form, [key]: value })
    },
  },
}
</script>
