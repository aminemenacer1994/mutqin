<template>
  <section class="teacher-stack learner-settings" aria-labelledby="learner-settings-heading">
    <header class="teacher-page-header learner-settings__header">
      <div>
        <h1 id="learner-settings-heading" class="teacher-page-header__title">{{ t('dashboard.jump_settings') }}</h1>
        <p class="teacher-page-header__hint">{{ t('dashboard.nav_settings_hint') }}</p>
      </div>
    </header>

    <nav class="nav nav-tabs teacher-tabs teacher-tabs--scroll" :aria-label="t('dashboard.jump_settings')">
      <button v-for="tab in settingsTabs" :key="tab.id" type="button" class="nav-link teacher-tabs__tab" :class="{ 'is-active': selectedSection === tab.id }" :aria-pressed="selectedSection === tab.id" @click="selectSection(tab.id)">{{ tab.label }}</button>
    </nav>
    <div class="teacher-account__grid learner-settings__grid">
      <section v-show="selectedSection === 'profile'" class="card teacher-account learner-settings__card learner-settings__card--profile" :aria-labelledby="`${uid}-profile`">
        <div class="teacher-account__section-head">
          <span class="teacher-account__section-icon" aria-hidden="true"><i class="bi bi-person"></i></span>
          <div>
            <h2 :id="`${uid}-profile`">{{ t('dashboard.settings_account_title') }}</h2>
            <p>{{ t('dashboard.settings_account_hint') }}</p>
          </div>
        </div>
        <div class="teacher-account__identity">
          <span class="teacher-profile-hero__avatar" aria-hidden="true">{{ initial }}</span>
          <div>
            <p class="teacher-account__role">{{ t('dashboard.settings_role') }}</p>
            <h3>{{ name }}</h3>
            <p v-if="email" class="teacher-account__email">{{ email }}</p>
          </div>
        </div>
        <a class="dash-btn dash-btn--secondary dash-btn--sm teacher-account__action btn btn-outline-secondary btn-sm" href="/profile">{{ t('parent.manage_profile') }}</a>
      </section>

      <section
        v-if="teacherSectionEnabled"
        v-show="selectedSection === 'teachers'"
        id="learner-settings-connections"
        class="card teacher-account learner-settings__card learner-settings__card--connections"
        :aria-labelledby="`${uid}-connections`"
      >
        <div class="teacher-account__section-head">
          <span class="teacher-account__section-icon" aria-hidden="true"><i class="bi bi-people"></i></span>
          <div>
            <h2 :id="`${uid}-connections`">{{ t('dashboard.settings_teachers_title') }}</h2>
            <p>{{ t('dashboard.settings_teachers_hint') }}</p>
          </div>
        </div>
        <p v-if="connectionStatus" class="learner-settings__status" :class="`is-${connectionPhase}`">{{ connectionStatus }}</p>
        <div v-if="circleLoading && !circle" class="learner-home__skeleton" role="status"><span></span><span></span></div>
        <p v-else-if="circleError" class="teacher-account__error" role="alert">{{ circleError }}</p>
        <LearnerCirclePanel
          v-else
          hub
          hide-guardians
          :circle="circle"
          @message="$emit('message', $event)"
          @learning="$emit('learning')"
          @updated="$emit('circle-updated', $event)"
        />
      </section>

      <section
        v-if="parentFeaturesEnabled"
        v-show="selectedSection === 'guardians'"
        id="learner-settings-guardians"
        class="card teacher-account learner-settings__card learner-settings__card--guardians"
        :aria-labelledby="`${uid}-guardians`"
      >
        <div class="teacher-account__section-head">
          <span class="teacher-account__section-icon" aria-hidden="true"><i class="bi bi-people"></i></span>
          <div>
            <h2 :id="`${uid}-guardians`">{{ t('dashboard.settings_guardians_title') }}</h2>
            <p>{{ t('dashboard.settings_guardians_hint') }}</p>
          </div>
        </div>
        <div v-if="circleLoading && !circle" class="learner-home__skeleton" role="status"><span></span><span></span></div>
        <p v-else-if="circleError" class="teacher-account__error" role="alert">{{ circleError }}</p>
        <LearnerCirclePanel
          v-else
          guardians-section
          :circle="circle"
          @updated="$emit('circle-updated', $event)"
        />
      </section>

      <section v-show="selectedSection === 'preferences'" class="card teacher-account learner-settings__card learner-settings__card--prefs" :aria-labelledby="`${uid}-prefs`">
        <div class="teacher-account__section-head">
          <span class="teacher-account__section-icon" aria-hidden="true"><i class="bi bi-sliders"></i></span>
          <div>
            <h2 :id="`${uid}-prefs`">{{ t('dashboard.settings_preferences_tab') }}</h2>
            <p>{{ t('dashboard.settings_preferences_hint') }}</p>
          </div>
        </div>
        <div class="learner-settings__inline-actions">
          <a class="dash-btn dash-btn--secondary dash-btn--sm teacher-account__action btn btn-outline-secondary btn-sm" href="/profile#appearance-preferences">{{ t('dashboard.settings_preferences_action') }}</a>

        </div>
      </section>

      <section v-show="selectedSection === 'security'" class="card teacher-account learner-settings__card">
        <div class="teacher-account__section-head">
          <span class="teacher-account__section-icon" aria-hidden="true"><i class="bi bi-shield-lock"></i></span>
          <div><h2>{{ t('dashboard.settings_security_tab') }}</h2><p>{{ t('dashboard.settings_security_hint') }}</p></div>
        </div>
        <a class="btn btn-outline-secondary align-self-start" href="/profile#password">{{ t('dashboard.settings_security_action') }}</a>
      </section>

      <section
        v-show="selectedSection === 'profile'"
        v-if="platformSwitchOptions.length && platformSwitchUrl"
        class="card teacher-account learner-settings__card learner-settings__card--platform"
        :aria-labelledby="`${uid}-switch`"
      >
        <div class="teacher-account__section-head">
          <span class="teacher-account__section-icon" aria-hidden="true"><i class="bi bi-arrow-left-right"></i></span>
          <div>
            <h2 :id="`${uid}-switch`">{{ t('parent.platform_switch_title') }}</h2>
            <p>{{ t('parent.platform_switch_hint') }}</p>
          </div>
        </div>
        <ParentPlatformSwitch
          :platforms="platformSwitchOptions"
          :switch-url="platformSwitchUrl"
          :csrf-token="csrfToken"
        />
      </section>
    </div>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learnerConnectionPhase } from '../../scripts/dashboard/learnerConnection'
import LearnerCirclePanel from './LearnerCirclePanel.vue'
import ParentPlatformSwitch from '../parent/ParentPlatformSwitch.vue'

export default {
  name: 'LearnerSettingsSection',
  components: { LearnerCirclePanel, ParentPlatformSwitch },
  mixins: [i18nMixin],
  props: {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    initial: { type: String, default: '?' },
    teacherSectionEnabled: { type: Boolean, default: false },
    parentFeaturesEnabled: { type: Boolean, default: false },
    circle: { type: Object, default: null },
    circleLoading: { type: Boolean, default: false },
    circleError: { type: String, default: '' },
    platformSwitchOptions: { type: Array, default: () => [] },
    platformSwitchUrl: { type: String, default: '' },
    csrfToken: { type: String, default: '' },
  },
  emits: ['message', 'learning', 'circle-updated'],
  data() {
    return {
      selectedSection: 'profile',
      uid: `learner-settings-${Math.random().toString(36).slice(2, 9)}`,
    }
  },
  mounted() {
    this.syncLocation()
    window.addEventListener('popstate', this.syncLocation)
  },
  beforeUnmount() { window.removeEventListener('popstate', this.syncLocation) },
  methods: {
    syncLocation() {
      const id = new URL(window.location.href).searchParams.get('settings_section')
      this.selectedSection = this.settingsTabs.some(tab => tab.id === id) ? id : 'profile'
    },
    selectSection(id) {
      if (!this.settingsTabs.some(tab => tab.id === id)) return
      this.selectedSection = id
      const url = new URL(window.location.href)
      url.searchParams.set('settings_section', id)
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
    },
  },
  computed: {
    settingsTabs() {
      return [
        { id: 'profile', label: this.t('dashboard.settings_profile_tab') },
        ...(this.teacherSectionEnabled ? [{ id: 'teachers', label: this.t('dashboard.settings_teachers_title') }] : []),
        ...(this.parentFeaturesEnabled ? [{ id: 'guardians', label: this.t('dashboard.settings_guardians_title') }] : []),
        { id: 'preferences', label: this.t('dashboard.settings_preferences_tab') },
        { id: 'security', label: this.t('dashboard.settings_security_tab') },
      ]
    },
    connectionPhase() {
      return learnerConnectionPhase(this.circle)
    },
    connectionStatus() {
      const phase = this.connectionPhase
      if (phase === 'connected') return this.t('ui.connections_status_connected')
      if (phase === 'pending') return this.t('ui.connections_status_partial')
      if (this.teacherSectionEnabled) return this.t('ui.connections_status_none')
      return ''
    },
  },
}
</script>
