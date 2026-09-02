<template>
  <div class="viewport-confetti" aria-hidden="true">
    <canvas
      ref="canvas"
      class="viewport-confetti-canvas"
      role="presentation"
    ></canvas>
  </div>
</template>

<script>
import { startViewportConfetti, VIEWPORT_CONFETTI_Z_INDEX } from '../utils/viewportConfetti'

export default {
  name: 'ViewportConfetti',
  props: {
    zIndex: { type: Number, default: VIEWPORT_CONFETTI_Z_INDEX },
  },
  data() {
    return { burst: null, unmounted: false }
  },
  mounted() {
    this.$nextTick(() => {
      if (this.unmounted) return
      this.startBurst()
    })
  },
  beforeUnmount() {
    this.unmounted = true
    this.stopBurst()
  },
  methods: {
    startBurst() {
      if (this.burst?.running) return
      const canvas = this.$refs.canvas
      if (!canvas) return
      this.burst = startViewportConfetti({
        canvas,
        host: this.$el,
        zIndex: this.zIndex,
        onComplete: () => {
          this.burst = null
        },
      })
    },
    stopBurst() {
      this.burst?.stop?.()
      this.burst = null
    },
  },
}
</script>

<style>
.viewport-confetti {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none !important;
  z-index: 6;
}

.viewport-confetti-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none !important;
  z-index: 6;
}

@media (prefers-reduced-motion: reduce) {
  .viewport-confetti,
  .viewport-confetti-canvas {
    display: none !important;
  }
}
</style>
