<template>
  <TeacherSectionPane tone="neutral">
    <section class="teacher-direct-thread" :aria-label="t('teacher.messages')">
      <h3>{{ t('teacher.messages') }}</h3>
      <div v-if="messages.length" class="teacher-direct-thread__list" aria-live="polite">
        <article v-for="message in messages" :key="message.id" :class="`is-${message.sender}`">
          <strong>{{ message.sender === 'teacher' ? t('teacher.you') : profile.student.name }}</strong>
          <p>{{ message.body }}</p>
          <time :datetime="message.created_at">{{ formatWhen(message.created_at) }}</time>
        </article>
      </div>
      <p v-else class="teacher-direct-thread__empty">{{ t('teacher.direct_messages_empty') }}</p>
      <form class="teacher-direct-thread__composer" @submit.prevent="send">
        <label for="teacher-direct-reply">{{ t('teacher.message') }}</label>
        <textarea id="teacher-direct-reply" v-model="draft" rows="2" maxlength="2000" :placeholder="t('teacher.direct_message_prompt')"></textarea>
        <div><span v-if="error" role="alert" class="text-danger">{{ error }}</span><button type="submit" class="btn btn-primary" :disabled="saving || !draft.trim()">{{ t('teacher.send_message') }}</button></div>
      </form>
    </section>
  </TeacherSectionPane>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import { learningApi } from '../../../scripts/api/learning'
import TeacherSectionPane from '../TeacherSectionPane.vue'

export default {
  name: 'TeacherStudentProfileMessages',
  components: { TeacherSectionPane },
  mixins: [i18nMixin],
  props: { profile: { type: Object, required: true }, formatWhen: { type: Function, required: true } },
  data() { return { draft: '', saving: false, error: '', sent: [] } },
  watch: { 'profile.student.id'() { this.sent = []; this.draft = ''; this.error = '' } },
  computed: { messages() { return [...(this.profile.payload?.messages || []), ...this.sent] } },
  methods: {
    async send() {
      const body = this.draft.trim()
      if (!body || this.saving) return
      this.saving = true
      this.error = ''
      try {
        const payload = await learningApi.sendTeacherStudentMessage(this.profile.student.id, body)
        this.sent.push(payload.message)
        this.draft = ''
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('teacher.action_failed')
      } finally { this.saving = false }
    },
  },
}
</script>
