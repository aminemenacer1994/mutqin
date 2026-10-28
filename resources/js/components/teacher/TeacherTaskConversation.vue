<template>
  <div class="teacher-task-conversation" :class="[`is-${variant}`]">
    <p v-if="teacherNote" class="teacher-task-conversation__note">
      <strong>{{ t('teacher.teacher_note') }}</strong> {{ teacherNote }}
    </p>
    <audio
      v-if="evidenceAudio?.available && evidenceAudio?.url"
      class="teacher-task-conversation__evidence-audio"
      controls
      preload="metadata"
      :src="evidenceAudio.url"
    ></audio>

    <div
      ref="threadEl"
      class="teacher-task-conversation__thread"
      :class="threadClass"
      aria-live="polite"
    >
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
      <div v-if="!messages.length" class="teacher-task-conversation__empty">
        <i class="bi bi-chat-left-text" aria-hidden="true"></i>
        <span>{{ emptyLabel || t('teacher.task_conversation_empty') }}</span>
      </div>
    </div>

    <form v-if="compose" class="teacher-task-conversation__composer" @submit.prevent="submit">
      <label class="visually-hidden" :for="composerId">{{ composerLabel || t('teacher.message_teacher') }}</label>
      <div class="teacher-task-conversation__composer-box">
        <textarea
          :id="composerId"
          v-model="draft"
          rows="2"
          maxlength="2000"
          :placeholder="composerPlaceholder || t('teacher.message_teacher_placeholder')"
          :disabled="saving"
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
            :disabled="saving || recordingState === 'requesting' || recordingState === 'stopping'"
            @click="recordingState === 'recording' ? stopRecording() : startRecording()"
          >
            <i class="bi" :class="recordingState === 'recording' ? 'bi-stop-fill' : 'bi-mic'" aria-hidden="true"></i>
            {{ recordingState === 'recording' ? t('teacher.stop_voice_note') : t('teacher.record_voice_note') }}
          </button>
          <span v-if="errorText" class="alert alert-danger py-1 px-2 mb-0" role="alert">{{ errorText }}</span>
          <span v-else-if="sent" class="alert alert-success py-1 px-2 mb-0" role="status"><i class="bi bi-check2-circle" aria-hidden="true"></i>{{ t('teacher.message_sent') }}</span>
          <span v-else-if="draft.length">{{ draft.length }}/2000</span>
        </div>
        <button type="submit" class="dash-btn dash-btn--primary" :disabled="saving || recordingState === 'recording' || !hasComposerContent">
          <i class="bi" :class="saving ? 'bi-arrow-repeat' : 'bi-send'" aria-hidden="true"></i>
          {{ saving ? t('teacher.saving') : t('teacher.send_message') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import {
  chooseSupportedRecorderMimeType,
  createObjectUrlFromBlob,
  extensionForMimeType,
  revokeObjectUrl,
  stopMediaRecorderAndCollectBlob,
} from '../../scripts/audio/recordingPlayback'

const MAX_RECORDING_MS = 120000

export default {
  name: 'TeacherTaskConversation',
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
    }
  },
  computed: {
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
  },
  watch: {
    messages() {
      this.$nextTick(() => this.scrollThread())
    },
  },
  beforeUnmount() {
    this.discardRecording()
  },
  methods: {
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
    async submit() {
      if (!this.onSend || (!this.draft.trim() && !this.audioBlob) || this.saving) return
      this.saving = true
      this.errorText = ''
      this.sent = false
      this.recordingError = ''
      try {
        const recording = this.audioBlob ? {
          blob: this.audioBlob,
          durationMs: this.audioDurationMs,
          filename: `voice-note.${extensionForMimeType(this.audioBlob.type)}`,
        } : null
        await this.onSend(this.draft.trim(), recording)
        this.draft = ''
        this.discardRecording()
        this.sent = true
        this.$nextTick(() => this.scrollThread())
      } catch (error) {
        this.errorText = error?.response?.data?.message || error?.message || this.t('teacher.action_failed')
      } finally {
        this.saving = false
      }
    },
    async startRecording() {
      if (!this.recordingSupported || this.saving) return
      this.discardRecording()
      this.recordingError = ''
      this.errorText = ''
      this.sent = false
      this.recordingState = 'requesting'
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mimeType = chooseSupportedRecorderMimeType()
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
        this.audioStream = stream
        this.audioRecorder = recorder
        this.recordingStartedAt = Date.now()
        this.recordingElapsedMs = 0
        recorder.start()
        this.recordingState = 'recording'
        this.recordingTimer = setInterval(() => {
          this.recordingElapsedMs = Date.now() - this.recordingStartedAt
          if (this.recordingElapsedMs >= MAX_RECORDING_MS) this.stopRecording()
        }, 250)
      } catch (_) {
        this.releaseRecordingHardware()
        this.recordingState = 'idle'
        this.errorText = this.t('teacher.microphone_unavailable')
      }
    },
    async stopRecording() {
      const recorder = this.audioRecorder
      if (!recorder || this.recordingState !== 'recording') return
      this.recordingState = 'stopping'
      clearInterval(this.recordingTimer)
      this.recordingTimer = null
      const durationMs = Math.min(MAX_RECORDING_MS, Math.max(1, Date.now() - this.recordingStartedAt))
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
      this.recordingState = 'idle'
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
