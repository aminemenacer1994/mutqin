<template>
  <section class="teacher-stack teacher-profile">
    <div v-if="loading" class="teacher-skeletons"><div class="teacher-skeleton"></div></div>

    <template v-else-if="profile">
      <header class="card teacher-profile-hero teacher-profile-hero--compact">
        <div class="card-body teacher-profile-hero__body">
          <div class="teacher-profile-hero__identity">
            <span class="teacher-profile-hero__avatar" aria-hidden="true">{{ studentInitial(profile.student.name) }}</span>
            <div class="teacher-profile-hero__copy">
              <nav class="teacher-profile-hero__eyebrow teacher-profile-hero__crumb" :aria-label="t('teacher.breadcrumb')">
                <button type="button" @click="$emit('back')"><i class="bi bi-arrow-left" aria-hidden="true"></i><span>{{ t('teacher.nav_students') }}</span></button>
              </nav>
              <h2>{{ profile.student.name }}</h2>
              <div class="d-flex flex-wrap gap-1 mt-2" :aria-label="t('teacher.student')">
                <span v-for="pill in metaPills" :key="pill.key" class="badge rounded-pill border" :class="pill.className">{{ pill.label }}</span>
              </div>
            </div>
          </div>
          <div class="teacher-profile-hero__actions">
            <button type="button" class="btn btn-outline-secondary" @click="selectTab('messages')">
              <i class="bi bi-chat-dots" aria-hidden="true"></i> {{ t('teacher.message_student') }}
            </button>
            <button type="button" class="btn btn-primary teacher-profile-hero__assign" @click="$emit('assign-revision', profile.student)">
              <i class="bi bi-journal-plus" aria-hidden="true"></i>
              {{ t('teacher.assign_task') }}
            </button>
          </div>
        </div>
      </header>

      <div
        :id="tabsId"
        ref="tabStrip"
        class="nav nav-tabs teacher-tabs teacher-tabs--scroll"
        role="tablist"
        :aria-label="t('teacher.nav_students')"
        aria-orientation="horizontal"
      >
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          role="tab"
          :id="tabId(tab.id)"
          class="nav-link teacher-tabs__tab"
          :class="{ 'is-active': section === tab.id, active: section === tab.id }"
          :aria-selected="section === tab.id ? 'true' : 'false'"
          :aria-controls="panelId"
          :tabindex="section === tab.id ? 0 : -1"
          @keydown="onTabKeydown($event, tab.id)"
          @click="selectTab(tab.id)"
        >
          <i :class="tab.icon" aria-hidden="true"></i>
          <span>{{ t(tab.label) }}</span>
        </button>
      </div>

      <div :id="panelId" class="card teacher-tab-panel teacher-profile-stack" :class="`is-${section}`" role="tabpanel" :aria-labelledby="tabId(section)" tabindex="0">
        <p v-if="sectionRefreshing" class="teacher-loading-inline" role="status">{{ t('teacher.loading') }}</p>
        <div v-if="tabHint" class="teacher-profile-tab-meta">
          <p class="teacher-profile-tab-meta__hint">{{ tabHint }}</p>
        </div>
        <TeacherStudentProfilePractice
          v-if="isLearningSection"
          :profile="tabProfile"
          :focus-payload="section === 'revision' ? tabProfile.payload : (profile.sectionPayloads?.focus ?? null)"
          :session-label="sessionLabel"
          :issue-label="issueLabel"
          :format-when="formatWhen"
          :initial-subview="learningSubview"
          @assign-revision="$emit('assign-revision', $event)"
          @mark-reviewed="openReviewConfirm"
        />
        <TeacherStudentProfileTasks
          v-else-if="section === 'tasks'"
          :profile="tabProfile"
          :format-when="formatWhen"
        />
        <TeacherStudentProfileMessages v-else-if="section === 'messages'" :profile="tabProfile" :format-when="formatWhen" />
      </div>
    </template>

    <TeacherEmpty v-else :message="t('teacher.student_unavailable')" />

    <TeacherDialog
      :open="Boolean(reviewConfirm)"
      size="sm"
      :title="t('teacher.mark_reviewed')"
      :close-label="t('teacher.close')"
      @close="closeReviewConfirm"
    >
      <p class="mb-0">{{ t('teacher.mark_reviewed_confirm') }}</p>
      <template #footer>
        <button type="button" class="btn btn-outline-secondary" @click="closeReviewConfirm">{{ t('teacher.cancel') }}</button>
        <button type="button" class="btn btn-primary" @click="confirmReview">{{ t('teacher.mark_reviewed') }}</button>
      </template>
    </TeacherDialog>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import TeacherDialog from './TeacherDialog.vue'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherStudentProfilePractice from './profile/TeacherStudentProfilePractice.vue'
import TeacherStudentProfileTasks from './profile/TeacherStudentProfileTasks.vue'
import TeacherStudentProfileMessages from './profile/TeacherStudentProfileMessages.vue'

export default {
  name: 'TeacherStudentProfileSection',
  components: {
    TeacherDialog,
    TeacherEmpty,
    TeacherStudentProfilePractice,
    TeacherStudentProfileTasks,
    TeacherStudentProfileMessages,
  },
  mixins: [i18nMixin],
  props: {
    profile: { type: Object, default: null },
    section: { type: String, required: true },
    learningSubview: { type: String, default: 'memorisation' },
    tabs: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    metric: { type: Function, required: true },
    practiceTime: { type: String, required: true },
    comparisons: { type: Array, default: () => [] },
    studentInitial: { type: Function, required: true },
    sessionLabel: { type: Function, required: true },
    issueLabel: { type: Function, required: true },
    formatWhen: { type: Function, required: true },
  },
  emits: ['back', 'change-section', 'assign-revision', 'mark-reviewed'],
  data() {
    const uid = Math.random().toString(36).slice(2, 9)
    return {
      tabsId: `teacher-profile-tabs-${uid}`,
      panelId: `teacher-profile-panel-${uid}`,
      tabPrefix: `teacher-profile-tab-${uid}`,
      reviewConfirm: null,
    }
  },
  computed: {
    sectionRefreshing() {
      return this.profile?.section !== this.section && !this.profile?.sectionPayloads?.[this.section]
    },
    tabProfile() {
      if (!this.profile) return null
      const payload = this.profile.section === this.section
        ? this.profile.payload
        : (this.profile.sectionPayloads?.[this.section] || this.profile.payload)
      return { ...this.profile, payload }
    },
    isLearningSection() {
      return ['ai', 'revision', 'plan'].includes(this.section)
    },
    metaPills() {
      const student = this.profile?.student || {}
      const meta = this.profile?.meta || {}
      const pills = []
      ;(student.groups || []).forEach((group) => {
        pills.push({ key: `group-${group.id}`, label: group.name, className: 'teacher-pill' })
      })
      if (student.organisation) pills.push({ key: 'org', label: student.organisation, className: 'teacher-pill' })
      if (!student.organisation && !(student.groups || []).length) {
        pills.push({ key: 'class', label: this.t('teacher.no_group'), className: 'teacher-pill' })
      }
      if (student.email) pills.push({ key: 'email', label: student.email, className: 'teacher-pill' })
      if (typeof meta.ai_success_rate === 'number') {
        pills.push({
          key: 'score',
          label: this.t('teacher.profile_recite_avg_with_count', { score: meta.ai_success_rate, count: Number(meta.ai_attempts || 0) }),
          className: `teacher-pill ${this.scoreTone(meta.ai_success_rate)}`,
        })
      }
      if (Number(meta.assignments_overdue) > 0) {
        pills.push({
          key: 'overdue',
          label: `${this.t('teacher.task_filter_overdue')} ${meta.assignments_overdue}`,
          className: 'teacher-pill is-flagged',
        })
      }
      return pills
    },
    tabHintKey() {
      return ''
    },
    tabHint() {
      if (!this.tabHintKey || this.sectionRefreshing) return ''
      return this.t(this.tabHintKey)
    },
  },
  watch: {
    section() {
      this.$nextTick(this.revealActiveTab)
    },
    profile() {
      this.$nextTick(this.revealActiveTab)
    },
  },
  methods: {
    openReviewConfirm(payload) { this.reviewConfirm = payload },
    closeReviewConfirm() { this.reviewConfirm = null },
    confirmReview() {
      if (!this.reviewConfirm) return
      this.$emit('mark-reviewed', this.reviewConfirm)
      this.reviewConfirm = null
    },
    scoreTone(score) {
      const value = Number(score)
      if (value >= 80) return 'is-score'
      if (value >= 50) return 'is-partial'
      return 'is-flagged'
    },
    tabId(id) {
      return `${this.tabPrefix}-${id}`
    },
    onTabKeydown(event, id) {
      const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
      if (!keys.includes(event.key)) return
      event.preventDefault()
      const current = this.tabs.findIndex((tab) => tab.id === id)
      if (current < 0) return
      let next = current
      if (event.key === 'ArrowLeft') next = (current - 1 + this.tabs.length) % this.tabs.length
      if (event.key === 'ArrowRight') next = (current + 1) % this.tabs.length
      if (event.key === 'Home') next = 0
      if (event.key === 'End') next = this.tabs.length - 1
      const nextTab = this.tabs[next]
      if (!nextTab) return
      this.selectTab(nextTab.id, true)
    },
    selectTab(id, focus = false) {
      this.$emit('change-section', id)
      this.$nextTick(() => {
        this.revealActiveTab(id)
        if (focus) document.getElementById(this.tabId(id))?.focus({ preventScroll: true })
      })
    },
    revealActiveTab(id = this.section) {
      const strip = this.$refs.tabStrip
      const tab = document.getElementById(this.tabId(id))
      if (!strip || !tab) return
      const container = strip.getBoundingClientRect()
      const target = tab.getBoundingClientRect()
      const inset = 8
      if (target.left < container.left + inset) strip.scrollLeft += target.left - container.left - inset
      else if (target.right > container.right - inset) strip.scrollLeft += target.right - container.right + inset
    },
  },
}
</script>
