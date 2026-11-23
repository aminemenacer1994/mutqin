<template>
  <section class="parent-home teacher-account-page">
    <header class="parent-page">
      <span class="parent-page__icon" aria-hidden="true"><i class="bi bi-gear"></i></span>
      <div>
        <h1>{{ t('parent.nav_settings') }}</h1>
        <p>{{ t('parent.settings_body') }}</p>
      </div>
    </header>

    <p v-if="notice" class="alert alert-success mb-0" role="status">{{ notice }}</p>
    <p v-if="error" class="alert alert-danger mb-0" role="alert">{{ error }}</p>

    <div class="teacher-account__grid">
      <section class="card teacher-account teacher-account__profile">
        <div class="teacher-account__section-head">
          <span class="teacher-account__section-icon" aria-hidden="true"><i class="bi bi-person"></i></span>
          <div>
            <h2>{{ t('parent.account_title') }}</h2>
            <p>{{ t('parent.account_hint') }}</p>
          </div>
        </div>
        <div class="teacher-account__identity">
          <span class="teacher-profile-hero__avatar" aria-hidden="true">{{ initial(parentName) }}</span>
          <div>
            <p class="teacher-account__role">{{ t('parent.account_role') }}</p>
            <h3>{{ parentName }}</h3>
            <p v-if="email" class="teacher-account__email">{{ email }}</p>
          </div>
        </div>
        <a v-if="profileUrl" class="btn btn-outline-secondary btn-sm teacher-account__action" :href="profileUrl">{{ t('parent.manage_profile') }}</a>
      </section>

      <section class="card teacher-account">
        <div class="teacher-account__section-head">
          <span class="teacher-account__section-icon" aria-hidden="true"><i class="bi bi-people"></i></span>
          <div>
            <h2>{{ t('parent.nav_children') }}</h2>
            <p>{{ t('parent.children_linked', { count: childrenCount }) }}</p>
          </div>
        </div>
        <button type="button" class="btn btn-outline-secondary btn-sm teacher-account__action" @click="$emit('open-children')">{{ t('parent.open_children') }}</button>
      </section>

      <section class="card teacher-account">
        <div class="teacher-account__section-head">
          <span class="teacher-account__section-icon" aria-hidden="true"><i class="bi bi-envelope"></i></span>
          <div>
            <h2>{{ t('parent.invite_title') }}</h2>
            <p>{{ t('parent.invite_hint') }}</p>
          </div>
        </div>
        <form class="d-flex flex-wrap gap-2" @submit.prevent="$emit('accept-invite')">
          <label class="visually-hidden" for="parent-invite-token">{{ t('parent.invite_token') }}</label>
          <input id="parent-invite-token" :value="inviteToken" class="form-control" required :disabled="acting" @input="$emit('update:inviteToken', $event.target.value)">
          <button type="submit" class="btn btn-primary btn-sm" :disabled="acting">{{ t('parent.invite_accept') }}</button>
          <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="acting" @click="$emit('reject-invite')">{{ t('parent.invite_reject') }}</button>
        </form>
      </section>

      <section class="card teacher-account">
        <div class="teacher-account__section-head">
          <span class="teacher-account__section-icon" aria-hidden="true"><i class="bi bi-key"></i></span>
          <div>
            <h2>{{ t('parent.code_title') }}</h2>
            <p>{{ t('parent.code_hint') }}</p>
          </div>
        </div>
        <button type="button" class="btn btn-primary btn-sm" :disabled="acting" @click="$emit('create-code')">{{ t('parent.code_create') }}</button>
        <p v-if="linkCode" class="teacher-meta mb-0">{{ t('parent.code_once') }} <strong>{{ linkCode }}</strong></p>
      </section>

      <section class="card teacher-account">
        <div class="teacher-account__section-head">
          <span class="teacher-account__section-icon" aria-hidden="true"><i class="bi bi-bell"></i></span>
          <div>
            <h2>{{ t('parent.notice_title') }}</h2>
            <p>{{ t('parent.notice_hint') }}</p>
          </div>
        </div>
        <form class="d-flex flex-column gap-2" @submit.prevent="savePreferences">
          <label v-for="key in preferenceKeys" :key="key" class="d-flex align-items-center gap-2 mb-0">
            <input v-model="preferences[key]" type="checkbox" :disabled="savingPreferences">
            <span>{{ t(`parent.notice_${key}`) }}</span>
          </label>
          <button type="submit" class="btn btn-primary btn-sm teacher-account__action" :disabled="savingPreferences">{{ t('parent.notice_save') }}</button>
        </form>
        <p v-if="preferenceNotice" class="alert alert-success mb-0" role="status">{{ preferenceNotice }}</p>
        <p v-if="preferenceError" class="alert alert-danger mb-0" role="alert">{{ preferenceError }}</p>
      </section>
    </div>

    <ParentPlatformSwitch
      v-if="platforms.length"
      :platforms="platforms"
      :switch-url="switchUrl"
      :csrf-token="csrfToken"
    />
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'
import { initial } from '../../scripts/parent/dashboard'
import ParentPlatformSwitch from './ParentPlatformSwitch.vue'

export default {
  name: 'ParentFamilySettings',
  components: { ParentPlatformSwitch },
  mixins: [i18nMixin],
  props: {
    parentName: { type: String, default: '' },
    email: { type: String, default: '' },
    profileUrl: { type: String, default: '' },
    childrenCount: { type: Number, default: 0 },
    inviteToken: { type: String, default: '' },
    linkCode: { type: String, default: '' },
    acting: { type: Boolean, default: false },
    notice: { type: String, default: '' },
    error: { type: String, default: '' },
    platforms: { type: Array, default: () => [] },
    switchUrl: { type: String, default: '' },
    csrfToken: { type: String, default: '' },
  },
  emits: ['open-children', 'accept-invite', 'reject-invite', 'create-code', 'update:inviteToken'],
  data() {
    return {
      preferenceKeys: ['homework', 'deadlines', 'feedback', 'messages', 'updates', 'weekly_summary', 'reports'],
      preferences: {
        homework: true,
        deadlines: true,
        feedback: true,
        messages: true,
        updates: true,
        weekly_summary: false,
        reports: false,
      },
      savingPreferences: false,
      preferenceNotice: '',
      preferenceError: '',
    }
  },
  mounted() {
    this.loadPreferences()
  },
  methods: {
    initial,
    async loadPreferences() {
      try {
        const data = await learningApi.getParentNoticePreferences()
        if (data.preferences) this.preferences = { ...this.preferences, ...data.preferences }
      } catch {
        this.preferenceError = this.t('parent.notice_failed')
      }
    },
    async savePreferences() {
      this.savingPreferences = true
      this.preferenceNotice = ''
      this.preferenceError = ''
      try {
        const data = await learningApi.updateParentNoticePreferences(this.preferences)
        if (data.preferences) this.preferences = { ...this.preferences, ...data.preferences }
        this.preferenceNotice = this.t('parent.notice_saved')
      } catch {
        this.preferenceError = this.t('parent.notice_failed')
      } finally {
        this.savingPreferences = false
      }
    },
  },
}
</script>
