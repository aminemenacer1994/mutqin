<template>
  <section class="teacher-audio-feedback" :aria-label="t('teacher.audio_feedback_title')">
    <header v-if="showHeading" class="teacher-audio-feedback__head">
      <h3>{{ t('teacher.audio_feedback_title') }}</h3>
      <p>{{ t('teacher.audio_feedback_hint') }}</p>
    </header>

    <p v-if="contextLabel || passageLabel" class="teacher-audio-feedback__passage">
      <i class="bi bi-bookmark" aria-hidden="true"></i>
      {{ contextLabel || passageLabel }}
    </p>
    <TeacherTaskConversation v-if="showHistory && allMessages.length" :messages="allMessages" variant="teacher" viewer-role="teacher" :compose="false" :composer-id="`${composerId}-history`" />

    <label class="teacher-audio-feedback__text" :for="composerId">
      <span class="visually-hidden">{{ t('teacher.feedback') }}</span>
      <textarea
        v-auto-grow
        :id="composerId"
        v-model="draft"
        rows="1"
        maxlength="2000"
        :placeholder="t('teacher.audio_feedback_text_placeholder')"
        :disabled="saving"
      ></textarea>
    </label>

    <label v-if="showAyahReference" class="teacher-audio-feedback__ayah" :for="`${composerId}-ayah`">
      <span>{{ t('teacher.task_ayah_reference') }}</span>
      <input :id="`${composerId}-ayah`" v-model="ayahReference" type="text" maxlength="80" :disabled="saving" :placeholder="t('teacher.task_ayah_reference_placeholder')">
    </label>

    <div class="teacher-audio-feedback__footer">
      <TeacherVoiceNoteControls ref="voice" :disabled="saving" @state-change="voiceState = $event" />
      <div class="teacher-audio-feedback__actions">
        <button v-if="hasDraft" type="button" class="btn btn-link btn-sm" :disabled="saving" @click="clear">
          <i class="bi bi-eraser" aria-hidden="true"></i>{{ t('teacher.clear_message') }}
        </button>
        <button v-if="hasDraft" type="button" class="btn btn-outline-secondary btn-sm" :disabled="saving" @click="saveDraft">
          {{ t('teacher.task_save_draft') }}
        </button>
        <button type="button" class="btn btn-primary btn-sm" :disabled="saving || !canSend" @click="send">
          <i class="bi" :class="saving ? 'bi-arrow-repeat' : 'bi-send'" aria-hidden="true"></i>
          {{ saving ? t('teacher.saving') : t('teacher.send_audio_feedback') }}
        </button>
      </div>
    </div>
    <p v-if="error" class="alert alert-danger py-1 px-2 mb-0" role="alert">{{ error }}</p>
    <p v-else-if="success" class="alert alert-success py-1 px-2 mb-0" role="status">{{ success }}</p>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'
import TeacherVoiceNoteControls from './TeacherVoiceNoteControls.vue'
import TeacherTaskConversation from './TeacherTaskConversation.vue'
import autoGrow from '../../directives/autoGrow.js'

export default {
  name: 'TeacherAudioFeedbackComposer',
  directives: { autoGrow },
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
    contextLabel: { type: String, default: '' },
    showHeading: { type: Boolean, default: true },
    showHistory: { type: Boolean, default: true },
    showAyahReference: { type: Boolean, default: false },
    messages: { type: Array, default: () => [] },
  },
  emits: ['sent', 'draft-change'],
  data() {
    const uid = Math.random().toString(36).slice(2, 8)
    return {
      composerId: `teacher-audio-feedback-${uid}`,
      draft: '',
      ayahReference: '',
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
    hasDraft() { return Boolean(this.draft.trim() || this.ayahReference.trim() || this.voiceState.hasRecording || this.voiceState.active) },
    draftStorageKey() { return this.recipientId ? `mutqin-teacher-task-draft:${this.recipientId}` : '' },
    allMessages() { return [...new Map([...this.messages, ...this.sentMessages].map(message => [message.id, message])).values()] },
    canSend() {
      return Boolean(this.draft.trim() || this.voiceState.hasRecording) && !this.voiceState.active
    },
  },
  watch: {
    hasDraft: { immediate: true, handler(value) { this.$emit('draft-change', Boolean(value)) } },
  },
  mounted() { this.restoreDraft() },
  beforeUnmount() {
    if (this.successTimer) clearTimeout(this.successTimer)
  },
  methods: {
    restoreDraft() {
      if (!this.draftStorageKey) return
      try {
        const saved = JSON.parse(sessionStorage.getItem(this.draftStorageKey) || 'null')
        if (!saved) return
        if (!this.draft) this.draft = saved.draft || ''
        if (!this.ayahReference) this.ayahReference = saved.ayah || ''
      } catch (_) { /* ignore a damaged draft */ }
    },
    saveDraft() {
      if (!this.draftStorageKey) return
      sessionStorage.setItem(this.draftStorageKey, JSON.stringify({ draft: this.draft, ayah: this.ayahReference }))
      this.error = ''
      this.success = this.t('teacher.task_draft_saved')
    },
    clear() {
      this.draft = ''
      this.ayahReference = ''
      this.error = ''
      this.success = ''
      if (this.draftStorageKey) sessionStorage.removeItem(this.draftStorageKey)
      this.$refs.voice?.discardRecording()
    },
    feedbackBody() {
      const body = this.draft.trim()
      const ayah = this.ayahReference.trim()
      if (!ayah) return body
      const line = `${this.t('teacher.task_ayah_reference')}: ${ayah}`
      return body ? `${body}\n${line}` : line
    },
    async send() {
      if (this.saving || !this.canSend) return
      const body = this.feedbackBody()
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
