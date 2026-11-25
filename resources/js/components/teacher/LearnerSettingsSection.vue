<template>
  <section class="teacher-stack learner-settings" aria-labelledby="learner-settings-heading">
    <header class="teacher-page-header learner-settings__header">
      <div>
        <p class="teacher-kicker">{{ t('dashboard.jump_settings') }}</p>
        <h1 id="learner-settings-heading" class="teacher-page-header__title">{{ t('dashboard.jump_settings') }}</h1>
        <p class="teacher-page-header__hint">{{ t('dashboard.nav_settings_hint') }}</p>
      </div>
    </header>

    <div class="teacher-account__grid learner-settings__grid">
      <section class="card teacher-account learner-settings__card learner-settings__card--profile" :aria-labelledby="`${uid}-profile`">
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
        <a class="dash-btn dash-btn--secondary dash-btn--sm teacher-account__action" href="/profile">{{ t('parent.manage_profile') }}</a>
      </section>

      <section
        v-if="teacherSectionEnabled"
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
        id="learner-settings-guardians"
        class="card teacher-account learner-settings__card learner-settings__card--guardians"
        :aria-labelledby="`${uid}-guardians`"
      >
        <div class="teacher-account__section-head">
          <span class="teacher-account__section-icon" aria-hidden="true"><i class="bi bi-shield-heart"></i></span>
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

      <section class="card teacher-account learner-settings__card learner-settings__card--prefs" :aria-labelledby="`${uid}-prefs`">
        <div class="teacher-account__section-head">
          <span class="teacher-account__section-icon" aria-hidden="true"><i class="bi bi-sliders"></i></span>
          <div>
            <h2 :id="`${uid}-prefs`">{{ t('dashboard.settings_preferences_security_title') }}</h2>
            <p>{{ t('dashboard.settings_preferences_security_hint') }}</p>
          </div>
        </div>
        <div class="learner-settings__inline-actions">
          <a class="dash-btn dash-btn--secondary dash-btn--sm teacher-account__action" href="/profile">{{ t('dashboard.settings_preferences_action') }}</a>
          <a class="dash-btn dash-btn--secondary dash-btn--sm teacher-account__action" href="/profile">{{ t('dashboard.settings_security_action') }}</a>
        </div>
      </section>

      <section
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
      uid: `learner-settings-${Math.random().toString(36).slice(2, 9)}`,
    }
  },
  computed: {
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