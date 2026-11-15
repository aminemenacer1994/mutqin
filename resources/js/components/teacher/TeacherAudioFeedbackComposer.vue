<template>
  <section class="teacher-audio-feedback" :aria-label="t('teacher.audio_feedback_title')">
    <header v-if="showHeading" class="teacher-audio-feedback__head">
      <h3>{{ t('teacher.audio_feedback_title') }}</h3>
      <p>{{ t('teacher.audio_feedback_hint') }}</p>
    </header>

    <p v-if="passageLabel" class="teacher-audio-feedback__passage">
      <i class="bi bi-bookmark" aria-hidden="true"></i>
      {{ passageLabel }}
    </p>
    <TeacherTaskConversation v-if="allMessages.length" :messages="allMessages" variant="teacher" :compose="false" :composer-id="`${composerId}-history`" />

    <label class="teacher-audio-feedback__text" :for="composerId">
      <span class="visually-hidden">{{ t('teacher.feedback') }}</span>
      <textarea
        :id="composerId"
        v-model="draft"
        rows="2"
        maxlength="2000"
        :placeholder="t('teacher.audio_feedback_text_placeholder')"
        :disabled="saving"
      ></textarea>
    </label>

    <TeacherVoiceNoteControls ref="voice" :disabled="saving" @state-change="voiceState = $event" />

    <p v-if="error" class="alert alert-danger py-1 px-2 mb-0" role="alert">{{ error }}</p>
    <p v-else-if="success" class="alert alert-success py-1 px-2 mb-0" role="status">{{ success }}</p>

    <div class="teacher-audio-feedback__actions">
      <button type="button" class="btn btn-link btn-sm" :disabled="saving || (!draft && !hasRecording)" @click="clear">
        <i class="bi bi-eraser" aria-hidden="true"></i>{{ t('teacher.clear_message') }}
      </button>
      <button type="button" class="btn btn-primary btn-sm" :disabled="saving || !canSend" @click="send">
        <i class="bi" :class="saving ? 'bi-arrow-repeat' : 'bi-send'" aria-hidden="true"></i>
        {{ saving ? t('teacher.saving') : t('teacher.send_audio_feedback') }}
      </button>
    </div>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'
import TeacherVoiceNoteControls from './TeacherVoiceNoteControls.vue'
import TeacherTaskConversation from './TeacherTaskConversation.vue'

export default {
  name: 'TeacherAudioFeedbackComposer',
  components: { TeacherVoiceNoteControls, TeacherTaskConversation },
  mixins: [i18nMixin],
  props: {
    studentId: { type: [Number, String], required: true },
    recipientId: { type: [Number, String], default: null },
    assignmentId: { type: [Number, String], default: null },
    surahNumber: { type: [Number, String], default: null },
    ayahStart: { type: [Number, String], default: null },
    ayahEnd: { type: [Number, String], default: null },
    passageLabel: { type: String, default: '' },
    showHeading: { type: Boolean, default: true },
    messages: { type: Array, default: () => [] },
  },
  emits: ['sent'],
  data() {
    const uid = Math.random().toString(36).slice(2, 8)
    return {
      composerId: `teacher-audio-feedback-${uid}`,
      draft: '',
      saving: false,
      error: '',
      success: '',
      successTimer: null,
      sentMessages: [],
      voiceState: { hasRecording: false, active: false },
    }
  },
  computed: {
    hasRecording() {
      return this.voiceState.hasRecording
    },
    hasDraft() { return Boolean(this.draft.trim() || this.voiceState.hasRecording || this.voiceState.active) },
    allMessages() { return [...new Map([...this.messages, ...this.sentMessages].map(message => [message.id, message])).values()] },
    canSend() {
      return Boolean(this.draft.trim() || this.voiceState.hasRecording) && !this.voiceState.active
    },
  },
  beforeUnmount() {
    if (this.successTimer) clearTimeout(this.successTimer)
  },
  methods: {
    clear() {
      this.draft = ''
      this.error = ''
      this.success = ''
      this.$refs.voice?.discardRecording()
    },
    async send() {
      if (this.saving || !this.canSend) return
      const body = this.draft.trim()
      const recording = this.$refs.voice?.recordingPayload?.() || null
      this.saving = true
      this.error = ''
      this.success = ''
      try {
        let message = null
        if (this.recipientId) {
          const payload = await learningApi.sendTeacherAssignmentMessage(this.recipientId, body, recording)
          message = payload?.message || payload
        } else {
          message = await learningApi.saveTeacherNote(this.studentId, {
            kind: 'feedback',
            body,
            teacher_assignment_id: this.assignmentId || undefined,
            surah_number: this.surahNumber || undefined,
            ayah_start: this.ayahStart || undefined,
            ayah_end: this.ayahEnd || this.ayahStart || undefined,
          }, recording)
        }
        if (message?.id && this.recipientId) this.sentMessages.push(message)
        this.clear()
        this.success = this.t('teacher.audio_feedback_sent')
        if (this.successTimer) clearTimeout(this.successTimer)
        this.successTimer = window.setTimeout(() => { this.success = '' }, 2800)
        this.$emit('sent', message)
      } catch (err) {
        this.error = err?.response?.data?.message || this.t('teacher.action_failed')
      } finally {
        this.saving = false
      }
    },
  },
}
</script>
