<template>
  <div
    class="article-progress"
    role="progressbar"
    :aria-valuenow="percent"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-label="label"
  >
    <div class="article-progress__bar" :style="{ width: `${percent}%` }" />
  </div>
</template>

<script>
import { onBeforeUnmount, onMounted, ref } from 'vue'

export default {
  name: 'ArticleProgress',
  props: {
    label: { type: String, default: 'Reading progress' },
  },
  setup() {
    const percent = ref(0)
    let frame = 0

    function update() {
      frame = 0
      const doc = document.documentElement
      const scrollTop = window.scrollY || doc.scrollTop || 0
      const height = Math.max(doc.scrollHeight - window.innerHeight, 1)
      percent.value = Math.max(0, Math.min(100, Math.round((scrollTop / height) * 100)))
    }

    function onScroll() {
      if (frame) return
      frame = window.requestAnimationFrame(update)
    }

    onMounted(() => {
      update()
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', onScroll)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    })

    return { percent }
  },
}
</script>
