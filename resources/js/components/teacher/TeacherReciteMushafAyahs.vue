<template>
  <div class="teacher-recite-mushaf" :class="{ 'is-plain': plain, 'is-lines': lines }" lang="ar" dir="rtl">
    <template v-if="lines">
      <p
        v-for="line in ayahs"
        :key="line.id"
        class="teacher-recite-mushaf__line"
        :class="{ 'is-centered': line.centered }"
      >
        <span
          v-for="(part, index) in line.parts"
          :key="`${line.id}-${index}`"
          :class="[part.className, isActive(line, part) ? 'is-playback-active' : '', isSelected(line, part) ? 'is-playback-selected' : '', markClass(line, part)]"
          :style="part.fontFamily ? { fontFamily: part.fontFamily } : undefined"
          :title="part.title || undefined"
          :data-playback-key="partKey(line, part)"
          :aria-current="isActive(line, part) ? 'true' : undefined"
          :aria-pressed="interactive && partKey(line, part) ? isSelected(line, part) : undefined"
          :aria-label="accessibleLabel(line, part)"
          :role="interactive && partKey(line, part) ? 'button' : undefined"
          :tabindex="interactive && partKey(line, part) ? 0 : undefined"
          @keydown.enter.prevent="choose(line, part)"
          @keydown.space.prevent="choose(line, part)"
          @click="choose(line, part)"
        >{{ part.text }}</span>
      </p>
    </template>
    <template v-else>
      <article v-for="ayah in ayahs" :key="ayah.ayah" class="teacher-recite-mushaf__ayah">
        <p class="teacher-recite-mushaf__line">
          <span
            v-for="(part, index) in ayah.parts"
            :key="`${ayah.ayah}-${index}`"
            :class="[part.className, isActive(ayah, part) ? 'is-playback-active' : '', isSelected(ayah, part) ? 'is-playback-selected' : '', markClass(ayah, part)]"
            :style="part.fontFamily ? { fontFamily: part.fontFamily } : undefined"
            :title="part.title || undefined"
            :data-playback-key="partKey(ayah, part)"
            :aria-current="isActive(ayah, part) ? 'true' : undefined"
            :aria-pressed="interactive && partKey(ayah, part) ? isSelected(ayah, part) : undefined"
            :aria-label="accessibleLabel(ayah, part)"
            :role="interactive && partKey(ayah, part) ? 'button' : undefined"
            :tabindex="interactive && partKey(ayah, part) ? 0 : undefined"
            @keydown.enter.prevent="choose(ayah, part)"
            @keydown.space.prevent="choose(ayah, part)"
            @click="choose(ayah, part)"
          >{{ part.text }}</span>
        </p>
      </article>
    </template>
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { studioWordStatusKey } from '../../scripts/teacher/teacherStudioState'

export default {
  name: 'TeacherReciteMushafAyahs',
  mixins: [i18nMixin],
  props: {
    ayahs: { type: Array, default: () => [] },
    activeKey: { type: String, default: '' },
    selectedKey: { type: String, default: '' },
    marks: { type: Object, default: () => ({}) },
    interactive: { type: Boolean, default: false },
    plain: { type: Boolean, default: false },
    lines: { type: Boolean, default: false },
  },
  emits: ['select-word'],
  mounted() {
    this.fitLines()
    this.resizeObserver = new ResizeObserver(() => this.fitLines())
    if (this.$el) this.resizeObserver.observe(this.$el)
    document.fonts?.ready?.then(() => this.fitLines())
  },
  beforeUnmount() {
    this.resizeObserver?.disconnect()
  },
  watch: {
    ayahs() {
      this.$nextTick(() => this.fitLines())
    },
  },
  methods: {
    fitLines() {
      if (!this.lines || !this.$el || this.fitting) return
      const lines = [...this.$el.querySelectorAll(':scope > .teacher-recite-mushaf__line')]
      const available = this.$el.clientWidth
      if (!lines.length || available < 48) return
      const packed = Math.max(...lines.map((line) => (
        [...line.children].reduce((sum, kid) => sum + kid.getBoundingClientRect().width, 0)
      )))
      if (packed < 24) return
      const current = parseFloat(getComputedStyle(lines[0]).fontSize) || 24
      const next = Math.min(80, Math.max(18, current * (available / packed) * 0.992))
      if (Math.abs(next - current) < 0.6) return
      this.fitting = true
      this.$el.style.setProperty('--mushaf-fit', `${next.toFixed(2)}px`)
      this.fitting = false
    },
    accessibleLabel(ayah, part) {
      const number = part?.ayah || ayah?.ayah
      if (part?.isEnd) return this.t('teacher.ayah_n', { n: number })
      if (!this.interactive || !this.partKey(ayah, part)) return part?.accessibleText || undefined
      const word = part?.accessibleText || this.t('teacher.word_n', { n: Number(part.word_index) + 1 })
      const mark = this.marks?.[this.partKey(ayah, part)]
      const reviewKey = mark === 'confirmed' ? 'teacher.coaching_confirmed' : mark === 'dismissed' ? 'teacher.coaching_dismissed' : mark === 'reviewed' ? 'teacher.playback_status_reviewed' : ''
      return [this.t('teacher.ayah_n', { n: number }), word, this.t(studioWordStatusKey(part?.status)), reviewKey ? this.t(reviewKey) : ''].filter(Boolean).join(' · ')
    },
    partKey(ayah, part) {
      if (part?.isEnd || part?.word_index == null) return ''
      const number = Number(part?.ayah || ayah?.ayah)
      const index = Number(part?.word_index)
      if (!Number.isInteger(number) || number < 1 || !Number.isInteger(index) || index < 0) return ''
      return `${number}:${index}`
    },
    isActive(ayah, part) {
      const key = this.partKey(ayah, part)
      return Boolean(key && key === this.activeKey)
    },
    isSelected(ayah, part) {
      const key = this.partKey(ayah, part)
      return Boolean(key && key === this.selectedKey)
    },
    markClass(ayah, part) {
      const key = this.partKey(ayah, part)
      const mark = key ? this.marks?.[key] : ''
      if (mark === 'confirmed') return 'is-teacher-confirmed'
      if (mark === 'dismissed') return 'is-teacher-dismissed'
      if (mark === 'reviewed') return 'is-teacher-reviewed'
      return ''
    },
    choose(ayah, part) {
      if (!this.interactive) return
      const key = this.partKey(ayah, part)
      if (!key) return
      this.$emit('select-word', { ...part, ayah: part.ayah || ayah.ayah, key })
    },
  },
}
</script>
