<template>
  <aside :class="shellClass">
    <nav class="teacher-nav" :aria-label="navLabel">
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
  </aside>
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
