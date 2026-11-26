<template>
  <aside :class="shellClass" :style="navStyle">
    <nav
      class="teacher-nav nav nav-pills flex-column gap-1"
      :class="[navClass, { 'teacher-nav--with-admin': hasAdminFooter }]"
      :aria-label="navLabel"
    >
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
          :data-sandbox-tour="`nav-${item.id}`"
          :aria-current="isActive(item.id) ? 'page' : null"
          @click="$emit('select', item.id)"
        >
          <i :class="item.icon" aria-hidden="true"></i>
          <span class="teacher-nav__label">{{ navText(item) }}</span>
          <span v-if="countFor(item.id)" class="teacher-nav__badge" :title="countTitle(item.id)" :aria-label="countTitle(item.id)">{{ countFor(item.id) }}</span>
        </button>
      </template>

      <button
        v-if="showAccount && !hasAdminFooter"
        type="button"
        class="teacher-nav__link teacher-nav__account nav-link d-flex align-items-center gap-2 text-start"
        :class="[linkClass, { 'is-active': isActive('settings') }]"
        :aria-current="isActive('settings') ? 'page' : null"
        @click="$emit('select', 'settings')"
      >
        <i class="bi bi-person" aria-hidden="true"></i>
        <span class="teacher-nav__label">{{ t(settingsLabelKey) }}</span>
      </button>

      <template v-if="hasAdminFooter">
        <div
          v-if="variant === 'mobile' && adminMobileOpen"
          class="teacher-nav__admin-sheet"
          role="dialog"
          :aria-label="t(adminLabelKey)"
        >
          <button
            v-for="item in adminItems"
            :key="`admin-mobile-${item.id}`"
            type="button"
            class="teacher-nav__link teacher-nav__admin-child nav-link d-flex align-items-center gap-2 text-start"
            :class="[linkClass, { 'is-active': isActive(item.id) }]"
            :aria-current="isActive(item.id) ? 'page' : null"
            @click="selectAdmin(item.id)"
          >
            <i :class="item.icon" aria-hidden="true"></i>
            <span class="teacher-nav__label">{{ navText(item) }}</span>
            <span v-if="countFor(item.id)" class="teacher-nav__badge" :title="countTitle(item.id)" :aria-label="countTitle(item.id)">{{ countFor(item.id) }}</span>
          </button>
        </div>

        <div class="teacher-nav__footer">
            <div class="teacher-nav__admin">
              <button
                type="button"
                class="teacher-nav__link teacher-nav__admin-toggle nav-link d-flex align-items-center gap-2 text-start"
                :class="[linkClass, { 'is-active': adminSectionActive }]"
                :aria-expanded="(variant === 'mobile' ? adminMobileOpen : adminExpanded) ? 'true' : 'false'"
                aria-controls="teacher-nav-admin-children"
                @click="toggleAdmin"
              >
                <i class="bi bi-sliders" aria-hidden="true"></i>
                <span class="teacher-nav__label">{{ t(adminLabelKey) }}</span>
                <span v-if="adminBadgeTotal" class="teacher-nav__badge" :aria-label="t('teacher.nav_count', { n: adminBadgeTotal })">{{ adminBadgeTotal }}</span>
                <i class="bi bi-chevron-down teacher-nav__chevron" :class="{ 'is-collapsed': !adminOpen }" aria-hidden="true"></i>
              </button>
              <div
                v-show="adminOpen && variant === 'desktop'"
                id="teacher-nav-admin-children"
                class="teacher-nav__admin-children"
              >
                <button
                  v-for="item in adminItems"
                  :key="`admin-${item.id}`"
                  type="button"
                  class="teacher-nav__link teacher-nav__admin-child nav-link d-flex align-items-center gap-2 text-start"
                  :class="[linkClass, { 'is-active': isActive(item.id) }]"
                  :data-sandbox-tour="`nav-${item.id}`"
                  :aria-current="isActive(item.id) ? 'page' : null"
                  @click="selectAdmin(item.id)"
                >
                  <i :class="item.icon" aria-hidden="true"></i>
                  <span class="teacher-nav__label">{{ navText(item) }}</span>
                  <span v-if="countFor(item.id)" class="teacher-nav__badge" :title="countTitle(item.id)" :aria-label="countTitle(item.id)">{{ countFor(item.id) }}</span>
                </button>
              </div>
            </div>
            <hr v-if="showLogout" class="teacher-nav__divider" aria-hidden="true" />
            <form
              v-if="showLogout"
              method="POST"
              :action="logoutUrl"
              class="teacher-nav__logout-form"
              @submit="onLogoutSubmit"
            >
              <input type="hidden" name="_token" :value="csrfToken" />
              <button type="submit" class="teacher-nav__link teacher-nav__logout nav-link d-flex align-items-center gap-2 text-start" :class="linkClass">
                <i class="bi bi-box-arrow-right" aria-hidden="true"></i>
                <span class="teacher-nav__label">{{ t(logoutLabelKey) }}</span>
              </button>
            </form>
        </div>
      </template>
    </nav>
  </aside>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { clearSharedMutqinBrowserResidue } from '../../utils/mutqinStorageKeys'
import { resetPostHogOnLogout } from '../../scripts/analytics/posthog'

const ADMIN_EXPANDED_KEY = 'mutqin.teacher.adminNavExpanded'

function readAdminExpanded() {
  try {
    const value = localStorage.getItem(ADMIN_EXPANDED_KEY)
    if (value === '0' || value === 'false') return false
    return true
  } catch {
    return true
  }
}

function persistAdminExpanded(value) {
  try {
    localStorage.setItem(ADMIN_EXPANDED_KEY, value ? '1' : '0')
  } catch {
    /* storage unavailable */
  }
}

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
    adminItems: { type: Array, default: () => [] },
    activeView: { type: String, required: true },
    counts: { type: Object, default: () => ({}) },
    badges: { type: Object, default: () => ({}) },
    navLabelKey: { type: String, default: 'teacher.nav_label' },
    settingsLabelKey: { type: String, default: 'teacher.nav_settings' },
    adminLabelKey: { type: String, default: 'teacher.nav_admin' },
    logoutLabelKey: { type: String, default: 'teacher.nav_logout' },
    showAccount: { type: Boolean, default: true },
    logoutUrl: { type: String, default: '' },
    csrfToken: { type: String, default: '' },
    navClass: { type: String, default: '' },
    linkClass: { type: String, default: '' },
  },
  emits: ['select'],
  data() {
    return {
      adminExpanded: readAdminExpanded(),
      adminMobileOpen: false,
    }
  },
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
    hasAdminFooter() {
      return this.adminItems.length > 0
    },
    showLogout() {
      return Boolean(this.logoutUrl && this.csrfToken)
    },
    adminOpen() {
      return this.variant === 'mobile' ? this.adminMobileOpen : this.adminExpanded
    },
    adminSectionActive() {
      return this.adminItems.some((item) => this.isActive(item.id))
    },
    adminBadgeTotal() {
      return this.adminItems.reduce((sum, item) => sum + this.countFor(item.id), 0)
    },
    navStyle() {
      if (this.variant !== 'mobile') return null
      let count = this.visibleItems.length
      if (this.hasAdminFooter) count += this.showLogout ? 2 : 1
      else if (this.showAccount) count += 1
      return { '--teacher-nav-count': String(count) }
    },
  },
  watch: {
    activeView: {
      immediate: true,
      handler(view) {
        if (this.adminItems.some((item) => item.id === view)) {
          this.adminExpanded = true
          persistAdminExpanded(true)
        }
      },
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
      if (id === 'messages') return Number(this.counts.unread || 0)
      return 0
    },
    countTitle(id) {
      const n = this.countFor(id)
      if (id === 'reviews') return this.t('teacher.nav_reviews_count', { n })
      if (id === 'assignments') return this.t('teacher.nav_overdue_count', { n })
      if (id === 'messages' && n) return this.t('teacher.today_chip_messages_label', { count: n })
      return this.t('teacher.nav_count', { n })
    },
    isActive(id) {
      if (id === 'students') return this.activeView === 'students' || this.activeView === 'student'
      return this.activeView === id
    },
    toggleAdmin() {
      if (this.variant === 'mobile') {
        this.adminMobileOpen = !this.adminMobileOpen
        return
      }
      this.adminExpanded = !this.adminExpanded
      persistAdminExpanded(this.adminExpanded)
    },
    selectAdmin(id) {
      this.$emit('select', id)
      if (this.variant === 'mobile') this.adminMobileOpen = false
    },
    onLogoutSubmit() {
      resetPostHogOnLogout()
      clearSharedMutqinBrowserResidue()
    },
  },
}
</script>