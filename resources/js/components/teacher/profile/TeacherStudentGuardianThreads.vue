<template>
  <TeacherSectionPane
    class="teacher-messages-pane teacher-messages-pane--parent"
    :title="embeddedInTabs ? '' : t('teacher.messages_parent_title')"
    :hint="embeddedInTabs ? '' : t('teacher.messages_parent_hint')"
    :icon="embeddedInTabs ? '' : 'bi bi-people'"
    flat
  >
    <p v-if="loadError" class="alert alert-danger" role="alert">{{ t('teacher.guardian_messages_failed') }}</p>
    <p v-else-if="loading" class="teacher-meta">{{ t('teacher.loading') }}</p>
    <TeacherEmpty v-else-if="!threads.length" inline icon="bi bi-chat" :message="t('teacher.guardian_messages_empty')" />
    <div v-else class="teacher-messages-layout teacher-messages-layout--profile teacher-messages-layout--guardian">
      <p class="teacher-meta teacher-messages-parent__pick">{{ t('teacher.messages_parent_pick') }}</p>
      <ul class="teacher-activity-list teacher-messages-parent__threads" role="list">
        <li v-for="row in threads" :key="row.parent_id">
          <button
            type="button"
            class="teacher-activity-list__row"
            :class="{ 'is-active': active && active.parent_id === row.parent_id }"
            :aria-current="active && active.parent_id === row.parent_id ? 'true' : null"
            @click="openThread(row)"
          >
            <span class="teacher-activity-list__avatar" aria-hidden="true">{{ initial(row.parent_name) }}</span>
            <span class="teacher-activity-list__copy">
              <strong>{{ row.parent_name }}</strong>
              <small class="teacher-messages-parent__preview">{{ t('teacher.guardian_about', { student: studentName }) }}<template v-if="row.preview"> · {{ row.preview }}</template></small>
            </span>
            <span v-if="row.unread" class="teacher-pill is-flagged">{{ row.unread }}</span>
            <i v-else class="bi bi-chevron-right teacher-activity-list__action" aria-hidden="true"></i>
          </button>
        </li>
      </ul>
      <GuardianConversation
        v-if="active"
        :messages="messages"
        viewer="teacher"
        :title="active.parent_name"
        :subtitle="t('teacher.guardian_about', { student: studentName })"
        :sending="sending"
        :error="sendError"
        :sent-token="sentToken"
        :has-earlier="hasEarlier"
        @send="send"
        @load-earlier="loadEarlier"
      />
    </div>
  </TeacherSectionPane>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import { learningApi } from '../../../scripts/api/learning'
import { initial } from '../../../scripts/parent/dashboard'
import GuardianConversation from '../../shared/GuardianConversation.vue'
import TeacherEmpty from '../TeacherEmpty.vue'
import TeacherSectionPane from '../TeacherSectionPane.vue'

export default {
  name: 'TeacherStudentGuardianThreads',
  components: { GuardianConversation, TeacherEmpty, TeacherSectionPane },
  mixins: [i18nMixin],
  props: {
    studentId: { type: Number, required: true },
    studentName: { type: String, default: '' },
    embeddedInTabs: { type: Boolean, default: false },
  },
  data() {
    return {
      threads: [],
      messages: [],
      hasEarlier: false,
      active: null,
      loading: false,
      sending: false,
      loadError: false,
      sendError: '',
      sentToken: 0,
    }
  },
  watch: {
    studentId: {
      immediate: true,
      handler() { this.loadThreads() },
    },
  },
  methods: {
    initial,
    async loadThreads() {
      if (!this.studentId) return
      this.loading = true
      this.loadError = false
      this.active = null
      this.messages = []
      this.hasEarlier = false
      try {
        const data = await learningApi.getTeacherGuardianThreads(this.studentId)
        this.threads = Array.isArray(data.threads) ? data.threads : []
      } catch {
        this.loadError = true
      } finally {
        this.loading = false
      }
    },
    async openThread(row) {
      this.active = row
      this.sendError = ''
      try {
        const data = await learningApi.getTeacherGuardianThread(this.studentId, row.parent_id)
        this.messages = Array.isArray(data.messages) ? data.messages : []
        this.hasEarlier = Boolean(data.has_earlier)
        row.unread = 0
      } catch {
        this.sendError = this.t('teacher.guardian_messages_failed')
      }
    },
    async loadEarlier() {
      if (!this.active || !this.messages.length) return
      try {
        const data = await learningApi.getTeacherGuardianThread(this.studentId, this.active.parent_id, this.messages[0].id)
        const older = Array.isArray(data.messages) ? data.messages : []
        const seen = new Set(this.messages.map((row) => row.id))
        this.messages = [...older.filter((row) => !seen.has(row.id)), ...this.messages]
        this.hasEarlier = Boolean(data.has_earlier)
      } catch {
        this.sendError = this.t('teacher.guardian_messages_failed')
      }
    },
    async send(body) {
      if (!this.active) return
      this.sending = true
      this.sendError = ''
      try {
        const data = await learningApi.sendTeacherGuardianMessage(this.studentId, this.active.parent_id, body)
        if (data.message) this.messages = [...this.messages, data.message]
        this.sentToken += 1
        this.active.preview = body
      } catch {
        this.sendError = this.t('teacher.guardian_messages_failed')
      } finally {
        this.sending = false
      }
    },
  },
}
</script>
