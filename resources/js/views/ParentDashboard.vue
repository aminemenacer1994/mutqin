<template>
  <div
    v-if="featuresEnabled"
    class="user-dashboard teacher-dashboard"
    data-platform-shell="parent"
    tabindex="-1"
  >
    <div class="container user-dashboard__shell teacher-dashboard__shell">
      <div v-if="loading && !shell" class="teacher-skeletons" role="status" aria-live="polite">
        <div v-for="n in 4" :key="n" class="teacher-skeleton"></div>
        <span class="visually-hidden">{{ t('parent.loading') }}</span>
      </div>

      <NetworkFallback
        v-else-if="error && !shell"
        class="user-dashboard__error"
        page
        :auto-retry-on-reconnect="false"
        home-href="/"
        @retry="loadShell"
      />

      <template v-else>
        <div class="teacher-dashboard__layout">
          <TeacherNav
            variant="desktop"
            :items="PARENT_NAV"
            :badges="navBadges"
            :active-view="view"
            nav-label-key="parent.nav_label"
            settings-label-key="parent.nav_settings"
            style="--dash-delay: 40ms"
            @select="openView"
          />

          <div class="teacher-dashboard__main dash-reveal" style="--dash-delay: 80ms">
            <div :key="view" class="teacher-view-stage">
              <ParentFamilyOverview
                v-if="view === 'overview'"
                :first-name="firstName"
                :children="visibleChildren"
                :summary="visibleSummary"
                :homework="visibleHomework"
                :activity="visibleActivity"
                :feedback="visibleFeedback"
                :selected-id="selectedChildId"
                @select-child="selectChild"
                @select-kpi="openKpi"
                @open-child="openChild"
                @open-learning="openLearning"
                @open-messages="openMessages"
              />
              <ParentFamilyChildren
                v-else-if="view === 'children'"
                :children="visibleChildren"
                :all-children="children"
                :selected-id="selectedChildId"
                @select-child="selectChild"
                @open-learning="openLearning"
                @open-progress="openProgress"
                @open-messages="openMessages"
              />
              <ParentFamilyLearning
                v-else-if="view === 'learning'"
                :children="children"
                :homework="visibleHomework"
                :selected-id="selectedChildId"
                :shared="assignmentsShared"
                @select-child="selectChild"
              />
              <ParentFamilyProgress
                v-else-if="view === 'progress'"
                :children="visibleChildren"
                :all-children="children"
                :selected-id="selectedChildId"
                @select-child="selectChild"
                @open-learning="openLearning"
              />
              <ParentFamilyMessages
                v-else-if="view === 'messages'"
                :children="children"
                :feedback="visibleFeedback"
                :selected-id="selectedChildId"
                :shared="messagesShared"
                @select-child="selectChild"
              />
              <ParentFamilySettings
                v-else
                :parent-name="shell?.parent?.name || auth.name"
                :email="shell?.parent?.email || auth.email"
                :profile-url="auth.profile_url || ''"
                :children-count="children.length"
                :invite-token="inviteToken"
                :link-code="linkCode"
                :acting="acting"
                :notice="actionNotice"
                :error="actionError"
                :platforms="platformForms"
                :switch-url="auth.platform_switch_url || ''"
                :csrf-token="auth.csrf_token || ''"
                @open-children="openView('children')"
                @accept-invite="acceptInvite"
                @reject-invite="rejectInvite"
                @create-code="createCode"
                @update:invite-token="inviteToken = $event"
              />
            </div>
          </div>
        </div>

        <TeacherNav
          variant="mobile"
          :items="PARENT_NAV"
          :badges="navBadges"
          :active-view="view"
          nav-label-key="parent.nav_label"
          settings-label-key="parent.nav_settings"
          @select="openView"
        />
      </template>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import TeacherNav from '../components/teacher/TeacherNav.vue'
import NetworkFallback from '../components/NetworkFallback.vue'
import ParentFamilyOverview from '../components/parent/ParentFamilyOverview.vue'
import ParentFamilyChildren from '../components/parent/ParentFamilyChildren.vue'
import ParentFamilyLearning from '../components/parent/ParentFamilyLearning.vue'
import ParentFamilyProgress from '../components/parent/ParentFamilyProgress.vue'
import ParentFamilyMessages from '../components/parent/ParentFamilyMessages.vue'
import ParentFamilySettings from '../components/parent/ParentFamilySettings.vue'
import { PARENT_NAV, PARENT_VIEWS } from '../scripts/parent/constants'
import { i18nMixin } from '../mixins/i18nMixin'

export default {
  name: 'ParentDashboard',
  components: {
    TeacherNav,
    NetworkFallback,
    ParentFamilyOverview,
    ParentFamilyChildren,
    ParentFamilyLearning,
    ParentFamilyProgress,
    ParentFamilyMessages,
    ParentFamilySettings,
  },
  mixins: [i18nMixin],
  props: {
    auth: { type: Object, required: true },
  },
  data() {
    return {
      PARENT_NAV,
      view: 'overview',
      selectedChildId: null,
      loading: true,
      error: false,
      shell: null,
      acting: false,
      actionNotice: '',
      actionError: '',
      inviteToken: '',
      linkCode: '',
    }
  },
  computed: {
    featuresEnabled() {
      return Boolean(this.auth?.parent_features_enabled)
    },
    firstName() {
      const name = String(this.shell?.parent?.name || this.auth?.name || '').trim()
      return name.split(/\s+/)[0] || name || 'Parent'
    },
    children() {
      return Array.isArray(this.shell?.children) ? this.shell.children : []
    },
    visibleChildren() {
      if (!this.selectedChildId) return this.children
      return this.children.filter((child) => child.id === this.selectedChildId)
    },
    visibleHomework() {
      const rows = Array.isArray(this.shell?.homework) ? this.shell.homework : []
      if (!this.selectedChildId) return rows
      return rows.filter((row) => row.child_id === this.selectedChildId)
    },
    visibleActivity() {
      const rows = Array.isArray(this.shell?.activity) ? this.shell.activity : []
      if (!this.selectedChildId) return rows
      return rows.filter((row) => row.child_id === this.selectedChildId)
    },
    visibleFeedback() {
      const rows = Array.isArray(this.shell?.feedback) ? this.shell.feedback : []
      if (!this.selectedChildId) return rows
      return rows.filter((row) => row.child_id === this.selectedChildId)
    },
    visibleSummary() {
      const summary = this.shell?.summary || {}
      if (!this.selectedChildId) return summary
      const child = this.visibleChildren[0]
      const assignments = child?.assignments
      return {
        ...summary,
        children: this.visibleChildren.length,
        active_assignments: assignments?.active ?? 0,
        completed_assignments: assignments?.completed ?? 0,
        needs_attention: assignments?.needs_attention ?? 0,
        assignments_shared: Boolean(child?.permissions?.assignments),
        progress_shared: Boolean(child?.permissions?.progress),
        messages_shared: Boolean(child?.permissions?.messages),
      }
    },
    assignmentsShared() {
      if (this.selectedChildId) return Boolean(this.visibleChildren[0]?.permissions?.assignments)
      return Boolean(this.shell?.summary?.assignments_shared)
    },
    messagesShared() {
      if (this.selectedChildId) return Boolean(this.visibleChildren[0]?.permissions?.messages)
      return Boolean(this.shell?.summary?.messages_shared)
    },
    navBadges() {
      const count = this.selectedChildId
        ? Number(this.visibleSummary.needs_attention || 0)
        : Number(this.shell?.summary?.needs_attention || 0)
      return count > 0 ? { learning: count } : {}
    },
    platformForms() {
      return Array.isArray(this.auth?.available_platforms) ? this.auth.available_platforms : []
    },
  },
  mounted() {
    const params = new URLSearchParams(window.location.search)
    const view = params.get('view')
    if (PARENT_VIEWS.includes(view)) this.view = view
    const child = Number(params.get('child') || 0)
    if (child > 0) this.selectedChildId = child
    this.loadShell()
  },
  methods: {
    openView(id) {
      this.view = PARENT_VIEWS.includes(id) ? id : 'overview'
      this.syncUrl()
    },
    selectChild(id) {
      this.selectedChildId = id || null
      this.syncUrl()
    },
    openChild(id) {
      this.selectedChildId = id
      this.openView('children')
    },
    openLearning(id) {
      this.selectedChildId = id
      this.openView('learning')
    },
    openProgress(id) {
      this.selectedChildId = id
      this.openView('progress')
    },
    openMessages(id) {
      this.selectedChildId = id
      this.openView('messages')
    },
    openKpi(key) {
      if (key === 'children') this.openView('children')
      else if (key === 'attention' || key === 'active' || key === 'completed') this.openView('learning')
    },
    syncUrl() {
      const url = new URL(window.location.href)
      url.searchParams.set('view', this.view)
      if (this.selectedChildId) url.searchParams.set('child', String(this.selectedChildId))
      else url.searchParams.delete('child')
      window.history.replaceState({}, '', url)
    },
    async acceptInvite() {
      await this.postInvite('accept', 'parent.invite_accepted')
    },
    async rejectInvite() {
      await this.postInvite('reject', 'parent.invite_rejected')
    },
    async postInvite(action, noticeKey) {
      this.acting = true
      this.actionNotice = ''
      this.actionError = ''
      try {
        await axios.post(`${this.auth.api_url}/invitations/${action}`, { token: this.inviteToken })
        this.inviteToken = ''
        this.actionNotice = this.t(noticeKey)
        await this.loadShell()
      } catch (error) {
        this.actionError = error?.response?.data?.errors?.token?.[0] || this.t('parent.invite_failed')
      } finally {
        this.acting = false
      }
    },
    async createCode() {
      this.acting = true
      this.actionNotice = ''
      this.actionError = ''
      try {
        const { data } = await axios.post(`${this.auth.api_url}/link-codes`)
        this.linkCode = data.code || ''
        this.actionNotice = this.t('parent.code_once')
      } catch (error) {
        this.actionError = error?.response?.data?.errors?.code?.[0] || this.t('parent.code_failed')
      } finally {
        this.acting = false
      }
    },
    async loadShell() {
      this.loading = this.shell === null
      this.error = false
      try {
        const { data } = await axios.get(`${this.auth.api_url}/shell`, {
          headers: { Accept: 'application/json' },
        })
        this.shell = data
        if (this.selectedChildId && !this.children.some((child) => child.id === this.selectedChildId)) {
          this.selectedChildId = null
          this.syncUrl()
        }
      } catch {
        this.error = true
      } finally {
        this.loading = false
      }
    },
  },
}
</script>
