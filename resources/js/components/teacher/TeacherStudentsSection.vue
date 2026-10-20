<template>
  <section class="teacher-stack">
    <TeacherPanel :title="t('teacher.nav_students')">
      <form class="teacher-filters" @submit.prevent="$emit('search')">
        <label class="teacher-field teacher-field--wide">
          <span>{{ t('teacher.search') }}</span>
          <input
            :value="filters.q"
            type="search"
            :placeholder="t('teacher.search_placeholder')"
            @input="onQueryInput"
          >
        </label>
        <label class="teacher-field">
          <span>{{ t('teacher.group') }}</span>
          <select :value="filters.group_id" @change="onFilterChange('group_id', $event.target.value)">
            <option value="">{{ t('teacher.any_group') }}</option>
            <option v-for="group in teachingGroups" :key="group.id" :value="String(group.id)">{{ group.name }}</option>
          </select>
        </label>
        <label class="teacher-field">
          <span>{{ t('teacher.activity_filter') }}</span>
          <select :value="filters.activity" @change="onFilterChange('activity', $event.target.value)">
            <option value="">{{ t('teacher.any') }}</option>
            <option value="active_7">{{ t('teacher.active_7') }}</option>
            <option value="active_30">{{ t('teacher.active_30') }}</option>
            <option value="inactive_7">{{ t('teacher.inactive_7') }}</option>
          </select>
        </label>
        <label class="teacher-field">
          <span>{{ t('teacher.performance') }}</span>
          <select :value="filters.performance" @change="onFilterChange('performance', $event.target.value)">
            <option value="">{{ t('teacher.any') }}</option>
            <option value="strong">{{ t('teacher.strong') }}</option>
            <option value="developing">{{ t('teacher.developing') }}</option>
            <option value="none">{{ t('teacher.no_ai') }}</option>
          </select>
        </label>
        <label class="teacher-check">
          <input
            :checked="filters.attention === '1'"
            type="checkbox"
            @change="onFilterChange('attention', $event.target.checked ? '1' : '')"
          >
          <span>{{ t('teacher.needs_attention') }}</span>
        </label>
      </form>
    </TeacherPanel>

    <p v-if="loading" class="teacher-loading-inline">
      <span class="dash-spinner" aria-hidden="true"></span>
      {{ t('teacher.loading') }}
    </p>
    <TeacherEmpty v-else-if="!students.length" icon="bi bi-people" :message="t('teacher.students_empty')" />
    <div v-else class="teacher-students">
      <TeacherStudentCard
        v-for="student in students"
        :key="student.id"
        :student="student"
        :group-label="groupLabel(student)"
        :metrics="studentMetrics(student)"
        @open="$emit('open-student', $event)"
      />
    </div>

    <div v-if="meta.last_page > 1" class="teacher-pager">
      <button type="button" class="dash-btn dash-btn--ghost" :disabled="meta.current_page <= 1" @click="$emit('page', meta.current_page - 1)">
        {{ t('teacher.previous') }}
      </button>
      <span>{{ meta.current_page }} / {{ meta.last_page }}</span>
      <button type="button" class="dash-btn dash-btn--ghost" :disabled="meta.current_page >= meta.last_page" @click="$emit('page', meta.current_page + 1)">
        {{ t('teacher.next') }}
      </button>
    </div>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherPanel from './TeacherPanel.vue'
import TeacherStudentCard from './TeacherStudentCard.vue'

export default {
  name: 'TeacherStudentsSection',
  components: { TeacherEmpty, TeacherPanel, TeacherStudentCard },
  mixins: [i18nMixin],
  props: {
    filters: { type: Object, required: true },
    teachingGroups: { type: Array, default: () => [] },
    students: { type: Array, default: () => [] },
    meta: { type: Object, required: true },
    loading: { type: Boolean, default: false },
    groupLabel: { type: Function, required: true },
    weakLabel: { type: Function, required: true },
    revisionLabel: { type: Function, required: true },
    assignmentLabel: { type: Function, required: true },
    formatWhen: { type: Function, required: true },
  },
  emits: ['update:filters', 'search', 'queue-search', 'page', 'open-student'],
  methods: {
    onQueryInput(event) {
      this.$emit('update:filters', { ...this.filters, q: event.target.value })
      this.$emit('queue-search')
    },
    onFilterChange(key, value) {
      this.$emit('update:filters', { ...this.filters, [key]: value })
      this.$emit('search')
    },
    studentMetrics(student) {
      return [
        { key: 'sessions', label: this.t('teacher.sessions'), value: student.sessions },
        { key: 'active_days', label: this.t('teacher.active_days'), value: student.active_days },
        { key: 'ayahs', label: this.t('teacher.ayahs'), value: student.ayahs_practised },
        {
          key: 'last',
          label: this.t('teacher.last'),
          value: student.last_activity_at ? this.formatWhen(student.last_activity_at) : this.t('teacher.no_activity'),
        },
        {
          key: 'ai',
          label: this.t('teacher.ai_rate'),
          value: student.ai_success_rate === null ? this.t('teacher.unavailable') : `${student.ai_success_rate}%`,
        },
        { key: 'weak', label: this.t('teacher.weak'), value: this.weakLabel(student) },
        { key: 'revision', label: this.t('teacher.revision'), value: this.revisionLabel(student) },
        { key: 'assignments', label: this.t('teacher.assignment_status'), value: this.assignmentLabel(student.assignments) },
      ]
    },
  },
}
</script>
