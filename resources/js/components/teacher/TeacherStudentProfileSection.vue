<template>
  <section class="teacher-stack teacher-profile">
    <div v-if="loading" class="teacher-skeletons"><div class="teacher-skeleton"></div></div>

    <template v-else-if="profile">
      <header class="card teacher-profile-hero teacher-profile-hero--compact">
        <div class="card-body teacher-profile-hero__body">
          <div class="teacher-profile-hero__identity">
            <span class="teacher-profile-hero__avatar" aria-hidden="true">{{ studentInitial(profile.student.name) }}</span>
            <div class="teacher-profile-hero__copy">
              <p class="teacher-profile-hero__eyebrow">{{ t('teacher.student_profile') }}</p>
              <h2>{{ profile.student.name }}</h2>
              <p class="teacher-meta">
                <i class="bi bi-building" aria-hidden="true"></i>
                {{ profile.student.organisation || t('teacher.no_group') }}
                <template v-if="profile.student.groups?.length"> · {{ profile.student.groups.map((group) => group.name).join(', ') }}</template>
              </p>
            </div>
          </div>
          <div class="teacher-profile-hero__actions">
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

      <header class="teacher-profile-section-head">
        <div>
          <p>{{ t('teacher.student_learning_record') }}</p>
          <h3>{{ activeTabLabel }}</h3>
        </div>
        <span>{{ sectionHint }}</span>
      </header>

      <div :id="panelId" class="card teacher-tab-panel teacher-profile-stack" role="tabpanel" :aria-labelledby="tabId(section)" tabindex="0">
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
        />
        <TeacherStudentProfileAi
          v-else-if="section === 'ai'"
          :profile="profile"
          :issue-label="issueLabel"
          :format-when="formatWhen"
        />
        <TeacherStudentProfileWeak
          v-else-if="section === 'weak'"
          :profile="profile"
          :format-when="formatWhen"
          @assign-revision="$emit('assign-revision', $event)"
        />
        <TeacherStudentProfileRevision
          v-else-if="section === 'revision'"
          :profile="profile"
          :comparisons="comparisons"
          :format-when="formatWhen"
        />
        <TeacherStudentProfileTasks
          v-else-if="section === 'tasks'"
          :profile="profile"
          :format-when="formatWhen"
        />
      </div>
    </template>

    <TeacherEmpty v-else :message="t('teacher.student_unavailable')" />
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherStudentProfileAi from './profile/TeacherStudentProfileAi.vue'
import TeacherStudentProfileOverview from './profile/TeacherStudentProfileOverview.vue'
import TeacherStudentProfilePractice from './profile/TeacherStudentProfilePractice.vue'
import TeacherStudentProfileRevision from './profile/TeacherStudentProfileRevision.vue'
import TeacherStudentProfileTasks from './profile/TeacherStudentProfileTasks.vue'
import TeacherStudentProfileWeak from './profile/TeacherStudentProfileWeak.vue'

export default {
  name: 'TeacherStudentProfileSection',
  components: {
    TeacherEmpty,
    TeacherStudentProfileAi,
    TeacherStudentProfileOverview,
    TeacherStudentProfilePractice,
    TeacherStudentProfileRevision,
    TeacherStudentProfileTasks,
    TeacherStudentProfileWeak,
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
  emits: ['back', 'change-section', 'assign-revision'],
  data() {
    const uid = Math.random().toString(36).slice(2, 9)
    return {
      tabsId: `teacher-profile-tabs-${uid}`,
      panelId: `teacher-profile-panel-${uid}`,
      tabPrefix: `teacher-profile-tab-${uid}`,
    }
  },
  watch: {
    section() {
      this.$nextTick(this.revealActiveTab)
    },
    profile() {
      this.$nextTick(this.revealActiveTab)
    },
  },
  computed: {
    activeTabLabel() {
      const tab = this.tabs.find((item) => item.id === this.section)
      return tab ? this.t(tab.label) : this.t('teacher.tab_overview')
    },
    sectionHint() {
      const keys = {
        overview: 'teacher.profile_tab_overview_hint',
        practice: 'teacher.profile_tab_practice_hint',
        ai: 'teacher.profile_tab_ai_hint',
        weak: 'teacher.profile_tab_weak_hint',
        revision: 'teacher.profile_tab_revision_hint',
        tasks: 'teacher.profile_tab_tasks_hint',
      }
      return this.t(keys[this.section] || keys.overview)
    },
  },
  methods: {
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
