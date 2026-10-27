<template>
  <div class="teacher-voice-note">
    <div v-if="recordingState !== 'idle'" class="teacher-voice-note__status" :class="`is-${recordingState}`">
      <span v-if="recordingState === 'requesting'"><i class="bi bi-mic" aria-hidden="true"></i>{{ t('teacher.preparing_recording') }}</span>
      <span v-else-if="recordingState === 'recording'"><i class="bi bi-record-circle-fill" aria-hidden="true"></i>{{ t('teacher.recording_voice_note') }} · {{ recordingTimeLabel }}</span>
      <template v-else-if="audioPreviewUrl">
        <audio controls preload="metadata" :src="audioPreviewUrl">{{ t('teacher.voice_note') }}</audio>
        <button type="button" class="btn btn-link btn-sm teacher-voice-note__discard" :aria-label="t('teacher.remove_voice_note')" @click="discardRecording">
          <i class="bi bi-trash3" aria-hidden="true"></i>
        </button>
      </template>
    </div>
    <button
      v-if="recordingSupported && recordingState !== 'recorded'"
      type="button"
      class="btn btn-outline-secondary btn-sm teacher-voice-note__record"
      :class="{ 'is-recording': recordingState === 'recording' }"
      :disabled="disabled || recordingState === 'requesting' || recordingState === 'stopping'"
      @click="recordingState === 'recording' ? stopRecording() : startRecording()"
    >
      <i class="bi" :class="recordingState === 'recording' ? 'bi-stop-fill' : 'bi-mic'" aria-hidden="true"></i>
      <span class="d-none d-sm-inline">{{ recordingState === 'recording' ? t('teacher.stop_voice_note') : t('teacher.record_voice_note') }}</span>
    </button>
    <span v-if="recordingError" class="teacher-voice-note__error" role="alert">{{ recordingError }}</span>
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { chooseSupportedRecorderMimeType, createObjectUrlFromBlob, extensionForMimeType, revokeObjectUrl, stopMediaRecorderAndCollectBlob } from '../../scripts/audio/recordingPlayback'

const MAX_RECORDING_MS = 120000

export default {
  name: 'TeacherVoiceNoteControls',
  mixins: [i18nMixin],
  props: {
    disabled: { type: Boolean, default: false },
  },
  data() {
    return {
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
    recordingSupported() {
      return typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
    },
    recordingTimeLabel() {
      const seconds = Math.floor(this.recordingElapsedMs / 1000)
      return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
    },
    hasRecording() {
      return Boolean(this.audioBlob)
    },
    isRecordingActive() {
      return this.recordingState === 'recording' || this.recordingState === 'requesting' || this.recordingState === 'stopping'
    },
  },
  beforeUnmount() {
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
    async startRecording() {
      if (!this.recordingSupported || this.disabled) return
      this.discardRecording()
      this.recordingError = ''
      this.recordingState = 'requesting'
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mimeType = chooseSupportedRecorderMimeType()
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
        this.audioStream = stream
        this.audioRecorder = recorder
        this.recordingStartedAt = Date.now()
        recorder.start()
        this.recordingState = 'recording'
        this.recordingTimer = window.setInterval(() => {
          this.recordingElapsedMs = Date.now() - this.recordingStartedAt
          if (this.recordingElapsedMs >= MAX_RECORDING_MS) this.stopRecording()
        }, 250)
      } catch (_) {
        this.releaseRecordingHardware()
        this.recordingState = 'idle'
        this.recordingError = this.t('teacher.microphone_unavailable')
      }
    },
    async stopRecording() {
      const recorder = this.audioRecorder
      if (!recorder || this.recordingState !== 'recording') return
      this.recordingState = 'stopping'
      window.clearInterval(this.recordingTimer)
      const durationMs = Math.min(MAX_RECORDING_MS, Math.max(1, Date.now() - this.recordingStartedAt))
      try {
        const blob = await stopMediaRecorderAndCollectBlob(recorder, [], { mimeType: recorder.mimeType })
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
      if (this.audioRecorder?.state !== 'inactive') {
        try { this.audioRecorder?.stop() } catch (_) { /* noop */ }
      }
      this.releaseRecordingHardware()
      revokeObjectUrl(this.audioPreviewUrl)
      this.audioBlob = null
      this.audioPreviewUrl = ''
      this.audioDurationMs = 0
      this.recordingElapsedMs = 0
      this.recordingState = 'idle'
      this.recordingError = ''
    },
  },
}
</script>
