<template>
  <component :is="wrapperTag" :class="shellClass" :aria-label="variant === 'mobile' ? navLabel : undefined">
    <p v-if="variant === 'desktop'" class="teacher-nav-shell__label">{{ navLabel }}</p>
    <nav class="teacher-nav" :aria-label="variant === 'desktop' ? navLabel : undefined">
      <button
        v-for="item in items"
        :key="`${variant}-${item.id}`"
        type="button"
        class="teacher-nav__link"
        :class="{ 'is-active': isActive(item.id) }"
        :aria-current="isActive(item.id) ? 'page' : null"
        @click="$emit('select', item.id)"
      >
        <i :class="item.icon" aria-hidden="true"></i>
        <span>{{ t(item.label) }}</span>
      </button>
    </nav>
  </component>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'

export default {
  name: 'TeacherNav',
  mixins: [i18nMixin],
  props: {
    variant: {
      type: String,
      default: 'desktop',
      validator: (value) => ['desktop', 'mobile'].includes(value),
    },
    items: { type: Array, default: () => [] },
    activeView: { type: String, required: true },
    navLabelKey: { type: String, default: 'teacher.nav_label' },
  },
  emits: ['select'],
  computed: {
    navLabel() {
      return this.t(this.navLabelKey)
    },
    wrapperTag() {
      return this.variant === 'desktop' ? 'aside' : 'aside'
    },
    shellClass() {
      return this.variant === 'desktop'
        ? 'teacher-nav-shell teacher-nav-shell--desktop dash-reveal'
        : 'teacher-nav-shell teacher-nav-shell--mobile'
    },
  },
  methods: {
    isActive(id) {
      if (id === 'students') return this.activeView === 'students' || this.activeView === 'student'
      return this.activeView === id
    },
  },
}
</script>
