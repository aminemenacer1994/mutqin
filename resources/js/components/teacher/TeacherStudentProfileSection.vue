<template>
  <section class="teacher-stack teacher-profile">
    <div v-if="loading" class="teacher-skeletons"><div class="teacher-skeleton"></div></div>

    <template v-else-if="profile">
      <header class="card teacher-profile-hero teacher-profile-hero--compact">
        <div class="card-body teacher-profile-hero__body">
          <div class="teacher-profile-hero__identity">
            <span class="teacher-profile-hero__avatar" aria-hidden="true">{{ studentInitial(profile.student.name) }}</span>
            <div class="teacher-profile-hero__copy">
              <h2>{{ profile.student.name }}</h2>
              <div class="teacher-profile-summary">
                <span v-if="profile.student.organisation">{{ profile.student.organisation }}</span>
                <TeacherWordingMatch v-if="typeof profile.meta?.ai_success_rate === 'number'">{{ t('teacher.profile_recite_avg_with_count', { score: profile.meta.ai_success_rate, count: Number(profile.meta.ai_attempts || 0) }) }}</TeacherWordingMatch>
                <span v-if="learningPlanLabel">{{ learningPlanLabel }}</span>
              </div>
            </div>
          </div>
          <div class="teacher-profile-hero__actions">
            <button type="button" class="btn btn-outline-secondary btn-sm" @click="requestBack">
              <i class="bi bi-arrow-left" aria-hidden="true"></i> {{ t('teacher.back_to_students') }}
            </button>
            <button type="button" class="btn btn-outline-secondary btn-sm" @click="selectTab('messages')">
              <i class="bi bi-chat-dots" aria-hidden="true"></i> {{ t('teacher.message_student') }}
            </button>
            <button type="button" class="btn btn-primary btn-sm teacher-profile-hero__assign" @click="$emit('assign-revision', profile.student)">
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
          <span v-if="tabCount(tab.id)" class="teacher-tabs__count">{{ tabCount(tab.id) }}</span>
        </button>
      </div>

      <div :id="panelId" class="card teacher-tab-panel teacher-profile-stack" :class="`is-${section}`" role="tabpanel" :aria-labelledby="tabId(section)" tabindex="0">
        <p v-if="sectionRefreshing" class="teacher-loading-inline" role="status">{{ t('teacher.loading') }}</p>
        <div v-if="tabHint" class="teacher-profile-tab-meta">
          <p class="teacher-profile-tab-meta__hint">{{ tabHint }}</p>
        </div>
        <TeacherStudentProfileAi
          v-if="section === 'ai'"
          :profile="tabProfile"
          :issue-label="issueLabel"
          :format-when="formatWhen"
          :focus-attempt-id="taskFocus && taskFocus.attemptId ? taskFocus.attemptId : null"
          @assign-revision="$emit('assign-revision', $event)"
          @clear-focus="$emit('clear-focus')"
          @reviewed="$emit('refresh')"
        />
        <TeacherStudentProfilePlan
          v-else-if="section === 'plan' && profile.student"
          :student-id="profile.student.id"
          :student-name="profile.student.name"
          :hifz="profile.meta?.hifz || null"
          :profile="tabProfile"
          :format-when="formatWhen"
          @open-task="openTask"
          @assign-next="$emit('assign-revision', $event)"
          @updated="$emit('refresh')"
        />
        <TeacherStudentProfilePractice
          v-else-if="section === 'revision'"
          :profile="tabProfile"
          :focus-payload="tabProfile.payload"
          :session-label="sessionLabel"
          :issue-label="issueLabel"
          :format-when="formatWhen"
          :memorisation-url="memorisationUrl"
          initial-subview="revision"
          @assign-revision="$emit('assign-revision', $event)"
          @mark-reviewed="openReviewConfirm"
          @open-task="openTask"
          @clear-focus="$emit('clear-focus')"
          @refresh="$emit('refresh')"
        />
        <TeacherStudentProfileAttendance
          v-else-if="section === 'attendance'"
          :profile="tabProfile"
          :format-when="formatWhen"
        />
        <TeacherStudentProfileGuardians
          v-else-if="section === 'guardians' && profile.student"
          :student-id="Number(profile.student.id)"
        />
        <KeepAlive>
          <TeacherStudentProfileTasks
            v-if="section === 'tasks'"
            key="student-tasks"
            :profile="tabProfile"
            :format-when="formatWhen"
            :focus-task-id="resolvedFocusTaskId"
            :initial-filter="taskFocus && taskFocus.filter ? taskFocus.filter : ''"
            :ready="!sectionRefreshing"
            :return-to-messages="messageReturn"
            @assign-revision="$emit('assign-revision', $event)"
            @refresh="$emit('refresh')"
            @edit-task="$emit('edit-task', $event)"
            @open-messages="openMessages"
            @open-plan="selectTab('plan')"
            @return-to-messages="returnToMessages"
            @unsent-change="unsent.tasks = $event"
          />
          <div v-else-if="section === 'messages'" key="student-messages" class="teacher-stack teacher-messages-inbox">
            <div class="teacher-messages-desk__tabs teacher-profile-messages__tabs" role="tablist" :aria-label="t('teacher.messages')">
              <button
                type="button"
                role="tab"
                class="teacher-messages-desk__tab"
                :class="{ 'is-active': messageSubTab === 'student' }"
                :aria-selected="messageSubTab === 'student' ? 'true' : 'false'"
                @click="messageSubTab = 'student'"
              >
                {{ t('teacher.messages_tab_students') }}
                <span v-if="messageUnread" class="teacher-nav__badge">{{ messageUnread }}</span>
              </button>
              <button
                type="button"
                role="tab"
                class="teacher-messages-desk__tab"
                :class="{ 'is-active': messageSubTab === 'parent' }"
                :aria-selected="messageSubTab === 'parent' ? 'true' : 'false'"
                @click="messageSubTab = 'parent'"
              >
                {{ t('teacher.messages_tab_parents') }}
              </button>
            </div>
            <TeacherStudentProfileMessages
              v-show="messageSubTab === 'student'"
              :profile="tabProfile"
              :format-when="formatWhen"
              :task-context="messageContext"
              embedded-in-tabs
              @open-task="openTask"
              @open-tasks="selectTab('tasks')"
              @open-recitations="selectTab('ai')"
              @clear-context="messageContext = null"
              @unsent-change="unsent.messages = $event"
              @unread-change="messageUnread = $event"
              @marked-read="$emit('refresh')"
              @sent="$emit('refresh')"
            />
            <TeacherStudentGuardianThreads
              v-if="messageSubTab === 'parent' && tabProfile && tabProfile.student && tabProfile.student.id"
              :student-id="Number(tabProfile.student.id)"
              :student-name="tabProfile.student.name || ''"
              embedded-in-tabs
            />
          </div>
        </KeepAlive>
      </div>
    </template>

    <TeacherEmpty v-else :message="t('teacher.student_unavailable')" />

    <TeacherDialog
      :open="leaveConfirm"
      size="sm"
      :title="t('teacher.unsaved_changes')"
      :close-label="t('teacher.close')"
      @close="leaveConfirm = false"
    >
      <p class="mb-0">{{ t('teacher.leave_unsaved') }}</p>
      <template #footer>
        <button type="button" class="btn btn-outline-secondary" @click="leaveConfirm = false">{{ t('teacher.keep_editing') }}</button>
        <button type="button" class="btn btn-danger" @click="confirmLeave">{{ t('teacher.leave_anyway') }}</button>
      </template>
    </TeacherDialog>

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
import { resolveTaskLifecycle, TASK_LIFECYCLE, taskIsOverdue } from '../../scripts/teacher/taskState'
import TeacherDialog from './TeacherDialog.vue'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherStudentProfileAi from './profile/TeacherStudentProfileAi.vue'
import TeacherStudentProfilePlan from './profile/TeacherStudentProfilePlan.vue'
import TeacherStudentProfilePractice from './profile/TeacherStudentProfilePractice.vue'
import TeacherStudentProfileTasks from './profile/TeacherStudentProfileTasks.vue'
import TeacherStudentProfileMessages from './profile/TeacherStudentProfileMessages.vue'
import TeacherStudentGuardianThreads from './profile/TeacherStudentGuardianThreads.vue'
import TeacherStudentProfileAttendance from './profile/TeacherStudentProfileAttendance.vue'
import TeacherStudentProfileGuardians from './profile/TeacherStudentProfileGuardians.vue'
import TeacherWordingMatch from './TeacherWordingMatch.vue'

export default {
  name: 'TeacherStudentProfileSection',
  components: {
    TeacherDialog,
    TeacherEmpty,
    TeacherStudentProfileAi,
    TeacherStudentProfilePlan,
    TeacherStudentProfilePractice,
    TeacherStudentProfileTasks,
    TeacherStudentProfileMessages,
    TeacherStudentGuardianThreads,
    TeacherStudentProfileAttendance,
    TeacherStudentProfileGuardians,
    TeacherWordingMatch,
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
    memorisationUrl: { type: String, default: '/memorisation' },
    taskFocus: { type: Object, default: null },
  },
  emits: ['back', 'change-section', 'assign-revision', 'mark-reviewed', 'refresh', 'edit-task', 'clear-focus'],
  data() {
    const uid = Math.random().toString(36).slice(2, 9)
    return {
      tabsId: `teacher-profile-tabs-${uid}`,
      panelId: `teacher-profile-panel-${uid}`,
      tabPrefix: `teacher-profile-tab-${uid}`,
      reviewConfirm: null,
      leaveConfirm: false,
      focusTaskId: null,
      messageContext: null,
      messageReturn: false,
      unsent: { tasks: false, messages: false },
      messageUnread: null,
      messageSubTab: 'student',
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
    resolvedFocusTaskId() {
      return this.taskFocus?.taskId || this.focusTaskId
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
    learningPlanLabel() {
      const plan = this.profile?.meta?.learning_plan
      if (!plan?.status) return ''
      const key = `teacher.plan_status_${plan.status}`
      const status = this.t(key)
      const label = status && status !== key ? status : plan.status
      return plan.title ? `${plan.title} · ${label}` : label
    },
    taskAttentionCount() {
      const tasks = this.profile?.sectionPayloads?.tasks?.assignments
      if (Array.isArray(tasks)) {
        return tasks.filter((item) => {
          const lifecycle = resolveTaskLifecycle(item)
          return lifecycle === TASK_LIFECYCLE.NEEDS_REVIEW
            || lifecycle === TASK_LIFECYCLE.SUBMITTED
            || taskIsOverdue(item)
        }).length
      }
      return Number(this.profile?.meta?.assignments_needs_review || 0) + Number(this.profile?.meta?.assignments_overdue || 0)
    },
    messageAttentionCount() {
      if (this.messageUnread !== null) return this.messageUnread
      const messages = this.profile?.sectionPayloads?.messages?.messages
      if (Array.isArray(messages)) {
        return messages.filter((message) => message?.unread && message?.sender !== 'teacher').length
      }
      return Number(this.profile?.meta?.unread_messages || 0)
    },
  },
  watch: {
    section(next) {
      if (next === 'messages') this.messageSubTab = 'student'
      this.$nextTick(this.revealActiveTab)
    },
    profile(next, previous) {
      if (next?.student?.id !== previous?.student?.id) {
        this.messageUnread = null
        this.messageSubTab = 'student'
      }
      this.$nextTick(this.revealActiveTab)
    },
  },
  methods: {
    tabCount(id) {
      if (id === 'tasks') return this.taskAttentionCount
      if (id === 'messages') return this.messageAttentionCount
      return 0
    },
    requestBack() {
      if (this.unsent.tasks || this.unsent.messages) {
        this.leaveConfirm = true
        return
      }
      this.$emit('back')
    },
    confirmLeave() {
      this.leaveConfirm = false
      this.unsent = { tasks: false, messages: false }
      this.$emit('back')
    },
    openMessages(context) {
      this.messageContext = context?.title ? context : null
      this.selectTab('messages')
    },
    openTask(context) {
      const fromMessages = this.section === 'messages'
      this.$emit('clear-focus')
      const id = context?.recipientId || context?.assignmentId || null
      this.focusTaskId = null
      this.$nextTick(() => { this.focusTaskId = id })
      this.selectTab('tasks')
      this.messageReturn = fromMessages
    },
    returnToMessages() {
      this.messageReturn = false
      this.selectTab('messages')
    },
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
      if (id !== 'tasks') this.messageReturn = false
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
