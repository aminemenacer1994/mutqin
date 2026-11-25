<template>
  <article
    class="message-bubble"
    :class="bubbleClasses"
    :dir="bodyDir"
  >
    <div v-if="showContext" class="message-bubble__context">
      <span v-if="feedbackTypeLabel" class="message-bubble__kind">{{ feedbackTypeLabel }}</span>
      <span v-if="message.senderName" class="message-bubble__sender">{{ message.senderName }}</span>
      <button
        v-if="assignmentLabel && relatedAssignmentId"
        type="button"
        class="message-bubble__assignment message-bubble__assignment-link"
        @click="$emit('open-assignment', message.relatedAssignment)"
      >{{ assignmentLabel }}</button>
      <span v-else-if="assignmentLabel" class="message-bubble__assignment">{{ assignmentLabel }}</span>
    </div>
    <p v-if="message.body" class="message-bubble__body">{{ message.body }}</p>
    <div
      v-if="showVoice"
      class="message-bubble__voice"
      :aria-label="voiceAriaLabel"
    >
      <TeacherAudioFeedbackPlayer
        v-if="useRichPlayer"
        :src="message.audioUrl"
        :duration-ms="message.durationMs"
        compact
        :play-label="playLabel"
      />
      <template v-else>
        <AudioClip :src="message.audioUrl" :label="playLabel" />
        <span v-if="voiceDuration" class="message-bubble__voice-duration">{{ voiceDuration }}</span>
      </template>
    </div>
    <p v-else-if="voiceUnavailable" class="message-bubble__voice-unavailable" role="status">
      <i class="bi bi-exclamation-circle" aria-hidden="true"></i>{{ t('teacher.voice_feedback_unavailable') }}
    </p>
    <footer class="message-bubble__foot">
      <time v-if="timeLabel" class="message-bubble__time" :datetime="message.sentAt || message.created_at">{{ timeLabel }}</time>
      <p v-if="receiptLabel" class="message-bubble__receipt">{{ receiptLabel }}</p>
    </footer>
    <button
      v-if="message.failed"
      type="button"
      class="message-bubble__retry teacher-task-conversation__icon-btn"
      :aria-label="t('common.retry')"
      :title="t('common.retry')"
      @click="$emit('retry', message)"
    >
      <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
    </button>
  </article>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import AudioClip from '../AudioClip.vue'
import TeacherAudioFeedbackPlayer from '../teacher/TeacherAudioFeedbackPlayer.vue'

export default {
  name: 'MessageBubble',
  components: { AudioClip, TeacherAudioFeedbackPlayer },
  mixins: [i18nMixin],
  props: {
    message: { type: Object, required: true },
    senderRole: { type: String, default: 'teacher' },
    timeLabel: { type: String, default: '' },
    receiptLabel: { type: String, default: '' },
    playLabel: { type: String, default: '' },
    voiceAriaLabel: { type: String, default: '' },
    grouped: { type: Boolean, default: false },
    richPlayer: { type: Boolean, default: true },
  },
  emits: ['retry', 'open-assignment'],
  computed: {
    useRichPlayer() {
      return this.richPlayer !== false
    },
    showVoice() {
      return (this.message.type === 'voice' || this.message.audioUrl) && this.message.audioUrl
    },
    voiceUnavailable() {
      return this.message.type === 'voice' && !this.message.audioUrl && this.message.audioReason === 'missing'
    },
    relatedAssignmentId() {
      const assignment = this.message.relatedAssignment
      if (!assignment) return null
      return Number(assignment.recipient_id || assignment.id || 0) || null
    },
    assignmentLabel() {
      const assignment = this.message.relatedAssignment
      if (!assignment) return ''
      if (assignment.title) return assignment.title
      const name = assignment.surah_name
      const from = assignment.ayah_start
      const to = assignment.ayah_end ?? from
      if (!name || !from) return ''
      return `${name} · ${from}${to !== from ? `–${to}` : ''}`
    },
    feedbackTypeLabel() {
      if (this.senderRole !== 'teacher') return ''
      if (this.message.feedbackType === 'recitation_feedback') return this.t('teacher.recitation_feedback')
      if (this.message.feedbackType === 'voice_feedback') return this.t('teacher.voice_feedback')
      if (this.message.feedbackType === 'correction_request') return this.t('teacher.correction_request')
      return this.t('teacher.written_feedback')
    },
    showContext() {
      return Boolean(this.feedbackTypeLabel || this.message.senderName || this.assignmentLabel)
    },
    voiceDuration() {
      const ms = Number(this.message.durationMs)
      if (!ms) return ''
      const seconds = Math.max(1, Math.round(ms / 1000))
      return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
    },
    bodyDir() {
      return this.message.body ? 'auto' : undefined
    },
    bubbleClasses() {
      const role = this.senderRole === 'student' ? 'student' : 'teacher'
      return [
        `is-${role}`,
        {
          'is-unread': this.message.unread,
          'is-grouped': this.grouped,
          'is-pending': this.message.pending,
          'is-failed': this.message.failed,
          'has-voice': this.showVoice,
          'has-text': Boolean(this.message.body),
          'is-voice-only': this.showVoice && !this.message.body,
          'is-feedback-correction': this.message.feedbackType === 'correction_request',
          'is-feedback-formal': ['written_feedback', 'voice_feedback', 'recitation_feedback'].includes(this.message.feedbackType),
        },
      ]
    },
  },
}
</script>
