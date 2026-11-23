<template>
  <aside :class="shellClass" :style="navStyle">
    <nav class="teacher-nav nav nav-pills flex-column gap-1" :class="navClass" :aria-label="navLabel">
      <template v-for="item in visibleItems" :key="`${variant}-${item.id}`">
        <a
          v-if="item.href"
          class="teacher-nav__link nav-link d-flex align-items-center gap-2 text-start"
          :class="[linkClass, { 'is-active': isActive(item.id) }]"
          :href="item.href"
          :aria-current="isActive(item.id) ? 'page' : null"
        >
          <i :class="item.icon" aria-hidden="true"></i>
          <span class="teacher-nav__label">{{ navText(item) }}</span>
        </a>
        <button
          v-else
          type="button"
          class="teacher-nav__link nav-link d-flex align-items-center gap-2 text-start"
          :class="[linkClass, { 'is-active': isActive(item.id) }]"
          :aria-current="isActive(item.id) ? 'page' : null"
          @click="$emit('select', item.id)"
        >
          <i :class="item.icon" aria-hidden="true"></i>
          <span class="teacher-nav__label">{{ navText(item) }}</span>
          <span v-if="countFor(item.id)" class="teacher-nav__badge" :title="countTitle(item.id)" :aria-label="countTitle(item.id)">{{ countFor(item.id) }}</span>
        </button>
      </template>
      <button
        v-if="showAccount"
        type="button"
        class="teacher-nav__link teacher-nav__account nav-link d-flex align-items-center gap-2 text-start"
        :class="[linkClass, { 'is-active': isActive('settings') }]"
        :aria-current="isActive('settings') ? 'page' : null"
        @click="$emit('select', 'settings')"
      >
        <i class="bi bi-person" aria-hidden="true"></i>
        <span class="teacher-nav__label">{{ t(settingsLabelKey) }}</span>
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
    badges: { type: Object, default: () => ({}) },
    navLabelKey: { type: String, default: 'teacher.nav_label' },
    settingsLabelKey: { type: String, default: 'teacher.nav_settings' },
    showAccount: { type: Boolean, default: true },
    navClass: { type: String, default: '' },
    linkClass: { type: String, default: '' },
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
    visibleItems() {
      if (this.variant !== 'mobile') return this.items
      return this.items.filter((item) => item.mobile !== false)
    },
    navStyle() {
      if (this.variant !== 'mobile') return null
      const account = this.showAccount ? 1 : 0
      return { '--teacher-nav-count': String(this.visibleItems.length + account) }
    },
  },
  methods: {
    navText(item) {
      if (this.variant === 'mobile' && item.mobileLabel) return this.t(item.mobileLabel)
      return this.t(item.shortLabel || item.label)
    },
    countFor(id) {
      if (Object.prototype.hasOwnProperty.call(this.badges, id)) return Number(this.badges[id] || 0)
      if (id === 'reviews') return Number(this.counts.recitations || 0)
      if (id === 'assignments') return Number(this.counts.overdue || 0)
      return 0
    },
    countTitle(id) {
      const n = this.countFor(id)
      if (id === 'reviews') return this.t('teacher.nav_reviews_count', { n })
      if (id === 'assignments') return this.t('teacher.nav_overdue_count', { n })
      return this.t('teacher.nav_count', { n })
    },
    isActive(id) {
      if (id === 'students') return this.activeView === 'students' || this.activeView === 'student'
      return this.activeView === id
    },
  },
}
</script>
