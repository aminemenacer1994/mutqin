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
            :active-view="navView"
            :show-account="false"
            nav-label-key="parent.nav_label"
            settings-label-key="parent.nav_settings"
            style="--dash-delay: 40ms"
            @select="openPrimaryView"
          />

          <div class="teacher-dashboard__main dash-reveal" style="--dash-delay: 80ms">
            <ParentChildContextBar
              v-if="showChildContext"
              :children="children"
              :selected-id="selectedChildId"
              :allow-all="childSelectorAllowsAll"
              @select="selectChild"
            />
            <div :key="view" class="teacher-view-stage">
              <ParentFamilyOverview
                v-if="view === 'overview'"
                :first-name="firstName"
                :children="children"
                :homework="visibleHomework"
                :feedback="visibleFeedback"
                :activity="visibleActivity"
                :message-unread="familyUnread"
                :attendance-alerts="visibleAttendanceAlerts"
                :selected-child-id="selectedChildId"
                @open-child="openChild"
                @open-learning="(id, assignmentId) => openLearning(id, assignmentId)"
                @open-messages="openMessages"
                @open-progress="openProgress"
                @open-settings="openView('settings')"
              />
              <ParentFamilyChildren
                v-else-if="view === 'children'"
                :children="children"
                :homework="shell?.homework || []"
                :activity="visibleActivity"
                :loading="loading && !shell"
                @open-learning="(id, assignmentId) => openLearning(id, assignmentId)"
                @open-progress="openProgress"
                @open-profile="openProfile"
                @open-messages="openMessages"
                @open-settings="openView('settings')"
              />
              <ParentChildMessages
                v-else-if="view === 'child-messages'"
                :children="children"
                :feedback="visibleFeedback"
                :child-id="selectedChildId"
                :parent-name="shell?.parent?.name || auth.name"
                :shared="messagesShared"
                @back="openView('children')"
                @open-learning="(id, assignmentId) => openLearning(id, assignmentId)"
                @unread-change="messageUnread = $event"
              />
              <ParentChildProfile
                v-else-if="view === 'child'"
                :profile="childProfile"
                :loading="profileLoading"
                :error="profileError"
                @reload="loadChildProfile"
                @back="openView('children')"
                @open-learning="(id, assignmentId) => openLearning(id || selectedChildId, assignmentId)"
                @open-progress="openProgress(selectedChildId)"
              />
              <ParentFamilyLearning
                v-else-if="view === 'learning'"
                :children="children"
                :rows="learningRows"
                :selected-id="selectedChildId"
                :focus-assignment-id="focusAssignmentId"
                :shared="assignmentsShared"
                :loading="learningLoading"
                :error="learningError"
                :truncated="learningTruncated"
                :filters="learningFilters"
                @select-child="selectChild"
                @filter="updateLearningFilters"
                @reload="loadLearningDetail"
                @focus-cleared="focusAssignmentId = null"
              />
              <ParentFamilyProgress
                v-else-if="view === 'progress'"
                :children="children"
                :selected-id="selectedChildId"
                :child-id="progressChildId"
                :learning="activeChildLearning"
                :shared="progressShared"
                :payload="progressPayload"
                :window="progressWindow"
                :loading="progressLoading"
                :error="progressError"
                :attendance="attendancePayload"
                :attendance-loading="attendanceLoading"
                :attendance-error="attendanceError"
                :attendance-shared="attendanceShared"
                @window="setProgressWindow"
                @reload="reloadProgressAndAttendance"
                @open-learning="(id, assignmentId) => openLearning(id, assignmentId)"
                @open-messages="openMessages"
                @open-reports="openReports"
              />
              <ParentFamilyMore
                v-else-if="view === 'more'"
                :children-count="children.length"
                :attention-count="shell?.summary?.needs_attention || 0"
                @open="openView"
              />
              <ParentFamilyReports
                v-else-if="view === 'reports'"
                :children="children"
                :selected-id="selectedChildId"
                @select-child="selectChild"
              />
              <ParentFamilyMessages
                v-else-if="view === 'messages'"
                :children="children"
                :feedback="visibleFeedback"
                :selected-id="selectedChildId"
                :parent-name="shell?.parent?.name || auth.name"
                :shared="messagesShared"
                @select-child="selectChild"
                @open-learning="(id, assignmentId) => openLearning(id, assignmentId)"
                @unread-change="messageUnread = $event"
              />
              <ParentFamilySettings
                v-else
                :parent-name="shell?.parent?.name || auth.name"
                :email="shell?.parent?.email || auth.email"
                :email-verified="auth.email_verified !== false"
                :profile-url="auth.profile_url || ''"
                :locale="auth.locale || 'en'"
                :theme="auth.theme || ''"
                :csrf-token="auth.csrf_token || ''"
                :children-count="children.length"
                :connection-links="connectionLinks"
                :invite-token="inviteToken"
                :link-code="linkCode"
                :acting="acting"
                :notice="actionNotice"
                :error="actionError"
                :platforms="platformForms"
                :switch-url="auth.platform_switch_url || ''"
                @open-children="openView('children')"
                @accept-invite="acceptInvite"
                @reject-invite="rejectInvite"
                @create-code="createCode"
                @update:invite-token="inviteToken = $event"
                @profile-updated="loadShell"
              />
            </div>
          </div>
        </div>

        <TeacherNav
          variant="mobile"
          :items="PARENT_NAV"
          :badges="navBadges"
          :active-view="navView"
          :show-account="false"
          nav-label-key="parent.nav_label"
          settings-label-key="parent.nav_settings"
          @select="openPrimaryView"
        />
      </template>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import { resetLearningFilters, sortLearningRows } from '../scripts/parent/familyLearning'
import TeacherNav from '../components/teacher/TeacherNav.vue'
import NetworkFallback from '../components/NetworkFallback.vue'
import ParentFamilyOverview from '../components/parent/ParentFamilyOverview.vue'
import ParentFamilyChildren from '../components/parent/ParentFamilyChildren.vue'
import ParentFamilyLearning from '../components/parent/ParentFamilyLearning.vue'
import ParentFamilyProgress from '../components/parent/ParentFamilyProgress.vue'
import ParentFamilyMessages from '../components/parent/ParentFamilyMessages.vue'
import ParentFamilySettings from '../components/parent/ParentFamilySettings.vue'
import ParentChildProfile from '../components/parent/ParentChildProfile.vue'
import ParentFamilyReports from '../components/parent/ParentFamilyReports.vue'
import ParentFamilyMore from '../components/parent/ParentFamilyMore.vue'
import ParentChildMessages from '../components/parent/ParentChildMessages.vue'
import ParentChildContextBar from '../components/parent/ParentChildContextBar.vue'
import {
  PARENT_CHILD_STORAGE_KEY,
  PARENT_NAV,
  PARENT_VIEWS,
  normalizeParentView,
  parentChildSelectorAllowsAll,
  parentNavActiveView,
} from '../scripts/parent/constants'
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
    ParentChildProfile,
    ParentFamilyReports,
    ParentFamilyMore,
    ParentChildMessages,
    ParentChildContextBar,
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
      learningFilters: { activity: null, status: 'all', from: '', to: '' },
      learningRows: [],
      learningLoading: false,
      learningError: false,
      progressWindow: 'week',
      progressPayload: null,
      progressLoading: false,
      progressError: false,
      childProfile: null,
      profileLoading: false,
      profileError: false,
      messageUnread: null,
      learningTruncated: false,
      focusAssignmentId: null,
      attendancePayload: null,
      attendanceLoading: false,
      attendanceError: false,
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
    connectionLinks() {
      return Array.isArray(this.shell?.connection_links) ? this.shell.connection_links : []
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
    visibleAttendanceAlerts() {
      const rows = Array.isArray(this.shell?.attendance_alerts) ? this.shell.attendance_alerts : []
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
    familyUnread() {
      return this.messageUnread === null
        ? Number(this.shell?.summary?.message_unread || 0)
        : this.messageUnread
    },
    navBadges() {
      const count = this.selectedChildId
        ? Number(this.visibleSummary.needs_attention || 0)
        : Number(this.shell?.summary?.needs_attention || 0)
      const unread = this.messageUnread === null
        ? Number(this.shell?.summary?.message_unread || 0)
        : this.messageUnread
      const badges = {}
      if (count > 0) badges.learning = count
      if (unread > 0) badges.messages = unread
      return badges
    },
    childSelectorAllowsAll() {
      return parentChildSelectorAllowsAll(this.view)
    },
    showChildContext() {
      return this.children.length > 0 && this.view !== 'settings'
    },
    activeChildLearning() {
      const id = this.progressChildId
      if (!id) return null
      return this.children.find((child) => child.id === id)?.learning || null
    },
    attendanceShared() {
      const child = this.progressChildId ? this.children.find((row) => row.id === this.progressChildId) : null
      return Boolean(child?.permissions?.attendance)
    },
    platformForms() {
      return Array.isArray(this.auth?.available_platforms) ? this.auth.available_platforms : []
    },
    progressShared() {
      const child = this.selectedChildId ? this.visibleChildren[0] : null
      return child ? Boolean(child.permissions?.progress) : this.children.some((row) => row.permissions?.progress)
    },
    progressChildId() {
      return this.selectedChildId || null
    },
    detailChildIds() {
      if (this.selectedChildId) return [this.selectedChildId]
      return this.children.filter((child) => child.permissions?.assignments).map((child) => child.id)
    },
    navView() {
      return parentNavActiveView(this.view)
    },
  },
  watch: {
    view(next) {
      if (next === 'learning') this.loadLearningDetail()
      if (next === 'progress') this.reloadProgressAndAttendance()
      if (next === 'child') this.loadChildProfile()
      if (next === 'progress' && !this.selectedChildId && this.children.length === 1) {
        this.selectedChildId = this.children[0].id
        this.persistChildSelection()
        this.syncUrl()
      }
    },
    selectedChildId() {
      if (this.view === 'learning') this.loadLearningDetail()
      if (this.view === 'progress') this.reloadProgressAndAttendance()
      if (this.view === 'child') this.loadChildProfile()
      this.persistChildSelection()
    },
  },
  mounted() {
    const pathMatch = window.location.pathname.match(/\/guardian\/children\/(\d+)\/messages\/?$/)
    if (pathMatch) {
      this.selectedChildId = Number(pathMatch[1])
      this.view = 'child-messages'
    } else if (/\/parent\/settings\/?$/.test(window.location.pathname)) {
      this.view = 'settings'
    } else if (/\/parent\/children\/?$/.test(window.location.pathname)) {
      this.view = 'children'
    } else {
      const params = new URLSearchParams(window.location.search)
      const view = params.get('view')
      if (view) this.view = normalizeParentView(view)
      const child = Number(params.get('child') || 0)
      if (child > 0) this.selectedChildId = child
      else {
        const stored = Number(sessionStorage.getItem(PARENT_CHILD_STORAGE_KEY) || 0)
        if (stored > 0) this.selectedChildId = stored
      }
    }
    this.loadShell().then(() => {
      this.ensureChildSelection()
    })
  },
  methods: {
    openPrimaryView(id) {
      this.openView(id)
    },
    openView(id) {
      const next = normalizeParentView(id)
      if (next !== 'learning') this.focusAssignmentId = null
      if (next === 'progress' && !this.selectedChildId && this.children.length === 1) {
        this.selectedChildId = this.children[0].id
      }
      this.view = next
      this.syncUrl()
    },
    selectChild(id) {
      this.selectedChildId = id || null
      this.persistChildSelection()
      this.syncUrl()
    },
    ensureChildSelection() {
      if (this.selectedChildId && !this.children.some((child) => child.id === this.selectedChildId)) {
        this.selectedChildId = null
      }
      if (this.children.length === 1) {
        this.selectedChildId = this.children[0].id
      }
      this.persistChildSelection()
      this.syncUrl()
    },
    persistChildSelection() {
      const id = Number(this.selectedChildId || 0)
      if (id > 0) sessionStorage.setItem(PARENT_CHILD_STORAGE_KEY, String(id))
      else sessionStorage.removeItem(PARENT_CHILD_STORAGE_KEY)
    },
    reloadProgressAndAttendance() {
      this.loadProgressDetail()
    },
    openChild(id) {
      this.selectedChildId = id
      this.openView('child')
    },
    openLearning(id, assignmentId = null) {
      const childId = id
        || this.selectedChildId
        || (this.children.length === 1 ? this.children[0].id : null)
      if (childId) this.selectedChildId = childId
      const focusId = assignmentId ? Number(assignmentId) : null
      this.learningFilters = resetLearningFilters()
      this.focusAssignmentId = focusId
      const alreadyLearning = this.view === 'learning'
      this.openView('learning')
      this.persistChildSelection()
      if (alreadyLearning) this.loadLearningDetail()
    },
    openProgress(id) {
      this.selectedChildId = id || this.selectedChildId || (this.children.length === 1 ? this.children[0].id : null)
      this.openView('progress')
    },
    openMessages(id) {
      this.selectedChildId = id
      this.openView('messages')
    },
    openReports(id) {
      this.selectedChildId = id || this.selectedChildId || (this.children.length === 1 ? this.children[0].id : null)
      this.openView('reports')
    },
    openProfile(id) {
      this.selectedChildId = id
      this.openView('child')
    },
    updateLearningFilters(filters) {
      this.learningFilters = filters
      this.loadLearningDetail()
    },
    setProgressWindow(window) {
      this.progressWindow = window
      this.loadProgressDetail()
    },
    async loadLearningDetail() {
      const ids = this.detailChildIds
      if (!ids.length || this.view !== 'learning') return
      this.learningLoading = true
      this.learningError = false
      try {
        const rows = []
        let truncated = false
        for (const id of ids) {
          const { data } = await axios.get(`${this.auth.api_url}/children/${id}/assignments`, {
            params: {
              activity: this.learningFilters.activity || undefined,
              status: this.learningFilters.status,
              from: this.learningFilters.from || undefined,
              to: this.learningFilters.to || undefined,
            },
            headers: { Accept: 'application/json' },
          })
          rows.push(...(data.assignments || []))
          truncated = truncated || Boolean(data.truncated)
        }
        this.learningRows = sortLearningRows(rows)
        this.learningTruncated = truncated
        if (this.focusAssignmentId) {
          const match = this.learningRows.find((row) => Number(row.id) === Number(this.focusAssignmentId))
          if (!match) this.focusAssignmentId = null
        }
      } catch {
        this.learningError = true
        this.learningRows = []
      } finally {
        this.learningLoading = false
      }
    },
    async loadAttendanceDetail() {
      const id = this.progressChildId
      if (!id || this.view !== 'progress') return
      if (!this.attendanceShared) {
        this.attendancePayload = null
        this.attendanceError = false
        return
      }
      this.attendanceLoading = true
      this.attendanceError = false
      try {
        const bounds = this.progressPayload || {}
        const { data } = await axios.get(`${this.auth.api_url}/children/${id}/attendance`, {
          params: {
            from: bounds.from ? String(bounds.from).slice(0, 10) : undefined,
            to: bounds.to ? String(bounds.to).slice(0, 10) : undefined,
          },
          headers: { Accept: 'application/json' },
        })
        this.attendancePayload = data
      } catch {
        this.attendanceError = true
        this.attendancePayload = null
      } finally {
        this.attendanceLoading = false
      }
    },
    async loadProgressDetail() {
      const id = this.progressChildId
      if (!id || this.view !== 'progress') return
      this.progressLoading = true
      this.progressError = false
      try {
        const { data } = await axios.get(`${this.auth.api_url}/children/${id}/progress`, {
          params: { window: this.progressWindow },
          headers: { Accept: 'application/json' },
        })
        this.progressPayload = data
        if (this.attendanceShared) this.loadAttendanceDetail()
      } catch {
        this.progressError = true
        this.progressPayload = null
      } finally {
        this.progressLoading = false
      }
    },
    async loadChildProfile() {
      const id = this.selectedChildId
      if (!id || this.view !== 'child') return
      this.profileLoading = true
      this.profileError = false
      try {
        const { data } = await axios.get(`${this.auth.api_url}/children/${id}/profile`, {
          headers: { Accept: 'application/json' },
        })
        this.childProfile = data
      } catch {
        this.profileError = true
        this.childProfile = null
      } finally {
        this.profileLoading = false
      }
    },
    syncUrl() {
      if (this.view === 'child-messages' && this.selectedChildId) {
        const path = `/guardian/children/${this.selectedChildId}/messages`
        window.history.replaceState({}, '', path)
        return
      }
      if (this.view === 'settings') {
        window.history.replaceState({}, '', '/parent/settings')
        return
      }
      if (this.view === 'children' && !this.selectedChildId) {
        window.history.replaceState({}, '', '/parent/children')
        return
      }
      const url = new URL(window.location.origin + '/parent')
      if (this.view !== 'overview') url.searchParams.set('view', this.view)
      else url.searchParams.delete('view')
      if (this.selectedChildId && this.view !== 'child-messages') url.searchParams.set('child', String(this.selectedChildId))
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
        this.messageUnread = null
        this.ensureChildSelection()
        if (this.view === 'learning') this.loadLearningDetail()
        if (this.view === 'progress') this.reloadProgressAndAttendance()
        if (this.view === 'child') this.loadChildProfile()
      } catch {
        this.error = true
      } finally {
        this.loading = false
      }
    },
  },
}
</script>
