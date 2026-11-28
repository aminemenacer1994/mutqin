<template>
  <section
    class="teacher-side-panel"
    :class="[`teacher-side-panel--${tone}`, { 'is-collapsed': !open }]"
    :aria-label="ariaLabel || title"
  >
    <header class="teacher-side-panel__bar">
      <div class="teacher-side-panel__lead">
        <h2 v-if="title" class="teacher-side-panel__title">{{ title }}</h2>
        <slot name="lead" />
      </div>
      <div class="teacher-side-panel__bar-end">
        <slot name="bar-end" />
        <button
          type="button"
          class="teacher-side-panel__toggle"
          :aria-expanded="open"
          :aria-controls="bodyId"
          :title="open ? collapseLabel : expandLabel"
          @click="toggle"
        >
          <i class="bi" :class="open ? 'bi-chevron-up' : 'bi-chevron-down'" aria-hidden="true"></i>
          <span class="visually-hidden">{{ open ? collapseLabel : expandLabel }}</span>
        </button>
      </div>
    </header>
    <div v-show="open" :id="bodyId" class="teacher-side-panel__body">
      <slot />
    </div>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'

let sideSectionUid = 0

export default {
  name: 'TeacherPlaybackSideSection',
  mixins: [i18nMixin],
  props: {
    title: { type: String, default: '' },
    tone: {
      type: String,
      default: 'neutral',
      validator: (value) => ['mark', 'wording', 'attention', 'assessment', 'segments', 'response', 'private', 'revision', 'neutral'].includes(value),
    },
    open: { type: Boolean, default: true },
    ariaLabel: { type: String, default: '' },
  },
  emits: ['update:open'],
  data() {
    sideSectionUid += 1
    return {
      bodyId: `teacher-side-panel-${sideSectionUid}`,
    }
  },
  computed: {
    collapseLabel() {
      return this.t('teacher.playback_section_collapse')
    },
    expandLabel() {
      return this.t('teacher.playback_section_expand')
    },
  },
  methods: {
    toggle() {
      this.$emit('update:open', !this.open)
    },
  },
}
</script>