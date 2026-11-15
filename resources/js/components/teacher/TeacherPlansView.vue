<template>
  <section class="teacher-stack teacher-plans-view" data-feature="learning-plans">
    <header class="teacher-page-header">
      <div><p class="teacher-kicker">{{ t('teacher.workspace_label') }}</p><h1 class="teacher-page-header__title">{{ t('teacher.nav_plans') }}</h1></div>
      <button type="button" class="btn btn-primary" :disabled="loading || !students.length" @click="startPlan"><i class="bi bi-plus-lg" aria-hidden="true"></i>{{ t('teacher.plan_new') }}</button>
    </header>
    <div class="teacher-toolbar">
      <label class="teacher-plans-view__picker">
        <span class="visually-hidden">{{ t('teacher.student') }}</span>
        <select ref="picker" v-model="studentId" class="form-select">
          <option value="">{{ t('teacher.all_students') }}</option>
          <option v-for="student in students" :key="student.id" :value="String(student.id)">{{ student.name }}</option>
        </select>
      </label>
    </div>
    <p v-if="error" class="alert alert-danger" role="alert">{{ error }} <button type="button" class="btn btn-link btn-sm" @click="load">{{ t('teacher.retry') }}</button></p>
    <p v-if="chooseStudent" class="teacher-loading-inline" role="status">{{ t('teacher.plan_hub_pick') }}</p>
    <p v-if="loading" class="teacher-loading-inline" role="status">{{ t('teacher.loading') }}</p>
    <TeacherStudentProfilePlan v-else-if="studentId" :key="studentId" ref="workspace" :student-id="studentId" @updated="loadPlans" />
    <div v-else-if="plans.length" class="teacher-learning-plan__board">
      <article v-for="plan in plans" :key="plan.id" class="teacher-learning-plan__card">
        <header class="teacher-learning-plan__card-head">
          <div><p class="teacher-kicker">{{ plan.student?.name || studentName(plan.student_id) }}</p><h3>{{ plan.title }}</h3><p class="teacher-learning-plan__meta"><span class="teacher-learning-plan__badge" :class="`is-${plan.status}`">{{ planStatus(plan.status) }}</span><span>{{ plan.starts_on }}<template v-if="plan.ends_on"> – {{ plan.ends_on }}</template></span></p></div>
          <button type="button" class="btn btn-outline-secondary btn-sm" @click="studentId = String(plan.student_id || plan.student?.id)">{{ t('teacher.open') }}<i class="bi bi-arrow-right" aria-hidden="true"></i></button>
        </header>
        <p class="teacher-learning-plan__progress-label mt-3">{{ t('teacher.plan_progress', { done: plan.progress?.completed || 0, total: plan.progress?.total || 0 }) }}</p>
        <div class="teacher-learning-plan__progress-bar"><span :style="{ width: `${percent(plan)}%` }"></span></div>
      </article>
    </div>
    <TeacherEmpty v-else-if="!loading && !error" icon="bi bi-calendar-week" :message="t('teacher.plans_global_empty')" />
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
  data() { return { loading: true, students: [], plans: [], studentId: '', error: '', chooseStudent: false, createRequested: false } },
  mounted() { this.load() },
  watch: { studentId() { this.chooseStudent = false; if (!this.studentId) this.loadPlans(); if (this.createRequested && this.studentId) this.$nextTick(() => { this.$refs.workspace?.openComposer(); this.createRequested = false }) } },
  methods: {
    async load() {
      this.loading = true; this.error = ''
      try {
        const [data] = await Promise.all([learningApi.getTeacherStudents({ per_page: 50 }), this.loadPlans()])
        this.students = data?.data || []
        const last = Number(data?.meta?.last_page || data?.last_page || 1)
        for (let page = 2; page <= last; page++) {
          const next = await learningApi.getTeacherStudents({ per_page: 50, page })
          this.students.push(...(next?.data || []))
        }
      } catch (error) { this.error = error?.response?.data?.message || this.t('teacher.plan_load_error') }
      finally { this.loading = false }
    },
    async loadPlans() {
      try { const response = await learningApi.getTeacherLearningPlans(); this.plans = response?.data || [] }
      catch (error) { this.error = error?.response?.data?.message || this.t('teacher.plan_load_error') }
    },
    startPlan() { if (this.studentId) this.$refs.workspace?.openComposer(); else { this.createRequested = true; this.chooseStudent = true; this.$refs.picker?.focus() } },
    studentName(id) { return this.students.find(s => String(s.id) === String(id))?.name || '' },
    planStatus(status) { const key = `teacher.plan_status_${status}`; const value = this.t(key); return value === key ? status : value },
    percent(plan) { return plan.progress?.total ? Math.min(100, Math.round(100 * Number(plan.progress.completed || 0) / plan.progress.total)) : 0 },
  },
}
</script>
