<template>
  <Teleport to="body">
    <Transition name="ach-unlock">
      <div
        v-if="current"
        class="ach-unlock"
        role="status"
        aria-live="polite"
        :data-reduced="prefersReducedMotion ? 'true' : 'false'"
      >
        <div class="ach-unlock__card" :class="`ach-unlock__card--${tone}`">
          <AchievementBadgeArt :item="current" size="md" />
          <div class="ach-unlock__copy">
            <p class="ach-unlock__kicker">{{ kicker }}</p>
            <strong class="ach-unlock__title">{{ title }}</strong>
            <p class="ach-unlock__message">{{ message }}</p>
          </div>
          <button type="button" class="ach-unlock__dismiss" :aria-label="dismissLabel" @click="dismiss">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
import { achievementTone } from './achievementMeta.js'
import AchievementBadgeArt from './AchievementBadgeArt.vue'

export default {
  name: 'AchievementUnlockToast',
  components: { AchievementBadgeArt },
  props: {
    queue: { type: Array, default: () => [] },
    kicker: { type: String, default: 'Achievement unlocked' },
    dismissLabel: { type: String, default: 'Dismiss' },
    titleFor: { type: Function, required: true },
    messageFor: { type: Function, required: true },
  },
  emits: ['acknowledge', 'empty'],
  data() {
    return {
      current: null,
      prefersReducedMotion: false,
      timer: null,
    }
  },
  computed: {
    tone() {
      return achievementTone(this.current?.id)
    },
    title() {
      return this.current ? this.titleFor(this.current) : ''
    },
    message() {
      return this.current ? this.messageFor(this.current) : ''
    },
  },
  watch: {
    queue: {
      immediate: true,
      handler() {
        this.advance()
      },
    },
  },
  mounted() {
    try {
      this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      this.prefersReducedMotion = false
    }
  },
  beforeUnmount() {
    this.clearTimer()
  },
  methods: {
    advance() {
      if (this.current) return
      const next = Array.isArray(this.queue) ? this.queue[0] : null
      if (!next) {
        this.$emit('empty')
        return
      }
      this.current = next
      this.clearTimer()
      const delay = this.prefersReducedMotion ? 6000 : 5200
      this.timer = window.setTimeout(() => this.dismiss(), delay)
    },
    dismiss() {
      if (!this.current) return
      const id = this.current.id
      this.clearTimer()
      this.current = null
      this.$emit('acknowledge', id)
      this.$nextTick(() => this.advance())
    },
    clearTimer() {
      if (this.timer) {
        window.clearTimeout(this.timer)
        this.timer = null
      }
    },
  },
}
</script>
