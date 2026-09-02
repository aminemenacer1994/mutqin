<template>
  <span class="dash-num" :class="{ 'is-settled': settled }">{{ formatted }}</span>
</template>

<script>
export default {
  name: 'DashAnimatedNumber',
  props: {
    value: { type: Number, default: 0 },
    duration: { type: Number, default: 720 },
    reduceMotion: { type: Boolean, default: false },
  },
  data() {
    return { display: 0, settled: false, frame: null }
  },
  computed: {
    formatted() {
      return Math.round(this.display).toLocaleString(this.intlLocale)
    },
    intlLocale() {
      const loc = this.$i18n?.locale
      const value = loc && typeof loc === 'object' && 'value' in loc ? loc.value : loc
      const map = { en: 'en-GB', fr: 'fr-FR', es: 'es-ES', ar: 'ar', id: 'id-ID', tr: 'tr-TR', ur: 'ur-PK' }
      return map[String(value || 'en').slice(0, 2)] || 'en-GB'
    },
  },
  watch: {
    value(next, prev) {
      this.run(typeof prev === 'number' ? prev : 0, Number(next || 0))
    },
  },
  mounted() {
    this.run(0, Number(this.value || 0))
  },
  beforeUnmount() {
    if (this.frame) cancelAnimationFrame(this.frame)
  },
  methods: {
    run(from, to) {
      if (this.frame) cancelAnimationFrame(this.frame)
      if (this.reduceMotion || from === to) {
        this.display = to
        this.settled = true
        return
      }
      this.settled = false
      const start = performance.now()
      const delta = to - from
      const step = (now) => {
        const t = Math.min(1, (now - start) / this.duration)
        const eased = 1 - (1 - t) ** 3
        this.display = from + delta * eased
        if (t < 1) {
          this.frame = requestAnimationFrame(step)
        } else {
          this.display = to
          this.settled = true
          this.frame = null
        }
      }
      this.frame = requestAnimationFrame(step)
    },
  },
}
</script>
