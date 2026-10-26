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
                <button type="button" @click="$emit('back')"><i class="bi bi-people" aria-hidden="true"></i><span>{{ t('teacher.nav_students') }}</span></button>
                <i class="bi bi-chevron-right" aria-hidden="true"></i>
                <span><i :class="activeTabIcon" aria-hidden="true"></i>{{ activeTabLabel }}</span>
              </nav>
              <h2>{{ profile.student.name }}</h2>
              <p class="teacher-meta">
                <i class="bi bi-building" aria-hidden="true"></i>
                {{ profile.student.organisation || t('teacher.no_group') }}
                <template v-if="profile.student.groups?.length"> · {{ profile.student.groups.map((group) => group.name).join(', ') }}</template>
              </p>
              <p v-if="profile.student.email" class="teacher-profile-hero__email"><i class="bi bi-envelope" aria-hidden="true"></i>{{ profile.student.email }}</p>
            </div>
          </div>
          <div class="teacher-profile-hero__actions">
            <button type="button" class="btn btn-outline-secondary teacher-profile-hero__report-button" @click="openReport('parent')"><i class="bi bi-file-earmark-text" aria-hidden="true"></i> {{ t('teacher.report_title') }}</button>
            <button type="button" class="btn teacher-profile-hero__back" @click="$emit('back')">
              <i class="bi bi-arrow-left" aria-hidden="true"></i>
              {{ t('teacher.back_students') }}
            </button>
            <button type="button" class="btn btn-primary teacher-profile-hero__assign" @click="$emit('assign-revision', profile.student)">
              <i class="bi bi-journal-plus" aria-hidden="true"></i>
              {{ t('teacher.assign_revision') }}
            </button>
          </div>
        </div>
      </header>
      <TeacherStudentReport :open="Boolean(reportMode)" :mode="reportMode || 'parent'" :profile="profile" @close="reportMode = null" />

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
        <p v-if="profile.section !== section" class="teacher-loading-inline" role="status">{{ t('teacher.loading') }}</p>
        <template v-else>
        <TeacherStudentProfileOverview
          v-if="section === 'overview'"
          :profile="profile"
          :metric="metric"
          :practice-time="practiceTime"
          :session-label="sessionLabel"
          :format-when="formatWhen"
          @assign-revision="$emit('assign-revision', $event)"
          @change-section="$emit('change-section', $event)"
        />
        <TeacherStudentProfilePractice
          v-else-if="section === 'practice'"
          :profile="profile"
          :session-label="sessionLabel"
          :format-when="formatWhen"
          @assign-revision="$emit('assign-revision', $event)"
        />
        <TeacherStudentProfileAi
          v-else-if="section === 'ai'"
          :profile="profile"
          :issue-label="issueLabel"
          :format-when="formatWhen"
          @assign-revision="$emit('assign-revision', $event)"
        />
        <TeacherStudentProfileFocus
          v-else-if="section === 'focus'"
          :profile="profile"
          :format-when="formatWhen"
          @assign-revision="$emit('assign-revision', $event)"
          @mark-reviewed="$emit('mark-reviewed', $event)"
        />
        <TeacherStudentProfileTasks
          v-else-if="section === 'tasks'"
          :profile="profile"
          :format-when="formatWhen"
        />
        <TeacherStudentProfileMessages v-else-if="section === 'messages'" :profile="profile" :format-when="formatWhen" />
        </template>
      </div>
    </template>

    <TeacherEmpty v-else :message="t('teacher.student_unavailable')" />
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherStudentProfileAi from './profile/TeacherStudentProfileAi.vue'
import TeacherStudentProfileFocus from './profile/TeacherStudentProfileFocus.vue'
import TeacherStudentProfileOverview from './profile/TeacherStudentProfileOverview.vue'
import TeacherStudentProfilePractice from './profile/TeacherStudentProfilePractice.vue'
import TeacherStudentProfileTasks from './profile/TeacherStudentProfileTasks.vue'
import TeacherStudentProfileMessages from './profile/TeacherStudentProfileMessages.vue'
import TeacherStudentReport from './TeacherStudentReport.vue'

export default {
  name: 'TeacherStudentProfileSection',
  components: {
    TeacherEmpty,
    TeacherStudentProfileAi,
    TeacherStudentProfileFocus,
    TeacherStudentProfileOverview,
    TeacherStudentProfilePractice,
    TeacherStudentProfileTasks,
    TeacherStudentProfileMessages,
    TeacherStudentReport,
  },
  mixins: [i18nMixin],
  props: {
    profile: { type: Object, default: null },
    section: { type: String, required: true },
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
      reportMode: null,
    }
  },
  computed: {
    activeTabLabel() {
      const tab = this.tabs.find((item) => item.id === this.section)
      return tab ? this.t(tab.label) : this.t('teacher.tab_overview')
    },
    activeTabIcon() {
      return this.tabs.find((item) => item.id === this.section)?.icon || 'bi bi-grid'
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
    openReport(mode) { this.reportMode = mode },
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
