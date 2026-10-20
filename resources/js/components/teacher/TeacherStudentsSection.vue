<template>
  <section class="teacher-stack">
    <div class="teacher-toolbar">
      <label class="teacher-search">
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
    <div v-else class="teacher-groups">
      <section
        v-for="group in performanceGroups"
        :key="group.key"
        class="teacher-group"
        :aria-labelledby="`teacher-group-${group.key}`"
      >
        <h2 :id="`teacher-group-${group.key}`" class="teacher-group__title">
          {{ group.title }}
          <span class="teacher-group__count">{{ group.students.length }}</span>
        </h2>
        <div class="teacher-grid">
          <TeacherStudentCard
            v-for="(student, index) in group.students"
            :key="student.id"
            :student="student"
            :organisation-label="organisationName"
            :format-when="formatWhen"
            :style="{ '--dash-delay': `${Math.min(index, 8) * 28}ms` }"
            @open="$emit('open-student', $event)"
          />
        </div>
      </section>
    </div>
    <TeacherMore
      :remaining="remaining"
      :loading="loadingMore"
      @more="$emit('more')"
    />
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { groupStudentsByPerformance } from '../../scripts/teacher/formatters'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherMore from './TeacherMore.vue'
import TeacherStudentCard from './TeacherStudentCard.vue'

export default {
  name: 'TeacherStudentsSection',
  components: { TeacherEmpty, TeacherMore, TeacherStudentCard },
  mixins: [i18nMixin],
  props: {
    filters: { type: Object, required: true },
    organisationName: { type: String, default: '' },
    students: { type: Array, default: () => [] },
    meta: { type: Object, required: true },
    loading: { type: Boolean, default: false },
    loadingMore: { type: Boolean, default: false },
    formatWhen: { type: Function, required: true },
  },
  emits: ['update:filters', 'search', 'queue-search', 'more', 'open-student'],
  computed: {
    performanceGroups() {
      return groupStudentsByPerformance(this.students, this.t)
    },
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
