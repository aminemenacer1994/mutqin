<template>
  <section class="teacher-stack">
    <TeacherPageHeader
      :title="t('teacher.nav_students')"
      :subtitle="t('teacher.students_subtitle')"
    />
    <div class="teacher-toolbar teacher-toolbar--filters teacher-toolbar--notion">
      <label class="teacher-search teacher-search--compact">
        <span class="visually-hidden">{{ t('teacher.search') }}</span>
        <i class="bi bi-search" aria-hidden="true"></i>
        <input
          :value="filters.q"
          type="search"
          :placeholder="t('teacher.search_placeholder')"
          autocomplete="off"
          @input="onQueryInput"
        >
      </label>
      <label class="teacher-field teacher-field--inline">
        <span class="visually-hidden">{{ t('teacher.group') }}</span>
        <select :value="filters.group_id" @change="onFilterChange('group_id', $event.target.value)">
          <option value="">{{ t('teacher.any_group') }}</option>
          <option v-for="group in groups" :key="group.id" :value="String(group.id)">{{ group.name }}</option>
        </select>
      </label>
      <label class="teacher-field teacher-field--inline">
        <span class="visually-hidden">{{ t('teacher.activity_filter') }}</span>
        <select :value="filters.activity" @change="onFilterChange('activity', $event.target.value)">
          <option value="">{{ t('teacher.any') }}</option>
          <option value="active_7">{{ t('teacher.active_7') }}</option>
          <option value="active_30">{{ t('teacher.active_30') }}</option>
          <option value="inactive_7">{{ t('teacher.inactive_7') }}</option>
        </select>
      </label>
      <label class="teacher-field teacher-field--inline">
        <span class="visually-hidden">{{ t('teacher.filters') }}</span>
        <select :value="filters.sort || 'name'" @change="onFilterChange('sort', $event.target.value)">
          <option value="name">{{ t('teacher.col_name') }}</option>
          <option value="last_seen">{{ t('teacher.last') }}</option>
          <option value="score">{{ t('teacher.ai_rate') }}</option>
          <option value="attention">{{ t('teacher.need_look') }}</option>
        </select>
      </label>
      <button
        type="button"
        class="teacher-filter"
        :class="{ 'is-on': filters.attention === '1' }"
        :aria-pressed="filters.attention === '1' ? 'true' : 'false'"
        @click="onFilterChange('attention', filters.attention === '1' ? '' : '1')"
      >
        <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
        <span>{{ t('teacher.need_look') }}</span>
      </button>
    </div>

    <p v-if="loading && !students.length" class="teacher-loading-inline">
      <span class="dash-spinner" aria-hidden="true"></span>
      {{ t('teacher.loading') }}
    </p>
    <TeacherEmpty v-else-if="!students.length" icon="bi bi-people" :message="t('teacher.students_empty')" />
    <TeacherStudentTable
      v-else
      :students="students"
      :format-when="formatWhen"
      @open="$emit('open-student', $event)"
    />
    <TeacherMore
      :remaining="remaining"
      :loading="loadingMore"
      @more="$emit('more')"
    />
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherMore from './TeacherMore.vue'
import TeacherPageHeader from './TeacherPageHeader.vue'
import TeacherStudentTable from './TeacherStudentTable.vue'

export default {
  name: 'TeacherStudentsSection',
  components: { TeacherEmpty, TeacherMore, TeacherPageHeader, TeacherStudentTable },
  mixins: [i18nMixin],
  props: {
    filters: { type: Object, required: true },
    groups: { type: Array, default: () => [] },
    students: { type: Array, default: () => [] },
    meta: { type: Object, required: true },
    loading: { type: Boolean, default: false },
    loadingMore: { type: Boolean, default: false },
    formatWhen: { type: Function, required: true },
  },
  emits: ['update:filters', 'search', 'queue-search', 'more', 'open-student'],
  computed: {
    remaining() {
      const total = Number(this.meta.total || 0)
      if (total > 0) return Math.max(0, total - this.students.length)
      const last = Number(this.meta.last_page || 1)
      const current = Number(this.meta.current_page || 1)
      return last > current ? 1 : 0
    },
  },
  methods: {
    onQueryInput(event) {
      this.$emit('update:filters', { ...this.filters, q: event.target.value })
      this.$emit('queue-search')
    },
    onFilterChange(key, value) {
      this.$emit('update:filters', { ...this.filters, [key]: value })
      this.$emit('search')
    },
  },
}
</script>
