<template>
  <section class="teacher-stack teacher-plans-view" data-feature="learning-plans">
    <header class="teacher-plans-view__head">
      <h2>{{ t('teacher.nav_plans') }}</h2>
      <label class="teacher-plans-view__picker">
        <span class="visually-hidden">{{ t('teacher.student') }}</span>
        <select v-model="studentId" class="form-select form-select-sm teacher-plans-view__select">
      <option value="">{{ t('teacher.choose') }}</option>
      <option v-for="student in students" :key="student.id" :value="String(student.id)">{{ student.name }}</option>
        </select>
      </label>
    </header>

    <p v-if="loading" class="teacher-loading-inline" role="status">{{ t('teacher.loading') }}</p>
    <TeacherStudentProfilePlan v-else-if="studentId" :key="studentId" :student-id="studentId" />
    <TeacherEmpty v-else icon="bi bi-calendar-week" :message="t('teacher.plan_hub_pick')" />
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherStudentProfilePlan from './profile/TeacherStudentProfilePlan.vue'

export default {
  name: 'TeacherPlansView',
  components: { TeacherEmpty, TeacherStudentProfilePlan },
  mixins: [i18nMixin],
  data() {
    return {
      loading: true,
      students: [],
      studentId: '',
    }
  },
  async mounted() {
    try {
      const data = await learningApi.getTeacherStudents({ per_page: 50 })
      const rows = data?.data || data?.students || data?.rows || []
      this.students = Array.isArray(rows) ? rows : []
      if (this.students[0]) this.studentId = String(this.students[0].id)
    } catch {
      this.students = []
    } finally {
      this.loading = false
    }
  },
}
</script>
