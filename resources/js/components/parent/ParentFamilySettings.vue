<template>
  <section class="parent-home teacher-account-page teacher-stack parent-settings">
    <header class="teacher-page-header">
      <div>
        <p class="teacher-kicker">{{ t('parent.workspace_label') }}</p>
        <h1 class="teacher-page-header__title">{{ t('parent.nav_settings') }}</h1>
        <p class="teacher-page-header__hint">{{ t('parent.settings_body') }}</p>
      </div>
    </header>

    <p v-if="notice" class="parent-settings__flash alert alert-success mb-0" role="status">{{ notice }}</p>
    <p v-if="error" class="parent-settings__flash alert alert-danger mb-0" role="alert">{{ error }}</p>

    <div class="teacher-account__grid parent-settings__grid">
      <!-- 1. Account & Profile -->
      <section class="card teacher-account parent-settings__card" :aria-labelledby="profileHeadingId">
        <div class="teacher-account__section-head">
          <span class="teacher-account__section-icon" aria-hidden="true"><i class="bi bi-person"></i></span>
          <div>
            <h2 :id="profileHeadingId">{{ t('parent.settings_account_title') }}</h2>
            <p>{{ t('parent.account_hint') }}</p>
          </div>
        </div>

        <form class="parent-settings__form" novalidate @submit.prevent="saveProfile">
          <div class="parent-settings__field">
            <label class="parent-settings__label" :for="nameFieldId">{{ t('parent.settings_name_label') }}</label>
            <input
              :id="nameFieldId"
              v-model="profileDraft.name"
              type="text"
              class="parent-settings__input"
              maxlength="255"
              required
              :disabled="savingProfile"
              :aria-invalid="profileNameError ? 'true' : 'false'"
              :aria-describedby="profileNameError ? nameErrorId : nameHelpId"
              @input="profileNameError = ''"
            >
            <p :id="nameHelpId" class="parent-settings__help">{{ t('parent.settings_name_help') }}</p>
            <p v-if="profileNameError" :id="nameErrorId" class="parent-settings__error" role="alert">{{ profileNameError }}</p>
          </div>

          <div class="parent-settings__field">
            <span class="parent-settings__label">{{ t('parent.settings_email_label') }}</span>
            <div class="parent-settings__email-row">
              <p class="parent-settings__readonly">{{ email }}</p>
              <span v-if="emailVerified" class="parent-settings__badge">{{ t('parent.settings_email_verified') }}</span>
              <span v-else class="parent-settings__badge parent-settings__badge--warn">{{ t('parent.settings_email_unverified') }}</span>
            </div>
            <p class="parent-settings__help">{{ t('parent.settings_email_help') }}</p>
          </div>

          <div class="parent-settings__actions">
            <a class="btn btn-outline-secondary btn-sm" :href="passwordUrl">{{ t('parent.settings_security') }}</a>
            <button type="submit" class="btn btn-primary btn-sm" :disabled="savingProfile || !profileDirty || !profileDraft.name.trim()">
              {{ savingProfile ? t('parent.settings_saving') : t('parent.settings_save_profile') }}
            </button>
          </div>
          <p v-if="profileNotice" class="parent-settings__notice alert alert-success mb-0" role="status">{{ profileNotice }}</p>
          <p v-if="profileSaveError" class="parent-settings__error" role="alert">{{ profileSaveError }}</p>
        </form>
      </section>

      <!-- 2. Children & Connections -->
      <section class="card teacher-account parent-settings__card" :aria-labelledby="childrenHeadingId">
        <div class="teacher-account__section-head">
          <span class="teacher-account__section-icon" aria-hidden="true"><i class="bi bi-people"></i></span>
          <div>
            <h2 :id="childrenHeadingId">{{ t('parent.settings_children_title') }}</h2>
            <p>{{ t('parent.settings_children_hint') }}</p>
          </div>
        </div>

        <ul v-if="approvedConnectionLinks.length" class="teacher-account__member-list">
          <li v-for="link in approvedConnectionLinks" :key="link.id">
            <span>
              <strong>{{ link.child?.name || ('#' + link.id) }}</strong>
              <small>{{ link.status }}{{ link.relationship ? ` · ${link.relationship}` : '' }}</small>
            </span>
          </li>
        </ul>
        <p v-else class="teacher-account__empty">{{ t('ui.connections_empty') }}</p>

        <div class="parent-settings__inline-actions">
          <button type="button" class="btn btn-outline-secondary btn-sm teacher-account__action" @click="$emit('open-children')">
            {{ t('parent.open_children') }}
          </button>
          <a class="btn btn-outline-secondary btn-sm teacher-account__action" href="/onboarding/connections">{{ t('ui.connections_connect_action') }}</a>
        </div>

        <details class="parent-settings__details">
          <summary>{{ t('parent.invite_title') }}</summary>
          <p class="parent-settings__help">{{ t('parent.invite_hint') }}</p>
          <form class="parent-settings__invite" novalidate @submit.prevent="submitInvite">
            <div class="parent-settings__field">
              <label class="parent-settings__label" :for="inviteFieldId">{{ t('parent.invite_token') }}</label>
              <input
                :id="inviteFieldId"
                :value="inviteToken"
                class="parent-settings__input"
                :disabled="acting"
                :aria-invalid="inviteTokenError ? 'true' : 'false'"
                :aria-describedby="inviteTokenError ? inviteErrorId : inviteHelpId"
                @input="onInviteInput"
              >
              <p :id="inviteHelpId" class="parent-settings__help">{{ t('parent.settings_invite_help') }}</p>
              <p v-if="inviteTokenError" :id="inviteErrorId" class="parent-settings__error" role="alert">{{ inviteTokenError }}</p>
            </div>
            <div v-if="showInviteActions" class="parent-settings__inline-actions">
              <button type="submit" class="btn btn-primary btn-sm" :disabled="acting">{{ t('parent.invite_accept') }}</button>
              <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="acting" @click="$emit('reject-invite')">{{ t('parent.invite_reject') }}</button>
            </div>
          </form>
        </details>

        <details class="parent-settings__details">
          <summary>{{ t('parent.code_title') }}</summary>
          <p class="parent-settings__help">{{ t('parent.code_hint') }}</p>
          <button type="button" class="btn btn-primary btn-sm" :disabled="acting" @click="$emit('create-code')">{{ t('parent.code_create') }}</button>
          <p v-if="linkCode" class="teacher-meta mb-0">{{ t('parent.code_once') }} <strong>{{ linkCode }}</strong></p>
        </details>
      </section>

      <!-- 3. Notifications -->
      <section class="card teacher-account parent-settings__card" :aria-labelledby="noticeHeadingId">
        <div class="teacher-account__section-head">
          <span class="teacher-account__section-icon" aria-hidden="true"><i class="bi bi-bell"></i></span>
          <div>
            <h2 :id="noticeHeadingId">{{ t('parent.notice_title') }}</h2>
            <p>{{ t('parent.notice_hint') }}</p>
          </div>
        </div>

        <form class="parent-settings__form" @submit.prevent="savePreferences">
          <template v-for="group in notificationGroups" :key="group.id">
            <fieldset
              v-if="!group.collapsible"
              class="parent-settings__group"
            >
              <legend class="parent-settings__group-title">{{ t(group.titleKey) }}</legend>
              <p class="parent-settings__help">{{ t(group.hintKey) }}</p>
              <ul class="parent-settings__pref-list">
                <li v-for="key in group.keys" :key="key">
                  <div class="parent-settings__pref">
                    <div class="parent-settings__pref-copy">
                      <span class="parent-settings__pref-label" :id="`${uid}-notice-${key}-label`">{{ t(`parent.notice_${key}`) }}</span>
                      <span class="parent-settings__help">{{ t(`parent.notice_${key}_help`) }}</span>
                    </div>
                    <TeacherSettingToggle
                      :id="`${uid}-notice-${key}`"
                      v-model="preferences[key]"
                      :disabled="savingPreferences"
                      :aria-label="t(`parent.notice_${key}`)"
                    />
                  </div>
                </li>
              </ul>
            </fieldset>
            <details v-else class="parent-settings__details parent-settings__details--group">
              <summary>{{ t(group.titleKey) }}</summary>
              <p class="parent-settings__help">{{ t(group.hintKey) }}</p>
              <ul class="parent-settings__pref-list">
                <li v-for="key in group.keys" :key="key">
                  <div class="parent-settings__pref">
                    <div class="parent-settings__pref-copy">
                      <span class="parent-settings__pref-label" :id="`${uid}-notice-${key}-label`">{{ t(`parent.notice_${key}`) }}</span>
                      <span class="parent-settings__help">{{ t(`parent.notice_${key}_help`) }}</span>
                    </div>
                    <TeacherSettingToggle
                      :id="`${uid}-notice-${key}`"
                      v-model="preferences[key]"
                      :disabled="savingPreferences"
                      :aria-label="t(`parent.notice_${key}`)"
                    />
                  </div>
                </li>
              </ul>
            </details>
          </template>

          <button type="submit" class="btn btn-primary btn-sm teacher-account__action" :disabled="savingPreferences || !preferencesDirty">
            {{ savingPreferences ? t('parent.settings_saving') : t('parent.notice_save') }}
          </button>
        </form>
        <p v-if="preferenceNotice" class="parent-settings__notice alert alert-success mb-0" role="status">{{ preferenceNotice }}</p>
        <p v-if="preferenceError" class="parent-settings__error" role="alert">{{ preferenceError }}</p>
      </section>

      <!-- 4. Workspace & Preferences -->
      <section class="card teacher-account parent-settings__card" :aria-labelledby="workspaceHeadingId">
        <div class="teacher-account__section-head">
          <span class="teacher-account__section-icon" aria-hidden="true"><i class="bi bi-sliders"></i></span>
          <div>
            <h2 :id="workspaceHeadingId">{{ t('parent.settings_workspace_title') }}</h2>
            <p>{{ t('parent.settings_workspace_hint') }}</p>
          </div>
        </div>

        <div v-if="switchablePlatforms.length && switchUrl" class="parent-settings__field">
          <span class="parent-settings__label">{{ t('parent.platform_switch_title') }}</span>
          <p class="parent-settings__help">{{ t('parent.platform_switch_hint') }}</p>
          <ParentPlatformSwitch
            embedded
            :platforms="switchablePlatforms"
            :switch-url="switchUrl"
            :csrf-token="csrfToken"
          />
        </div>

        <div class="parent-settings__field">
          <label class="parent-settings__label" :for="localeFieldId">{{ t('parent.settings_language_label') }}</label>
          <p class="parent-settings__help">{{ t('parent.settings_language_help') }}</p>
          <select
            :id="localeFieldId"
            v-model="workspaceDraft.locale"
            class="parent-settings__input parent-settings__select"
            :disabled="savingWorkspace"
          >
            <option v-for="code in localeOptions" :key="code" :value="code">{{ localeLabel(code) }}</option>
          </select>
        </div>

        <fieldset class="parent-settings__field parent-settings__theme">
          <legend class="parent-settings__label">{{ t('parent.settings_theme_label') }}</legend>
          <p class="parent-settings__help">{{ t('parent.settings_theme_help') }}</p>
          <div class="parent-settings__theme-pills" role="group" :aria-label="t('parent.settings_theme_label')">
            <button
              v-for="mode in themeModes"
              :key="mode.id"
              type="button"
              class="btn btn-sm"
              :class="workspaceDraft.theme === mode.id ? 'btn-primary' : 'btn-outline-secondary'"
              :disabled="savingWorkspace"
              @click="setThemeChoice(mode.id)"
            >
              <i :class="mode.icon" aria-hidden="true"></i>
              {{ t(`parent.settings_theme_${mode.id}`) }}
            </button>
          </div>
        </fieldset>

        <button type="button" class="btn btn-primary btn-sm teacher-account__action" :disabled="savingWorkspace || !workspaceDirty" @click="saveWorkspacePrefs">
          {{ savingWorkspace ? t('parent.settings_saving') : t('parent.settings_save_workspace') }}
        </button>
        <p v-if="workspaceNotice" class="parent-settings__notice alert alert-success mb-0" role="status">{{ workspaceNotice }}</p>
        <p v-if="workspaceError" class="parent-settings__error" role="alert">{{ workspaceError }}</p>
      </section>
    </div>
  </section>
</template>

<script>
import axios from 'axios'
import { i18nMixin } from '../../mixins/i18nMixin'
import { setLocale } from '../../i18n'
import { learningApi } from '../../scripts/api/learning'
import { THEME_MODES, getSavedTheme, setGlobalTheme } from '../../utils/theme'
import TeacherSettingToggle from '../teacher/TeacherSettingToggle.vue'
import ParentPlatformSwitch from './ParentPlatformSwitch.vue'

const LOCALE_OPTIONS = ['en', 'ar', 'fr', 'id', 'tr', 'es', 'ur']

export default {
  name: 'ParentFamilySettings',
  components: { TeacherSettingToggle, ParentPlatformSwitch },
  mixins: [i18nMixin],
  props: {
    parentName: { type: String, default: '' },
    email: { type: String, default: '' },
    emailVerified: { type: Boolean, default: true },
    profileUrl: { type: String, default: '' },
    childrenCount: { type: Number, default: 0 },
    connectionLinks: { type: Array, default: () => [] },
    inviteToken: { type: String, default: '' },
    linkCode: { type: String, default: '' },
    acting: { type: Boolean, default: false },
    notice: { type: String, default: '' },
    error: { type: String, default: '' },
    platforms: { type: Array, default: () => [] },
    switchUrl: { type: String, default: '' },
    csrfToken: { type: String, default: '' },
    locale: { type: String, default: 'en' },
    theme: { type: String, default: '' },
  },
  emits: ['open-children', 'accept-invite', 'reject-invite', 'create-code', 'update:inviteToken', 'profile-updated'],
  data() {
    const uid = `parent-settings-${Math.random().toString(36).slice(2, 9)}`
    return {
      uid,
      profileHeadingId: `${uid}-profile`,
      childrenHeadingId: `${uid}-children`,
      noticeHeadingId: `${uid}-notice`,
      workspaceHeadingId: `${uid}-workspace`,
      nameFieldId: `${uid}-name`,
      nameHelpId: `${uid}-name-help`,
      nameErrorId: `${uid}-name-error`,
      inviteFieldId: `${uid}-invite`,
      inviteHelpId: `${uid}-invite-help`,
      inviteErrorId: `${uid}-invite-error`,
      localeFieldId: `${uid}-locale`,
      profileDraft: { name: '' },
      profileBaseline: { name: '' },
      savingProfile: false,
      profileNotice: '',
      profileSaveError: '',
      profileNameError: '',
      inviteTokenError: '',
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
      preferencesBaseline: null,
      savingPreferences: false,
      preferenceNotice: '',
      preferenceError: '',
      workspaceDraft: { locale: 'en', theme: getSavedTheme() },
      workspaceBaseline: null,
      savingWorkspace: false,
      workspaceNotice: '',
      workspaceError: '',
      localeOptions: LOCALE_OPTIONS,
      themeModes: THEME_MODES,
      notificationGroups: [
        {
          id: 'alerts',
          titleKey: 'parent.settings_notice_group_alerts',
          hintKey: 'parent.settings_notice_group_alerts_hint',
          keys: ['homework', 'deadlines', 'updates'],
          collapsible: false,
        },
        {
          id: 'academic',
          titleKey: 'parent.settings_notice_group_academic',
          hintKey: 'parent.settings_notice_group_academic_hint',
          keys: ['reports', 'weekly_summary'],
          collapsible: true,
        },
        {
          id: 'system',
          titleKey: 'parent.settings_notice_group_system',
          hintKey: 'parent.settings_notice_group_system_hint',
          keys: ['feedback', 'messages'],
          collapsible: true,
        },
      ],
    }
  },
  computed: {
    passwordUrl() {
      const base = this.profileUrl || '/profile'
      return `${base.replace(/#.*$/, '')}#password`
    },
    profileDirty() {
      return this.profileDraft.name.trim() !== this.profileBaseline.name.trim()
    },
    preferencesDirty() {
      if (!this.preferencesBaseline) return false
      return this.preferenceKeys.some((key) => Boolean(this.preferences[key]) !== Boolean(this.preferencesBaseline[key]))
    },
    workspaceDirty() {
      if (!this.workspaceBaseline) return false
      return this.workspaceDraft.locale !== this.workspaceBaseline.locale
        || this.workspaceDraft.theme !== this.workspaceBaseline.theme
    },
    showInviteActions() {
      return this.inviteLooksValid && !this.acting
    },
    inviteLooksValid() {
      const token = String(this.inviteToken || '').trim()
      if (token.length < 16 || token.length > 80) return false
      return /^[A-Za-z0-9_-]+$/.test(token)
    },
    switchablePlatforms() {
      return this.platforms.filter((platform) => platform?.id && platform.id !== 'parent')
    },
    approvedConnectionLinks() {
      return (this.connectionLinks || []).filter((link) => {
        const status = String(link?.status || '').toLowerCase()
        return status === 'approved' && link?.child?.name
      })
    },
  },
  watch: {
    parentName(name) {
      const next = String(name || '').trim()
      if (this.profileDirty) return
      this.profileDraft.name = next
      this.profileBaseline.name = next
    },
    inviteToken() {
      this.validateInviteToken(false)
    },
  },
  mounted() {
    const initialName = String(this.parentName || '').trim()
    this.profileDraft = { name: initialName }
    this.profileBaseline = { name: initialName }
    const initialLocale = String(this.locale || this.$i18n?.locale?.value || 'en').toLowerCase()
    const initialTheme = this.theme ? String(this.theme) : getSavedTheme()
    this.workspaceDraft = { locale: initialLocale, theme: initialTheme }
    this.workspaceBaseline = { ...this.workspaceDraft }
    this.loadPreferences()
  },
  methods: {
    localeLabel(code) {
      const key = `parent.settings_locale_${code}`
      const label = this.t(key)
      if (label && label !== key) return label
      const fallback = this.t(`dashboard.language.locales.${code}`)
      return fallback && fallback !== `dashboard.language.locales.${code}` ? fallback : code
    },
    onInviteInput(event) {
      this.inviteTokenError = ''
      this.$emit('update:inviteToken', event.target.value)
    },
    submitInvite() {
      if (!this.validateInviteToken(true)) return
      this.$emit('accept-invite')
    },
    validateInviteToken(markTouched = true) {
      const token = String(this.inviteToken || '').trim()
      if (!token) {
        if (markTouched) this.inviteTokenError = ''
        return false
      }
      if (token.length < 16 || token.length > 80 || !/^[A-Za-z0-9_-]+$/.test(token)) {
        if (markTouched) this.inviteTokenError = this.t('parent.settings_invite_invalid')
        return false
      }
      this.inviteTokenError = ''
      return true
    },
    async saveProfile() {
      const name = this.profileDraft.name.trim()
      if (!name) {
        this.profileNameError = this.t('parent.settings_name_required')
        return
      }
      if (!this.profileDirty || this.savingProfile) return
      this.savingProfile = true
      this.profileNotice = ''
      this.profileSaveError = ''
      this.profileNameError = ''
      try {
        const body = new URLSearchParams({
          _token: this.csrfToken,
          _method: 'PUT',
          name,
          email: this.email,
        })
        await axios.post('/profile', body, {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
          },
          validateStatus: (status) => status >= 200 && status < 500,
        })
        this.profileBaseline = { name }
        this.profileNotice = this.t('parent.settings_profile_saved')
        this.$emit('profile-updated', { name })
      } catch (err) {
        const errors = err?.response?.data?.errors
        this.profileNameError = errors?.name?.[0] || ''
        this.profileSaveError = this.profileNameError || err?.response?.data?.message || this.t('parent.settings_profile_failed')
      } finally {
        this.savingProfile = false
      }
    },
    async loadPreferences() {
      try {
        const data = await learningApi.getParentNoticePreferences()
        if (data.preferences) {
          this.preferences = { ...this.preferences, ...data.preferences }
        }
        this.preferencesBaseline = { ...this.preferences }
      } catch {
        this.preferenceError = this.t('parent.notice_failed')
      }
    },
    async savePreferences() {
      if (!this.preferencesDirty || this.savingPreferences) return
      this.savingPreferences = true
      this.preferenceNotice = ''
      this.preferenceError = ''
      try {
        const data = await learningApi.updateParentNoticePreferences(this.preferences)
        if (data.preferences) this.preferences = { ...this.preferences, ...data.preferences }
        this.preferencesBaseline = { ...this.preferences }
        this.preferenceNotice = this.t('parent.notice_saved')
      } catch {
        this.preferenceError = this.t('parent.notice_failed')
      } finally {
        this.savingPreferences = false
      }
    },
    setThemeChoice(themeId) {
      this.workspaceDraft.theme = themeId
      setGlobalTheme(themeId, { persist: true })
    },
    async onLocaleChange() {
      const next = String(this.workspaceDraft.locale || 'en').toLowerCase()
      try {
        if (this.$i18n) await setLocale(this.$i18n, next)
      } catch {
        this.workspaceError = this.t('parent.settings_workspace_failed')
      }
    },
    async saveWorkspacePrefs() {
      if (!this.workspaceDirty || this.savingWorkspace) return
      this.savingWorkspace = true
      this.workspaceNotice = ''
      this.workspaceError = ''
      try {
        if (this.workspaceDraft.locale !== this.workspaceBaseline.locale) {
          await this.onLocaleChange()
        }
        if (this.workspaceDraft.theme !== this.workspaceBaseline.theme) {
          setGlobalTheme(this.workspaceDraft.theme, { persist: true })
        }
        this.workspaceBaseline = { ...this.workspaceDraft }
        this.workspaceNotice = this.t('parent.settings_workspace_saved')
      } catch {
        this.workspaceError = this.t('parent.settings_workspace_failed')
      } finally {
        this.savingWorkspace = false
      }
    },
  },
}
</script>