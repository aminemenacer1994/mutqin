<template>
  <span
    class="mr-mutqin-waveform"
    :class="[
      variantClass,
      {
        'is-active': active,
        'is-idle': idle,
        'is-reduced': reducedMotion,
        'is-live': live,
      },
    ]"
    aria-hidden="true"
  >
    <span
      v-for="index in barCount"
      :key="index"
      class="mr-mutqin-waveform__bar"
      :style="live ? barStyle(index) : null"
    ></span>
  </span>
</template>

<script>
export default {
  name: 'MrMutqinWaveform',
  props: {
    active: { type: Boolean, default: false },
    idle: { type: Boolean, default: true },
    live: { type: Boolean, default: false },
    levels: { type: Array, default: () => [] },
    barCount: { type: Number, default: 5 },
    variant: { type: String, default: 'default' },
  },
  computed: {
    variantClass() {
      return this.variant === 'flagship' ? 'mr-mutqin-waveform--flagship' : ''
    },
    reducedMotion() {
      if (typeof window === 'undefined' || !window.matchMedia) return false
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    },
    normalizedLevels() {
      const source = Array.isArray(this.levels) && this.levels.length
        ? this.levels
        : Array.from({ length: this.barCount }, (_, index) => 0.35 + 0.12 * Math.sin(index))
      return source.slice(0, this.barCount)
    },
  },
  methods: {
    barStyle(index) {
      const level = Number(this.normalizedLevels[index - 1] || 0.32)
      const lift = this.active ? Math.max(0.25, Math.min(1, level)) : 0.28

      return { '--mr-level': lift, transform: `scaleY(${lift})` }
    },
  },
}
</script>