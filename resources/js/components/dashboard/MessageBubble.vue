<template>
  <article
    class="message-bubble"
    :class="bubbleClasses"
    :dir="bodyDir"
  >
    <p v-if="message.body" class="message-bubble__body">{{ message.body }}</p>
    <div
      v-if="showVoice"
      class="message-bubble__voice"
      :aria-label="voiceAriaLabel"
    >
      <AudioClip :src="message.audioUrl" :label="playLabel" />
      <span v-if="voiceDuration" class="message-bubble__voice-duration">{{ voiceDuration }}</span>
    </div>
    <footer class="message-bubble__foot">
      <time v-if="timeLabel" class="message-bubble__time" :datetime="message.sentAt || message.created_at">{{ timeLabel }}</time>
      <p v-if="receiptLabel" class="message-bubble__receipt">{{ receiptLabel }}</p>
    </footer>
    <button
      v-if="message.failed"
      type="button"
      class="message-bubble__retry dash-btn dash-btn--ghost dash-btn--sm"
      @click="$emit('retry', message)"
    >
      {{ t('common.retry') }}
    </button>
  </article>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import AudioClip from '../AudioClip.vue'

export default {
  name: 'MessageBubble',
  components: { AudioClip },
  mixins: [i18nMixin],
  props: {
    message: { type: Object, required: true },
    senderRole: { type: String, default: 'teacher' },
    timeLabel: { type: String, default: '' },
    receiptLabel: { type: String, default: '' },
    playLabel: { type: String, default: '' },
    voiceAriaLabel: { type: String, default: '' },
    grouped: { type: Boolean, default: false },
  },
  emits: ['retry'],
  computed: {
    showVoice() {
      return this.message.type === 'voice' && this.message.audioUrl
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
        },
      ]
    },
  },
}
</script>
