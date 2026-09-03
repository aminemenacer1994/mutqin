<template>
  <Teleport to="body">
    <div class="viewport-confetti" aria-hidden="true">
      <canvas
        ref="canvas"
        class="viewport-confetti-canvas"
        role="presentation"
      ></canvas>
    </div>
  </Teleport>
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
.viewport-confetti,
.viewport-confetti-canvas {
  position: fixed !important;
  inset: 0 !important;
  top: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  min-width: 100% !important;
  min-height: 100% !important;
  min-height: 100dvh !important;
  max-width: none !important;
  max-height: none !important;
  overflow: visible !important;
  border-radius: 0 !important;
  pointer-events: none !important;
  z-index: 14150 !important;
  contain: none !important;
  clip: auto !important;
  clip-path: none !important;
}

@media (prefers-reduced-motion: reduce) {
  .viewport-confetti,
  .viewport-confetti-canvas {
    display: none !important;
  }
}
</style>
