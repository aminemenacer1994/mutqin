<template>
  <section class="teacher-stack" data-feature="recitation-difficulties">
    <header class="mb-3">
      <h2 class="h4 mb-1">{{ t('teacher.nav_difficulties') }}</h2>
      <p class="text-body-secondary mb-0">{{ t('teacher.difficulties_help') }}</p>
    </header>

    <p v-if="error" class="alert alert-danger" role="alert">{{ error }}</p>
    <p v-if="loading" class="text-body-secondary" role="status">{{ t('teacher.loading') }}</p>

    <div v-else class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead class="table-light">
          <tr>
            <th scope="col">{{ t('teacher.student') }}</th>
            <th scope="col">{{ t('teacher.difficulty_state_recurring') }}</th>
            <th scope="col" class="text-end"><span class="visually-hidden">{{ t('teacher.student_actions') }}</span></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="student in orderedStudents" :key="student.id">
            <tr>
              <th scope="row" class="fw-normal">
                <span class="fw-semibold d-block">{{ student.name }}</span>
                <span v-if="student.email" class="small text-body-secondary">{{ student.email }}</span>
              </th>
              <td>{{ countFor(student.id) }}</td>
              <td class="text-end">
                <button
                  type="button"
                  class="btn btn-sm"
                  :class="openId === String(student.id) ? 'btn-secondary' : 'btn-outline-primary'"
                  :aria-expanded="openId === String(student.id) ? 'true' : 'false'"
                  @click="toggle(student.id)"
                >
                  {{ openId === String(student.id) ? t('teacher.close') : t('teacher.open') }}
                </button>
              </td>
            </tr>
            <tr v-if="openId === String(student.id)">
              <td colspan="3" class="bg-body-tertiary">
                <TeacherRecitationDifficultiesPanel
                  :student-id="student.id"
                  :format-when="formatWhen"
                  @assign-revision="$emit('assign-revision', $event)"
                />
              </td>
            </tr>
          </template>
          <tr v-if="!orderedStudents.length">
            <td colspan="3" class="text-body-secondary">{{ t('teacher.students_empty') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'
import TeacherRecitationDifficultiesPanel from './profile/TeacherRecitationDifficultiesPanel.vue'

export default {
  name: 'TeacherDifficultiesView',
  components: { TeacherRecitationDifficultiesPanel },
  mixins: [i18nMixin],
  emits: ['assign-revision'],
  data() {
    return {
      loading: true,
      error: '',
      queue: [],
      students: [],
      openId: '',
    }
  },
  computed: {
    counts() {
      return Object.fromEntries(this.queue.map((row) => [String(row.student_id), Number(row.difficulty_count || 0)]))
    },
    orderedStudents() {
      return [...this.students].sort((a, b) => {
        const diff = this.countFor(b.id) - this.countFor(a.id)
        if (diff !== 0) return diff
        return String(a.name || '').localeCompare(String(b.name || ''))
      })
    },
  },
  async mounted() {
    try {
      const [queueRes, studentsRes] = await Promise.all([
        learningApi.getTeacherRecitationDifficultyQueue(40),
        learningApi.getTeacherStudents({ per_page: 50 }),
      ])
      this.queue = Array.isArray(queueRes?.data) ? queueRes.data : []
      const rows = studentsRes?.data || []
      this.students = Array.isArray(rows) ? rows : []
      const first = this.orderedStudents.find((student) => this.countFor(student.id) > 0)
      if (first) this.openId = String(first.id)
    } catch (error) {
      this.error = error?.response?.data?.message || this.t('teacher.difficulties_load_error')
    } finally {
      this.loading = false
    }
  },
  methods: {
    countFor(id) {
      return this.counts[String(id)] || 0
    },
    toggle(id) {
      const key = String(id)
      this.openId = this.openId === key ? '' : key
    },
    formatWhen(value) {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return String(value)
      return date.toLocaleDateString()
    },
  },
}
</script>
