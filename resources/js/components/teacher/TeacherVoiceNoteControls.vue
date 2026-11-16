<template>
  <div class="teacher-voice-note" :class="{ 'is-recorded': recordingState === 'recorded' }">
    <div v-if="recordingState === 'requesting' || recordingState === 'recording' || recordingState === 'paused'" class="teacher-voice-note__status" :class="`is-${recordingState}`" role="status" aria-live="polite">
      <span v-if="recordingState === 'requesting'"><i class="bi bi-mic" aria-hidden="true"></i>{{ t('teacher.preparing_recording') }}</span>
      <span v-else><i class="bi bi-record-circle-fill" aria-hidden="true"></i>{{ recordingState === 'paused' ? t('teacher.pause_voice_note') : t('teacher.recording_voice_note') }} · {{ recordingTimeLabel }}</span>
    </div>

    <div v-else-if="audioPreviewUrl" class="teacher-voice-note__preview">
      <TeacherAudioFeedbackPlayer
        :src="audioPreviewUrl"
        :duration-ms="audioDurationMs"
        compact
        :play-label="t('teacher.play_recording')"
        :pause-label="t('teacher.pause_recording')"
      />
      <div class="teacher-voice-note__preview-actions">
        <button type="button" class="btn btn-outline-secondary btn-sm" :aria-label="t('teacher.rerecord_voice_note')" :title="t('teacher.rerecord_voice_note')" @click="rerecord">
          <i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
          <span>{{ t('teacher.rerecord_voice_note') }}</span>
        </button>
        <button type="button" class="btn btn-link btn-sm teacher-voice-note__discard" :aria-label="t('teacher.remove_voice_note')" :title="t('teacher.remove_voice_note')" @click="discardRecording">
          <i class="bi bi-trash3" aria-hidden="true"></i>
          <span class="d-none d-sm-inline">{{ t('teacher.remove_voice_note') }}</span>
        </button>
      </div>
    </div>

    <button
      v-if="recordingSupported && recordingState === 'recording' && pauseSupported"
      type="button"
      class="btn btn-outline-secondary btn-sm"
      :disabled="disabled"
      :aria-label="t('teacher.pause_voice_note')"
      :title="t('teacher.pause_voice_note')"
      @click="pauseRecording"
    >
      <i class="bi bi-pause-fill" aria-hidden="true"></i>
      <span class="d-none d-sm-inline">{{ t('teacher.pause_voice_note') }}</span>
    </button>
    <button
      v-if="recordingSupported && recordingState === 'paused'"
      type="button"
      class="btn btn-outline-secondary btn-sm"
      :disabled="disabled"
      :aria-label="t('teacher.resume_voice_note')"
      :title="t('teacher.resume_voice_note')"
      @click="resumeRecording"
    >
      <i class="bi bi-mic" aria-hidden="true"></i>
      <span class="d-none d-sm-inline">{{ t('teacher.resume_voice_note') }}</span>
    </button>
    <button
      v-if="recordingSupported && (recordingState === 'recording' || recordingState === 'paused')"
      type="button"
      class="btn btn-outline-danger btn-sm"
      :disabled="disabled"
      :aria-label="t('teacher.discard_recording')"
      :title="t('teacher.discard_recording')"
      @click="discardRecording"
    >
      <i class="bi bi-x-lg" aria-hidden="true"></i>
      <span class="d-none d-sm-inline">{{ t('teacher.discard_recording') }}</span>
    </button>
    <button
      v-if="recordingSupported && recordingState !== 'recorded'"
      type="button"
      class="btn btn-outline-secondary btn-sm teacher-voice-note__record"
      :class="{ 'is-recording': recordingState === 'recording' || recordingState === 'paused' }"
      :disabled="disabled || recordingState === 'requesting' || recordingState === 'stopping'"
      :aria-label="recordingState === 'recording' || recordingState === 'paused' ? t('teacher.stop_voice_note') : t('teacher.record_voice_note')"
      :title="recordingState === 'recording' || recordingState === 'paused' ? t('teacher.stop_voice_note') : t('teacher.record_voice_note')"
      @click="recordingState === 'recording' || recordingState === 'paused' ? stopRecording() : startRecording()"
    >
      <i class="bi" :class="recordingState === 'recording' || recordingState === 'paused' ? 'bi-stop-fill' : 'bi-mic'" aria-hidden="true"></i>
      <span class="d-none d-sm-inline">{{ recordingState === 'recording' || recordingState === 'paused' ? t('teacher.stop_voice_note') : t('teacher.record_voice_note') }}</span>
    </button>
    <span v-if="!recordingSupported" class="teacher-voice-note__error" role="alert">{{ t('teacher.microphone_unsupported') }}</span>
    <span v-if="recordingError" class="teacher-voice-note__error" role="alert">{{ recordingError }}</span>
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { chooseSupportedRecorderMimeType, createObjectUrlFromBlob, extensionForMimeType, revokeObjectUrl, stopMediaRecorderAndCollectBlob } from '@/scripts/audio/recordingPlayback.js'
import TeacherAudioFeedbackPlayer from './TeacherAudioFeedbackPlayer.vue'

const MAX_RECORDING_MS = 120000

export default {
  name: 'TeacherVoiceNoteControls',
  components: { TeacherAudioFeedbackPlayer },
  mixins: [i18nMixin],
  props: {
    disabled: { type: Boolean, default: false },
  },
  emits: ['state-change'],
  data() {
    return {
      audioRecorder: null,
      audioStream: null,
      audioBlob: null,
      audioPreviewUrl: '',
      audioDurationMs: 0,
      recordingStartedAt: 0,
      recordingElapsedMs: 0,
      pausedAccumulatedMs: 0,
      pauseStartedAt: 0,
      recordingTimer: null,
      recordingState: 'idle',
      recordingError: '',
      recordingRequestId: 0,
      disposed: false,
    }
  },
  computed: {
    recordingSupported() {
      return typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
    },
    pauseSupported() {
      return typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.prototype?.pause === 'function' && typeof MediaRecorder.prototype?.resume === 'function'
    },
    recordingTimeLabel() {
      const seconds = Math.floor(this.recordingElapsedMs / 1000)
      return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
    },
    hasRecording() {
      return Boolean(this.audioBlob)
    },
    isRecordingActive() {
      return this.recordingState === 'recording' || this.recordingState === 'paused' || this.recordingState === 'requesting' || this.recordingState === 'stopping'
    },
  },
  watch: {
    recordingState: { immediate: true, handler() { this.$emit('state-change', { hasRecording: this.hasRecording, active: this.isRecordingActive }) } },
  },
  mounted() {
    this.onPageLeave = (event) => {
      if (!this.hasRecording && !this.isRecordingActive) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', this.onPageLeave)
  },
  beforeUnmount() {
    this.disposed = true
    window.removeEventListener('beforeunload', this.onPageLeave)
    this.discardRecording()
  },
  methods: {
    recordingPayload() {
      if (!this.audioBlob) return null
      return {
        blob: this.audioBlob,
        durationMs: this.audioDurationMs,
        filename: `voice-note.${extensionForMimeType(this.audioBlob.type)}`,
      }
    },
    rerecord() {
      this.discardRecording()
      this.$nextTick(() => this.startRecording())
    },
    async startRecording() {
      if (!this.recordingSupported || this.disabled) return
      this.discardRecording()
      const requestId = this.recordingRequestId
      this.recordingError = ''
      this.recordingState = 'requesting'
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (this.disposed || requestId !== this.recordingRequestId) { stream.getTracks().forEach(track => track.stop()); return }
        const mimeType = chooseSupportedRecorderMimeType()
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
        this.audioStream = stream
        this.audioRecorder = recorder
        this.recordingStartedAt = Date.now()
        this.pausedAccumulatedMs = 0
        this.pauseStartedAt = 0
        recorder.start()
        this.recordingState = 'recording'
        this.armRecordingTimer()
      } catch (_) {
        this.releaseRecordingHardware()
        this.recordingState = 'idle'
        this.recordingError = this.t('teacher.microphone_unavailable')
      }
    },
    pauseRecording() {
      const recorder = this.audioRecorder
      if (!recorder || this.recordingState !== 'recording' || typeof recorder.pause !== 'function') return
      recorder.pause()
      this.pauseStartedAt = Date.now()
      this.recordingState = 'paused'
      window.clearInterval(this.recordingTimer)
    },
    resumeRecording() {
      const recorder = this.audioRecorder
      if (!recorder || this.recordingState !== 'paused' || typeof recorder.resume !== 'function') return
      if (this.pauseStartedAt) this.pausedAccumulatedMs += Date.now() - this.pauseStartedAt
      this.pauseStartedAt = 0
      recorder.resume()
      this.recordingState = 'recording'
      this.armRecordingTimer()
    },
    armRecordingTimer() {
      window.clearInterval(this.recordingTimer)
      this.recordingTimer = window.setInterval(() => {
        this.recordingElapsedMs = Math.max(0, Date.now() - this.recordingStartedAt - this.pausedAccumulatedMs)
        if (this.recordingElapsedMs >= MAX_RECORDING_MS) this.stopRecording()
      }, 250)
    },
    async stopRecording() {
      const recorder = this.audioRecorder
      if (!recorder || (this.recordingState !== 'recording' && this.recordingState !== 'paused')) return
      const requestId = this.recordingRequestId
      if (this.recordingState === 'paused' && this.pauseStartedAt) {
        this.pausedAccumulatedMs += Date.now() - this.pauseStartedAt
        this.pauseStartedAt = 0
      }
      this.recordingState = 'stopping'
      window.clearInterval(this.recordingTimer)
      const durationMs = Math.min(MAX_RECORDING_MS, Math.max(1, Date.now() - this.recordingStartedAt - this.pausedAccumulatedMs))
      try {
        const blob = await stopMediaRecorderAndCollectBlob(recorder, [], { mimeType: recorder.mimeType })
        if (this.disposed || requestId !== this.recordingRequestId) return
        if (!blob || blob.size < 1) {
          this.recordingState = 'idle'
          this.recordingError = this.t('teacher.recording_empty')
          return
        }
        this.audioBlob = blob
        this.audioDurationMs = durationMs
        this.audioPreviewUrl = createObjectUrlFromBlob(blob)
        this.recordingState = 'recorded'
      } catch (_) {
        this.recordingState = 'idle'
        this.recordingError = this.t('teacher.recording_failed')
      } finally {
        this.releaseRecordingHardware()
      }
    },
    releaseRecordingHardware() {
      window.clearInterval(this.recordingTimer)
      this.recordingTimer = null
      this.audioStream?.getTracks?.().forEach((track) => track.stop())
      this.audioStream = null
      this.audioRecorder = null
    },
    discardRecording() {
      this.recordingRequestId += 1
      if (this.audioRecorder?.state !== 'inactive') {
        try { this.audioRecorder?.stop() } catch (_) { /* noop */ }
      }
      this.releaseRecordingHardware()
      revokeObjectUrl(this.audioPreviewUrl)
      this.audioBlob = null
      this.audioPreviewUrl = ''
      this.audioDurationMs = 0
      this.recordingElapsedMs = 0
      this.pausedAccumulatedMs = 0
      this.pauseStartedAt = 0
      this.recordingState = 'idle'
      this.recordingError = ''
    },
  },
}
</script>
