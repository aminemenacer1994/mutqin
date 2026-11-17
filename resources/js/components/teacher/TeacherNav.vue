<template>
  <aside :class="shellClass">
    <nav class="teacher-nav nav nav-pills flex-column gap-1 p-2 border rounded-3 bg-body" :aria-label="navLabel">
      <button
        v-for="item in items"
        :key="`${variant}-${item.id}`"
        type="button"
        class="teacher-nav__link nav-link d-flex align-items-center gap-2 text-start"
        :class="{ 'is-active': isActive(item.id), active: isActive(item.id) }"
        :aria-current="isActive(item.id) ? 'page' : null"
        @click="$emit('select', item.id)"
      >
        <i :class="item.icon" aria-hidden="true"></i>
        <span>{{ t(variant === 'mobile' && item.shortLabel ? item.shortLabel : item.label) }}</span>
        <span v-if="countFor(item.id)" class="teacher-nav__badge" :aria-label="t('teacher.nav_count', { n: countFor(item.id) })">{{ countFor(item.id) }}</span>
      </button>
      <button
        type="button"
        class="teacher-nav__link teacher-nav__account nav-link d-flex align-items-center gap-2 text-start"
        :class="{ 'is-active': isActive('settings'), active: isActive('settings') }"
        :aria-current="isActive('settings') ? 'page' : null"
        @click="$emit('select', 'settings')"
      >
        <i class="bi bi-person" aria-hidden="true"></i>
        <span>{{ t('teacher.nav_settings') }}</span>
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
    counts: { type: Object, default: () => ({}) },
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
    countFor(id) {
      if (id === 'reviews') return Number(this.counts.reviews || 0)
      if (id === 'assignments') return Number(this.counts.overdue || 0)
      return 0
    },
    isActive(id) {
      if (id === 'students') return this.activeView === 'students' || this.activeView === 'student'
      return this.activeView === id
    },
  },
}
</script>
