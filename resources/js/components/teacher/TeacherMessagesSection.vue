<template>
  <section class="teacher-stack teacher-messages-desk">
    <header class="teacher-page-header teacher-page-header--actions">
      <div>
        <p class="teacher-kicker">{{ t('teacher.workspace_label') }}</p>
        <h1 class="teacher-page-header__title">{{ t('teacher.messages') }}</h1>
      </div>
      <div class="teacher-page-header__aside d-flex flex-wrap align-items-center gap-2">
        <span class="teacher-page-count">{{ students.length }} {{ t('teacher.kpi_students') }}</span>
      </div>
    </header>

    <div class="teacher-toolbar teacher-toolbar--filters teacher-toolbar--notion teacher-messages-toolbar d-flex flex-wrap align-items-center gap-2">
      <label v-if="activeTab === 'students'" class="input-group teacher-search teacher-search--compact flex-grow-1">
        <span class="visually-hidden">{{ t('teacher.student_search_placeholder') }}</span>
        <span class="input-group-text"><i class="bi bi-search" aria-hidden="true"></i></span>
        <input
          v-model="studentQuery"
          class="form-control"
          type="search"
          :placeholder="t('teacher.student_search_placeholder')"
          autocomplete="off"
        >
      </label>
      <div class="teacher-task-filter-shell" :class="{ 'teacher-messages-toolbar__tabs--solo': activeTab === 'parents' }">
        <div class="btn-group btn-group-sm teacher-task-filters flex-wrap" role="tablist" :aria-label="t('teacher.messages')">
          <button
            type="button"
            role="tab"
            class="btn btn-outline-secondary btn-sm"
            :class="{ 'is-active': activeTab === 'students' }"
            :aria-selected="activeTab === 'students' ? 'true' : 'false'"
            @click="activeTab = 'students'"
          >
            {{ t('teacher.messages_tab_students') }}
            <span v-if="studentUnreadTotal" class="teacher-task-filter__count">{{ studentUnreadTotal }}</span>
          </button>
          <button
            type="button"
            role="tab"
            class="btn btn-outline-secondary btn-sm"
            :class="{ 'is-active': activeTab === 'parents' }"
            :aria-selected="activeTab === 'parents' ? 'true' : 'false'"
            @click="openParentsTab"
          >
            {{ t('teacher.messages_tab_parents') }}
            <span v-if="parentUnreadTotal" class="teacher-task-filter__count">{{ parentUnreadTotal }}</span>
          </button>
        </div>
      </div>
    </div>
    <p class="teacher-messages-desk__hint">{{ messagesDeskHint }}</p>

    <TeacherSectionPane v-if="loading && !students.length" flat>
      <div class="teacher-skeletons" role="status">
        <div v-for="n in 4" :key="n" class="teacher-skeleton"></div>
        <span class="visually-hidden">{{ t('teacher.loading') }}</span>
      </div>
    </TeacherSectionPane>

    <div
      v-else
      class="teacher-messages-desk__workspace"
      :class="{
        'is-detail-open': Boolean(activeStudent) || Boolean(activeParent),
        'teacher-messages-desk__workspace--students': activeTab === 'students',
        'teacher-messages-desk__workspace--parents': activeTab === 'parents',
      }"
    >
      <aside class="teacher-messages-desk__inbox" :aria-label="inboxLabel">
        <TeacherEmpty
          v-if="activeTab === 'students' && !students.length"
          illustrated
          icon="bi bi-chat-dots"
          :message="t('teacher.direct_messages_empty')"
        />
        <template v-else-if="activeTab === 'students'">
          <ul class="teacher-activity-list teacher-messages-desk__list">
            <li v-for="student in visibleStudents" :key="student.id">
              <button
                type="button"
                class="teacher-activity-list__row"
                :aria-current="Number(activeStudentId) === Number(student.id) ? 'true' : null"
                @click="selectStudent(student)"
              >
                <span class="teacher-activity-list__avatar" aria-hidden="true">{{ initials(student.name) }}</span>
                <span class="teacher-activity-list__copy">
                  <strong>{{ student.name }}</strong>
                  <small>{{ t('teacher.messages_context') }}</small>
                </span>
                <span v-if="studentUnread(student)" class="teacher-pill is-flagged">{{ studentUnread(student) }}</span>
                <i v-else class="bi bi-chevron-right teacher-activity-list__action" aria-hidden="true"></i>
              </button>
            </li>
          </ul>
        </template>
        <template v-else>
          <p v-if="parentLoading" class="teacher-meta" role="status">{{ t('teacher.loading') }}</p>
          <p v-else-if="parentLoadError" class="alert alert-danger" role="alert">{{ parentLoadError }}</p>
          <TeacherEmpty
            v-else-if="!parentThreads.length"
            illustrated
            icon="bi bi-people"
            :message="t('teacher.guardian_messages_empty')"
          />
          <ul v-else class="teacher-activity-list teacher-messages-desk__list">
            <li v-for="row in parentThreads" :key="row.key">
              <button
                type="button"
                class="teacher-activity-list__row"
                :aria-current="activeParentKey === row.key ? 'true' : null"
                @click="selectParent(row)"
              >
                <span class="teacher-activity-list__avatar" aria-hidden="true">{{ initials(row.parent_name) }}</span>
                <span class="teacher-activity-list__copy">
                  <strong>{{ row.parent_name }}</strong>
                  <small>{{ t('teacher.guardian_about', { student: row.student_name }) }}<template v-if="row.preview"> · {{ row.preview }}</template></small>
                </span>
                <span v-if="row.unread" class="teacher-pill is-flagged">{{ row.unread }}</span>
                <i v-else class="bi bi-chevron-right teacher-activity-list__action" aria-hidden="true"></i>
              </button>
            </li>
          </ul>
        </template>
      </aside>

      <div class="teacher-messages-desk__thread" role="tabpanel" :aria-label="threadLabel">
          <TeacherEmpty
            v-if="activeTab === 'students' && !activeStudent"
            inline
            icon="bi bi-chat-left-text"
            :message="t('teacher.messages_pick_student')"
          />
          <TeacherStudentProfileMessages
            v-else-if="activeTab === 'students' && activeStudent"
            :key="activeStudentId"
            :profile="activeStudentProfile"
            :format-when="formatWhen"
          />

          <TeacherEmpty
            v-else-if="activeTab === 'parents' && !activeParent"
            inline
            icon="bi bi-chat-left-text"
            :message="t('teacher.messages_parent_pick')"
          />
          <GuardianConversation
            v-else-if="activeTab === 'parents' && activeParent"
            :messages="parentMessages"
            viewer="teacher"
            :title="activeParent.parent_name"
            :subtitle="t('teacher.guardian_about', { student: activeParent.student_name })"
            :sending="parentSending"
            :error="parentSendError"
            :sent-token="parentSentToken"
            :has-earlier="parentHasEarlier"
            @send="sendParent"
            @load-earlier="loadEarlierParent"
          />
      </div>
    </div>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'
import { studentInitial } from '../../scripts/teacher/formatters'
import GuardianConversation from '../shared/GuardianConversation.vue'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherSectionPane from './TeacherSectionPane.vue'
import TeacherStudentProfileMessages from './profile/TeacherStudentProfileMessages.vue'

export default {
  name: 'TeacherMessagesSection',
  components: { GuardianConversation, TeacherEmpty, TeacherSectionPane, TeacherStudentProfileMessages },
  mixins: [i18nMixin],
  props: {
    students: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    formatWhen: { type: Function, required: true },
  },
  emits: ['open-student'],
  data() {
    return {
      activeTab: 'students',
      studentQuery: '',
      activeStudentId: null,
      parentThreads: [],
      parentLoading: false,
      parentLoadError: '',
      parentLoaded: false,
      activeParentKey: null,
      parentMessages: [],
      parentHasEarlier: false,
      parentSending: false,
      parentSendError: '',
      parentSentToken: 0,
    }
  },
  computed: {
    inboxLabel() {
      return this.activeTab === 'students'
        ? this.t('teacher.messages_tab_students')
        : this.t('teacher.messages_tab_parents')
    },
    threadLabel() {
      return this.activeTab === 'students'
        ? this.t('teacher.messages_private_title')
        : this.t('teacher.messages_parent_title')
    },
    messagesDeskHint() {
      return this.activeTab === 'students'
        ? this.t('teacher.direct_messages_hint_students')
        : this.t('teacher.direct_messages_hint_parents')
    },
    visibleStudents() {
      const q = String(this.studentQuery || '').trim().toLowerCase()
      const rows = [...(this.students || [])]
      if (!q) return rows
      return rows.filter((row) => String(row?.name || '').toLowerCase().includes(q))
    },
    activeStudent() {
      return (this.students || []).find((row) => Number(row.id) === Number(this.activeStudentId)) || null
    },
    activeStudentProfile() {
      if (!this.activeStudent) return null
      return {
        student: { id: this.activeStudent.id, name: this.activeStudent.name },
        payload: { messages: [] },
      }
    },
    activeParent() {
      return this.parentThreads.find((row) => row.key === this.activeParentKey) || null
    },
    studentUnreadTotal() {
      return (this.students || []).reduce((sum, row) => sum + this.studentUnread(row), 0)
    },
    parentUnreadTotal() {
      return this.parentThreads.reduce((sum, row) => sum + Number(row.unread || 0), 0)
    },
  },
  watch: {
    students() {
      if (this.activeStudentId && !this.activeStudent) this.activeStudentId = null
    },
  },
  methods: {
    initials(name) {
      return studentInitial({ name })
    },
    studentUnread(student) {
      return Math.max(0, Number(student?.unread_messages || student?.unread || 0))
    },
    selectStudent(student) {
      this.activeStudentId = Number(student?.id) || null
    },
    openParentsTab() {
      this.activeTab = 'parents'
      if (!this.parentLoaded) this.loadParentThreads()
    },
    async loadParentThreads() {
      this.parentLoading = true
      this.parentLoadError = ''
      try {
        const batches = await Promise.all((this.students || []).map(async (student) => {
          try {
            const payload = await learningApi.getTeacherGuardianThreads(student.id)
            const threads = Array.isArray(payload?.threads) ? payload.threads : []
            return threads.map((row) => ({
              ...row,
              student_id: student.id,
              student_name: student.name,
              key: `${row.parent_id}-${student.id}`,
            }))
          } catch {
            return []
          }
        }))
        const merged = batches.flat()
        merged.sort((left, right) => String(right.last_at || '').localeCompare(String(left.last_at || '')))
        this.parentThreads = merged
        this.parentLoaded = true
      } catch {
        this.parentLoadError = this.t('teacher.guardian_messages_failed')
      } finally {
        this.parentLoading = false
      }
    },
    async selectParent(row) {
      this.activeParentKey = row.key
      this.parentSendError = ''
      await this.refreshParentThread()
    },
    async refreshParentThread() {
      const row = this.activeParent
      if (!row) return
      try {
        const payload = await learningApi.getTeacherGuardianThread(row.student_id, row.parent_id)
        this.parentMessages = payload?.messages || []
        this.parentHasEarlier = Boolean(payload?.has_earlier)
        row.unread = 0
      } catch {
        this.parentSendError = this.t('teacher.guardian_messages_failed')
      }
    },
    async loadEarlierParent() {
      const row = this.activeParent
      const first = this.parentMessages[0]
      if (!row || !first?.id) return
      try {
        const payload = await learningApi.getTeacherGuardianThread(row.student_id, row.parent_id, first.id)
        this.parentMessages = [...(payload?.messages || []), ...this.parentMessages]
        this.parentHasEarlier = Boolean(payload?.has_earlier)
      } catch {
        this.parentSendError = this.t('teacher.guardian_messages_failed')
      }
    },
    async sendParent(body) {
      const row = this.activeParent
      const text = String(body || '').trim()
      if (!row || !text || this.parentSending) return
      this.parentSending = true
      this.parentSendError = ''
      try {
        const payload = await learningApi.sendTeacherGuardianMessage(row.student_id, row.parent_id, text)
        if (payload?.message) this.parentMessages = [...this.parentMessages, payload.message]
        this.parentSentToken += 1
        await this.loadParentThreads()
        if (this.activeParent) {
          const refreshed = this.parentThreads.find((item) => item.key === this.activeParentKey)
          if (refreshed) Object.assign(row, refreshed)
        }
      } catch {
        this.parentSendError = this.t('teacher.guardian_messages_failed')
      } finally {
        this.parentSending = false
      }
    },
  },
}
</script>