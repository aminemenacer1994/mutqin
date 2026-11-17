<template>
  <span class="teacher-wording-match" @click.stop>
    <span class="teacher-wording-match__label"><slot /></span>
    <button
      ref="trigger"
      type="button"
      class="teacher-wording-match__info"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-describedby="open ? tipId : null"
      :aria-label="t('teacher.wording_match_info')"
      @click="onClick"
      @mouseenter="onHover(true)"
      @mouseleave="onHover(false)"
      @focus="onHover(true)"
      @blur="onHover(false)"
      @keydown.escape.prevent="close"
    >
      <i class="bi bi-info-circle" aria-hidden="true"></i>
    </button>
    <Teleport to="body">
      <span
        v-if="open"
        :id="tipId"
        ref="tip"
        role="tooltip"
        class="teacher-wording-match__tip"
        :style="tipStyle"
        @mouseenter="onHover(true)"
        @mouseleave="onHover(false)"
        @click.stop
      >{{ t('teacher.wording_match_tip') }}</span>
    </Teleport>
  </span>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'

let tipUid = 0

export default {
  name: 'TeacherWordingMatch',
  mixins: [i18nMixin],
  data() {
    tipUid += 1
    return {
      tipId: `teacher-wording-tip-${tipUid}`,
      pinned: false,
      hovering: false,
      tipStyle: {},
    }
  },
  computed: {
    open() {
      return this.pinned || this.hovering
    },
  },
  watch: {
    open(value) {
      if (value) {
        this.$nextTick(() => this.place())
        window.addEventListener('resize', this.place)
        window.addEventListener('scroll', this.place, true)
        document.addEventListener('click', this.onDocumentClick)
      } else {
        this.unbind()
      }
    },
  },
  beforeUnmount() {
    this.unbind()
  },
  methods: {
    onClick() {
      this.pinned = !this.pinned
      if (this.pinned) this.hovering = false
      if (this.open) this.$nextTick(() => this.place())
    },
    onHover(active) {
      const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
      if (!finePointer) return
      this.hovering = active
      if (active) this.$nextTick(() => this.place())
    },
    close() {
      this.pinned = false
      this.hovering = false
    },
    onDocumentClick(event) {
      const target = event.target
      if (this.$refs.trigger?.contains(target) || this.$refs.tip?.contains(target)) return
      this.close()
    },
    place() {
      const trigger = this.$refs.trigger
      const tip = this.$refs.tip
      if (!trigger || !tip) return
      const rect = trigger.getBoundingClientRect()
      const tipRect = tip.getBoundingClientRect()
      const margin = 8
      let top = rect.bottom + margin
      if (top + tipRect.height > window.innerHeight - margin) {
        top = Math.max(margin, rect.top - tipRect.height - margin)
      }
      let left = rect.left + (rect.width / 2) - (tipRect.width / 2)
      left = Math.min(Math.max(margin, left), window.innerWidth - tipRect.width - margin)
      this.tipStyle = { top: `${Math.round(top)}px`, left: `${Math.round(left)}px` }
    },
    unbind() {
      window.removeEventListener('resize', this.place)
      window.removeEventListener('scroll', this.place, true)
      document.removeEventListener('click', this.onDocumentClick)
    },
  },
}
</script>
