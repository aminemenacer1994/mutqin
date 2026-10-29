<template>
  <div class="teacher-task-conversation" :class="[`is-${variant}`]">
    <p v-if="teacherNote && variant !== 'learner'" class="teacher-task-conversation__note">
      <strong>{{ t('teacher.teacher_note') }}</strong> {{ teacherNote }}
    </p>
    <audio
      v-if="evidenceAudio?.available && evidenceAudio?.url && variant !== 'learner'"
      class="teacher-task-conversation__evidence-audio"
      controls
      preload="metadata"
      :src="evidenceAudio.url"
    ></audio>

    <div
      ref="threadEl"
      class="teacher-task-conversation__thread"
      :class="threadClass"
      :aria-live="variant === 'learner' ? 'polite' : 'polite'"
    >
      <template v-if="variant === 'learner'">
        <section v-for="group in learnerDayGroups" :key="group.dayKey" class="teacher-task-conversation__day">
          <p class="teacher-task-conversation__day-label">{{ group.label }}</p>
          <article
            v-for="(message, index) in group.messages"
            :key="message.id"
            class="teacher-task-conversation__bubble"
            :class="learnerBubbleClasses(message, group.messages, index)"
          >
            <p v-if="message.body" class="teacher-task-conversation__body" dir="auto">{{ message.body }}</p>
            <div v-if="message.type === 'voice' && message.audioUrl" class="teacher-task-conversation__voice">
              <AudioClip :src="message.audioUrl" :label="t('teacher.learner_attempt_listen')" />
              <span v-if="message.durationMs" class="teacher-task-conversation__voice-duration">{{ voiceDurationLabel(message.durationMs) }}</span>
            </div>
            <time v-if="message.sentAt" :datetime="message.sentAt">{{ messageTime(message.sentAt) }}</time>
            <p v-if="showLearnerReceipt(message)" class="teacher-task-conversation__receipt">
              {{ readReceiptLabel(message) }}
            </p>
            <button
              v-if="message.failed"
              type="button"
              class="teacher-task-conversation__retry"
              @click="retryFailed(message)"
            >
              {{ t('common.retry') }}
            </button>
          </article>
        </section>
      </template>
      <template v-else>
        <article
          v-for="(message, index) in groupedMessages"
          :key="message.id"
          class="teacher-task-conversation__bubble"
          :class="bubbleClasses(message, index)"
        >
          <p v-if="message.body" class="teacher-task-conversation__body">{{ message.body }}</p>
          <div v-if="message.audio?.available && message.audio?.url" class="teacher-task-conversation__voice">
            <i class="bi bi-mic-fill" aria-hidden="true"></i>
            <audio controls preload="metadata" :src="message.audio.url">{{ t('teacher.voice_note') }}</audio>
          </div>
          <time v-if="message.created_at" :datetime="message.created_at">
            {{ messageWhen(message) }}<template v-if="showDelivery(message)"> · {{ deliveryLabel(message) }}</template>
          </time>
        </article>
      </template>
      <div v-if="!normalizedMessages.length" class="teacher-task-conversation__empty">
        <i class="bi bi-chat-left-text" aria-hidden="true"></i>
        <span>{{ emptyLabel || t('teacher.task_conversation_empty') }}</span>
      </div>
    </div>

    <span v-if="recordingLiveMessage" class="visually-hidden" aria-live="assertive">{{ recordingLiveMessage }}</span>

    <form v-if="compose" class="teacher-task-conversation__composer" @submit.prevent="submit">
      <label class="visually-hidden" :for="composerId">{{ composerLabel || t('teacher.message_teacher') }}</label>
      <div class="teacher-task-conversation__composer-box">
        <textarea
          :id="composerId"
          v-model="draft"
          rows="2"
          maxlength="2000"
          :placeholder="composerPlaceholder || t('teacher.message_teacher_placeholder')"
          :disabled="saving || sendBlocked"
          @keydown.enter.exact.prevent="onEnterSend"
        ></textarea>
        <div v-if="recordingState !== 'idle'" class="teacher-task-conversation__recording" :class="`is-${recordingState}`">
          <span v-if="recordingState === 'requesting'"><i class="bi bi-mic" aria-hidden="true"></i>{{ t('teacher.preparing_recording') }}</span>
          <span v-else-if="recordingState === 'recording'"><i class="bi bi-record-circle-fill" aria-hidden="true"></i>{{ t('teacher.recording_voice_note') }} · {{ recordingTimeLabel }}</span>
          <template v-else-if="audioPreviewUrl">
            <audio controls preload="metadata" :src="audioPreviewUrl">{{ t('teacher.voice_note') }}</audio>
            <button type="button" class="teacher-task-conversation__recording-remove" :aria-label="t('teacher.remove_voice_note')" @click="discardRecording">
              <i class="bi bi-trash3" aria-hidden="true"></i>
            </button>
          </template>
        </div>
      </div>
      <div class="teacher-task-conversation__composer-foot">
        <div class="teacher-task-conversation__composer-tools">
          <button
            v-if="recordingSupported && recordingState !== 'recorded'"
            type="button"
            class="teacher-task-conversation__record-button"
            :class="{ 'is-recording': recordingState === 'recording' }"
            :disabled="saving || sendBlocked || recordingState === 'requesting' || recordingState === 'stopping'"
            @click="recordingState === 'recording' ? stopRecording() : startRecording()"
          >
            <i class="bi" :class="recordingState === 'recording' ? 'bi-stop-fill' : 'bi-mic'" aria-hidden="true"></i>
            {{ recordingState === 'recording' ? t('teacher.stop_voice_note') : t('teacher.record_voice_note') }}
          </button>
          <span v-if="errorText" class="alert alert-danger py-1 px-2 mb-0" role="alert">{{ errorText }}</span>
          <span v-else-if="sent" class="alert alert-success py-1 px-2 mb-0" role="status"><i class="bi bi-check2-circle" aria-hidden="true"></i>{{ t('teacher.message_sent') }}</span>
          <span v-else-if="draft.length">{{ draft.length }}/2000</span>
        </div>
        <button type="submit" class="dash-btn dash-btn--primary" :disabled="saving || sendBlocked || recordingState === 'recording' || !hasComposerContent">
          <i class="bi" :class="saving ? 'bi-arrow-repeat' : 'bi-send'" aria-hidden="true"></i>
          {{ saving ? t('teacher.saving') : t('teacher.send_message') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import AudioClip from '../AudioClip.vue'
import {
  chooseSupportedRecorderMimeType,
  createObjectUrlFromBlob,
  extensionForMimeType,
  revokeObjectUrl,
  stopMediaRecorderAndCollectBlob,
} from '@/scripts/audio/recordingPlayback.js'
import {
  LEARNER_VOICE_MAX_MS,
  SEND_COOLDOWN_MS,
  canSendNow,
  groupThreadMessagesByDay,
  loadThreadDraft,
  normalizeThreadMessages,
  readReceiptLabel as readReceiptLabelFor,
  recordingAnnouncement,
  recordingStateReducer,
  sanitizeThreadText,
  saveThreadDraft,
  shouldShowReadReceipt,
} from '../../scripts/teacher/learnerTaskThread.js'

const MAX_RECORDING_MS = 120000

export default {
  name: 'TeacherTaskConversation',
  components: { AudioClip },
  mixins: [i18nMixin],
  props: {
    messages: { type: Array, default: () => [] },
    variant: { type: String, default: 'learner' },
    threadClass: { type: String, default: '' },
    viewerRole: { type: String, default: 'student' },
    peerName: { type: String, default: '' },
    teacherNote: { type: String, default: '' },
    evidenceAudio: { type: Object, default: null },
    compose: { type: Boolean, default: true },
    taskId: { type: [Number, String], default: null },
    composerId: { type: String, required: true },
    composerLabel: { type: String, default: '' },
    composerPlaceholder: { type: String, default: '' },
    emptyLabel: { type: String, default: '' },
    onSend: { type: Function, default: null },
  },
  data() {
    return {
      draft: '',
      saving: false,
      errorText: '',
      sent: false,
      audioRecorder: null,
      audioStream: null,
      audioBlob: null,
      audioPreviewUrl: '',
      audioDurationMs: 0,
      recordingStartedAt: 0,
      recordingElapsedMs: 0,
      recordingTimer: null,
      recordingState: 'idle',
      recordingError: '',
      lastSentAtMs: 0,
      sendCooldownTimer: null,
      failedPayloads: {},
      recordingLiveMessage: '',
    }
  },
  computed: {
    normalizedMessages() {
      if (this.variant !== 'learner') return this.groupedMessages
      return normalizeThreadMessages(this.messages, this.taskId || 0)
    },
    learnerDayGroups() {
      const locale = this.$i18n?.locale?.value || 'en'
      return groupThreadMessagesByDay(this.normalizedMessages, this.t.bind(this), locale)
    },
    groupedMessages() {
      return [...(this.messages || [])].sort((a, b) => (
        String(a.created_at || '').localeCompare(String(b.created_at || '')) || Number(a.id) - Number(b.id)
      ))
    },
    recordingSupported() {
      return typeof window !== 'undefined'
        && typeof window.MediaRecorder !== 'undefined'
        && Boolean(navigator.mediaDevices?.getUserMedia)
    },
    recordingTimeLabel() {
      const seconds = Math.max(0, Math.floor(this.recordingElapsedMs / 1000))
      return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
    },
    hasComposerContent() {
      return Boolean(this.draft.trim() || this.audioBlob)
    },
    maxRecordingMs() {
      return this.variant === 'learner' ? LEARNER_VOICE_MAX_MS : MAX_RECORDING_MS
    },
    sendBlocked() {
      return !canSendNow(this.lastSentAtMs)
    },
  },
  watch: {
    messages() {
      this.$nextTick(() => this.scrollThread())
    },
    taskId: {
      immediate: true,
      handler(id) {
        if (this.variant !== 'learner' || !id) return
        this.draft = loadThreadDraft(id)
      },
    },
    draft(value) {
      if (this.variant === 'learner' && this.taskId) {
        saveThreadDraft(this.taskId, value)
      }
    },
    recordingState(state) {
      this.recordingLiveMessage = this.variant === 'learner' ? recordingAnnouncement(state, this.t.bind(this)) : ''
    },
  },
  beforeUnmount() {
    this.discardRecording()
    clearTimeout(this.sendCooldownTimer)
  },
  methods: {
    learnerBubbleClasses(message, groupMessages, index) {
      const prev = groupMessages[index - 1]
      const grouped = prev && prev.senderRole === message.senderRole
      return [
        `is-${message.senderRole === 'teacher' ? 'teacher' : 'student'}`,
        {
          'is-unread': message.unread,
          'is-grouped': grouped,
          'is-pending': message.pending,
          'is-failed': message.failed,
        },
      ]
    },
    showLearnerReceipt(message) {
      return shouldShowReadReceipt(message, this.normalizedMessages)
    },
    readReceiptLabel(message) {
      return readReceiptLabelFor(message, this.t.bind(this))
    },
    messageTime(value) {
      try {
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return ''
        return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      } catch (_) {
        return ''
      }
    },
    voiceDurationLabel(ms) {
      const seconds = Math.max(1, Math.round(Number(ms) / 1000))
      return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
    },
    bubbleClasses(message, index) {
      const prev = this.groupedMessages[index - 1]
      const grouped = prev && prev.sender === message.sender
      return [
        `is-${message.sender}`,
        { 'is-unread': message.unread, 'is-grouped': grouped },
      ]
    },
    showDelivery(message) {
      const outgoing = this.viewerRole === 'teacher'
        ? message.sender === 'teacher'
        : message.sender === 'student'
      return outgoing
    },
    deliveryLabel(message) {
      return message.delivery_status === 'read' ? this.t('teacher.message_read') : this.t('teacher.message_sent_status')
    },
    messageWhen(message) {
      try {
        const date = new Date(message?.created_at)
        if (Number.isNaN(date.getTime())) return ''
        return date.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      } catch (_) {
        return ''
      }
    },
    scrollThread() {
      const el = this.$refs.threadEl
      if (!el) return
      el.scrollTop = el.scrollHeight
    },
    onEnterSend(event) {
      if (event.shiftKey) return
      this.submit()
    },
    async submit() {
      if (!this.onSend || (!this.draft.trim() && !this.audioBlob) || this.saving || this.sendBlocked) return
      this.saving = true
      this.errorText = ''
      this.sent = false
      try {
        const body = sanitizeThreadText(this.draft)
        const recording = this.audioBlob ? {
          blob: this.audioBlob,
          durationMs: this.audioDurationMs,
          filename: `voice-note.${extensionForMimeType(this.audioBlob.type)}`,
        } : null
        await this.onSend(body, recording)
        this.draft = ''
        if (this.taskId) saveThreadDraft(this.taskId, '')
        this.discardRecording()
        this.sent = true
        this.lastSentAtMs = Date.now()
        this.$nextTick(() => this.scrollThread())
      } catch (error) {
        this.errorText = error?.response?.data?.message || error?.message || this.t('teacher.action_failed')
      } finally {
        this.saving = false
      }
    },
    async retryFailed(message) {
      const payload = this.failedPayloads[message.id]
      if (!payload || !this.onSend) return
      this.errorText = ''
      try {
        await this.onSend(payload.body, payload.recording)
      } catch (error) {
        this.errorText = error?.response?.data?.message || error?.message || this.t('teacher.action_failed')
      }
    },
    async startRecording() {
      if (!this.recordingSupported || this.saving) return
      this.discardRecording()
      this.recordingState = recordingStateReducer('idle', 'request')
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mimeType = chooseSupportedRecorderMimeType()
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
        this.audioStream = stream
        this.audioRecorder = recorder
        this.recordingStartedAt = Date.now()
        this.recordingElapsedMs = 0
        recorder.start()
        this.recordingState = recordingStateReducer('requesting', 'start')
        this.recordingTimer = setInterval(() => {
          this.recordingElapsedMs = Date.now() - this.recordingStartedAt
          if (this.recordingElapsedMs >= this.maxRecordingMs) this.stopRecording()
        }, 250)
      } catch (_) {
        this.releaseRecordingHardware()
        this.recordingState = recordingStateReducer('idle', 'permission_denied')
        this.errorText = this.t('teacher.microphone_unavailable')
      }
    },
    async stopRecording() {
      const recorder = this.audioRecorder
      if (!recorder || this.recordingState !== 'recording') return
      this.recordingState = 'stopping'
      clearInterval(this.recordingTimer)
      this.recordingTimer = null
      const durationMs = Math.min(this.maxRecordingMs, Math.max(1, Date.now() - this.recordingStartedAt))
      try {
        const blob = await stopMediaRecorderAndCollectBlob(recorder, [], { mimeType: recorder.mimeType })
        this.audioBlob = blob
        this.audioDurationMs = durationMs
        this.audioPreviewUrl = createObjectUrlFromBlob(blob)
        this.recordingElapsedMs = durationMs
        this.recordingState = 'recorded'
      } catch (_) {
        this.recordingState = 'idle'
        this.errorText = this.t('teacher.recording_failed')
      } finally {
        this.releaseRecordingHardware()
      }
    },
    releaseRecordingHardware() {
      clearInterval(this.recordingTimer)
      this.recordingTimer = null
      this.audioStream?.getTracks?.().forEach((track) => track.stop())
      this.audioStream = null
      this.audioRecorder = null
    },
    discardRecording() {
      const recorder = this.audioRecorder
      if (recorder && recorder.state !== 'inactive') {
        try { recorder.stop() } catch (_) { /* noop */ }
      }
      this.releaseRecordingHardware()
      revokeObjectUrl(this.audioPreviewUrl)
      this.audioBlob = null
      this.audioPreviewUrl = ''
      this.audioDurationMs = 0
      this.recordingStartedAt = 0
      this.recordingElapsedMs = 0
      this.recordingState = recordingStateReducer(this.recordingState, 'discard')
    },
    resetComposer() {
      this.draft = ''
      this.errorText = ''
      this.sent = false
      this.discardRecording()
    },
    focusComposer() {
      if (typeof document === 'undefined') return
      const field = document.getElementById(this.composerId)
      field?.focus?.()
    },
  },
}
</script>
