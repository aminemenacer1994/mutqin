<template>
  <div class="auth-page">
    <div class="auth-panel" style="max-width: 28rem">
      <header class="auth-greeting">
        <p class="auth-greeting__arabic" lang="ar" dir="rtl">بِسْمِ ٱللّٰهِ</p>
        <h1 class="auth-heading">{{ t('ui.connections_connect_title') }}</h1>
        <p class="auth-lede">{{ stepLede }}</p>
        <p v-if="connectionStatusLabel" class="teacher-meta mb-0">{{ connectionStatusLabel }}</p>
        <p v-if="steps.length > 1" class="teacher-meta mb-0">{{ stepIndex + 1 }} / {{ steps.length }}</p>
      </header>

      <p v-if="error" class="alert alert-danger auth-alert" role="alert">{{ error }}</p>
      <p v-if="notice" class="alert alert-success auth-alert" role="status">{{ notice }}</p>

      <div class="auth-form">
        <template v-if="currentStep === 'institution'">
          <div v-if="institution?.status === 'pending'" class="auth-field">
            <p class="form-label">{{ institution.organisation?.name }}</p>
            <p class="teacher-meta">{{ t('ui.connections_org_pending_help') }}</p>
            <button type="button" class="btn auth-submit" :disabled="busy" @click="finish">
              {{ t('ui.connections_finish') }}
            </button>
            <button type="button" class="btn btn-outline-secondary btn-sm mt-2" :disabled="busy" @click="refresh">
              {{ t('common.retry') }}
            </button>
          </div>
          <div v-else-if="institution?.status === 'approved'" class="auth-field">
            <p class="form-label">{{ institution.organisation?.name }}</p>
            <p class="teacher-meta">{{ t('ui.connections_org_approved') }}</p>
            <button type="button" class="btn auth-submit" :disabled="busy" @click="advanceFromInstitution">
              {{ t('ui.connections_continue') }}
            </button>
          </div>
          <div v-else class="auth-field">
            <label class="form-label" for="connections-org-type">{{ t('ui.connections_institution_title') }}</label>
            <p class="teacher-meta">{{ t('ui.connections_institution_help') }}</p>
            <select id="connections-org-type" v-model="organisationType" class="form-select" :disabled="busy">
              <option value="">{{ t('ui.auth_org_type_placeholder') }}</option>
              <option v-for="type in organisationTypes" :key="type" :value="type">{{ t(`ui.auth_org_type_${type}`) }}</option>
            </select>
            <label class="form-label mt-2" for="connections-org-search">{{ t('ui.auth_org_name') }}</label>
            <input
              id="connections-org-search"
              v-model="organisationSearch"
              type="search"
              class="form-control"
              :placeholder="t('ui.connections_institution_search')"
              maxlength="120"
              autocomplete="organization"
              :disabled="busy || !organisationType"
            >
            <div v-if="filteredInstitutions.length" class="auth-org-names mt-2" role="listbox" :aria-label="t('ui.auth_org_name')">
              <button
                v-for="row in filteredInstitutions"
                :key="`${row.type}-${row.name}`"
                type="button"
                class="auth-choice"
                :class="{ 'is-selected': organisationName === row.name }"
                :disabled="busy"
                @click="pickInstitution(row.name)"
              >
                <span class="auth-choice__mark" aria-hidden="true"></span>
                <span class="auth-choice__label">{{ row.name }}</span>
              </button>
            </div>
            <p v-else-if="organisationType && organisationSearch.trim()" class="teacher-meta mt-2 mb-0">
              {{ t('ui.auth_org_name_none_for_type') }}
            </p>
            <input
              v-model="organisationName"
              type="text"
              class="form-control mt-2"
              :placeholder="t('ui.auth_org_name_custom_placeholder')"
              maxlength="120"
              :disabled="busy || !organisationType"
            >
            <button
              type="button"
              class="btn auth-submit mt-2"
              :disabled="busy || !organisationType || !organisationName.trim()"
              @click="saveInstitution"
            >
              {{ t('ui.connections_continue') }}
            </button>
            <button type="button" class="btn btn-outline-secondary btn-sm mt-2" :disabled="busy" @click="skipInstitutionIndependently">
              {{ t('ui.connections_work_independently') }}
            </button>
          </div>
        </template>

        <template v-else-if="currentStep === 'class'">
          <div v-if="isTeacher" class="auth-field">
            <label class="form-label" for="connections-group">{{ t('ui.connections_class_title') }}</label>
            <input
              id="connections-group"
              v-model="groupName"
              type="text"
              class="form-control"
              maxlength="120"
              :placeholder="t('teacher.group_name')"
              :disabled="busy"
            >
            <button type="button" class="btn auth-submit mt-2" :disabled="busy || !groupName.trim()" @click="saveTeacherClass">
              {{ t('ui.connections_continue') }}
            </button>
            <button type="button" class="btn btn-outline-secondary btn-sm mt-2" :disabled="busy" @click="skip('class')">
              {{ t('ui.connections_skip') }}
            </button>
          </div>
          <div v-else class="auth-field">
            <label class="form-label" for="connections-invite">{{ t('ui.connections_join_code') }}</label>
            <p class="teacher-meta">{{ t('ui.connections_join_code_help') }}</p>
            <input id="connections-invite" v-model="inviteCode" type="text" class="form-control" maxlength="64" :disabled="busy">
            <button type="button" class="btn auth-submit mt-2" :disabled="busy || !inviteCode.trim()" @click="saveInviteCode">
              {{ t('ui.connections_join_code_action') }}
            </button>
            <button type="button" class="btn btn-outline-secondary btn-sm mt-2" :disabled="busy" @click="skip('class')">
              {{ t('ui.connections_skip') }}
            </button>
          </div>
        </template>

        <template v-else-if="currentStep === 'import'">
          <div class="auth-field">
            <p class="form-label">{{ t('teacher.import_onboarding_title') }}</p>
            <p class="teacher-meta">{{ t('teacher.import_onboarding_help') }}</p>
            <a class="btn auth-submit" href="/teacher?import=1&view=students">{{ t('teacher.import_onboarding_open') }}</a>
            <button type="button" class="btn btn-outline-secondary btn-sm mt-2" :disabled="busy" @click="skip('import')">
              {{ t('teacher.import_onboarding_skip') }}
            </button>
          </div>
        </template>

        <template v-else-if="currentStep === 'invite'">
          <div class="auth-field">
            <p class="form-label">{{ t('ui.connections_invite_title') }}</p>
            <p class="teacher-meta">{{ t('ui.connections_invite_created') }}</p>
            <p v-if="classInviteCode" class="mb-2"><strong>{{ classInviteCode }}</strong></p>
            <button v-if="classInviteCode" type="button" class="btn btn-outline-secondary btn-sm" @click="copyInvite">
              {{ copied ? t('ui.connections_copied') : t('ui.connections_copy_code') }}
            </button>
            <button
              v-else-if="taughtGroups[0]?.id"
              type="button"
              class="btn btn-primary btn-sm"
              :disabled="busy"
              @click="createInviteForGroup(taughtGroups[0].id)"
            >
              {{ t('ui.connections_invite_title') }}
            </button>
            <button type="button" class="btn auth-submit mt-3" :disabled="busy" @click="goNextAfter('invite')">
              {{ t('ui.connections_continue') }}
            </button>
            <button type="button" class="btn btn-outline-secondary btn-sm mt-2" :disabled="busy" @click="skip('invite')">
              {{ t('ui.connections_skip') }}
            </button>
          </div>
        </template>

        <template v-else-if="currentStep === 'consent'">
          <div class="auth-field">
            <p class="form-label">{{ t('ui.connections_consent_title') }}</p>
            <p class="teacher-meta">{{ t('ui.connections_consent_help') }}</p>
            <ul v-if="pendingConsent.length" class="list-unstyled mb-0">
              <li v-for="membership in pendingConsent" :key="membership.id" class="d-flex justify-content-between align-items-center gap-2 mb-2">
                <span>{{ membership.group?.name || ('#' + membership.id) }}</span>
                <button type="button" class="btn btn-primary btn-sm" :disabled="busy" @click="grantConsent(membership.id)">
                  {{ t('ui.connections_continue') }}
                </button>
              </li>
            </ul>
            <button v-else type="button" class="btn auth-submit" :disabled="busy" @click="goNextAfter('consent')">
              {{ t('ui.connections_continue') }}
            </button>
          </div>
        </template>

        <template v-else-if="currentStep === 'parent'">
          <div v-if="isParent" class="auth-field">
            <p class="form-label">{{ t('ui.connections_parent_title') }}</p>
            <p class="teacher-meta">{{ t('ui.connections_parent_help') }}</p>
            <label class="form-label" for="connections-parent-token">{{ t('ui.connections_parent_invite_token') }}</label>
            <input id="connections-parent-token" v-model="parentInviteToken" type="text" class="form-control" maxlength="64" :disabled="busy">
            <button type="button" class="btn auth-submit mt-2" :disabled="busy || !parentInviteToken.trim()" @click="acceptParentInvite">
              {{ t('ui.connections_continue') }}
            </button>
            <hr class="my-3">
            <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="busy" @click="issueParentCode">
              {{ t('ui.connections_parent_create_code') }}
            </button>
            <p v-if="issuedParentCode" class="teacher-meta mt-2 mb-0">
              {{ t('ui.connections_parent_code_once') }} <strong>{{ issuedParentCode }}</strong>
            </p>
            <ul v-if="children.length" class="list-unstyled mt-3 mb-0">
              <li v-for="child in children" :key="child.id" class="teacher-meta">{{ child.child_name }} · {{ child.status }}</li>
            </ul>
            <button type="button" class="btn btn-outline-secondary btn-sm mt-3" :disabled="busy" @click="skip('parent')">
              {{ t('ui.connections_skip') }}
            </button>
            <button type="button" class="btn auth-submit mt-2" :disabled="busy" @click="finish">
              {{ t('ui.connections_finish') }}
            </button>
          </div>
          <div v-else class="auth-field">
            <p class="form-label">{{ t('ui.connections_parent_optional_title') }}</p>
            <p class="teacher-meta">{{ t('ui.connections_parent_optional_help') }}</p>
            <input v-model="parentLinkCode" type="text" class="form-control" maxlength="32" :disabled="busy" :placeholder="t('ui.connections_parent_code_placeholder')">
            <button type="button" class="btn auth-submit mt-2" :disabled="busy || !parentLinkCode.trim()" @click="redeemParentCode">
              {{ t('ui.connections_continue') }}
            </button>
            <button type="button" class="btn btn-outline-secondary btn-sm mt-2" :disabled="busy" @click="skip('parent')">
              {{ t('ui.connections_skip') }}
            </button>
          </div>
        </template>

        <template v-else>
          <p class="teacher-meta">{{ t('ui.connections_ready_lede') }}</p>
          <button type="button" class="btn auth-submit" :disabled="busy" @click="finish">
            {{ t('ui.connections_finish') }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import { i18nMixin } from '../mixins/i18nMixin'

export default {
  name: 'ConnectionOnboarding',
  mixins: [i18nMixin],
  props: {
    auth: { type: Object, required: true },
  },
  data() {
    return {
      organisationType: '',
      organisationName: '',
      organisationSearch: '',
      organisationCatalog: Array.isArray(this.auth.organisation_catalog) ? this.auth.organisation_catalog : [],
      groupName: '',
      inviteCode: this.auth.class_invite || '',
      parentLinkCode: '',
      parentInviteToken: '',
      issuedParentCode: '',
      classInviteCode: '',
      copied: false,
      organisationTypes: [],
      groupMemberships: [],
      taughtGroups: [],
      children: [],
      institution: null,
      onboarding: this.auth.connection_onboarding || { completed: [], skipped: [], finished: false },
      busy: false,
      error: '',
      notice: '',
      homeUrl: this.auth.home_url || '/',
      accountRole: this.auth.account_role || null,
      isTeacherFlag: false,
      isStudentFlag: false,
      isParentFlag: false,
      features: {
        teacher: Boolean(this.auth.teacher_features_enabled),
        parent: Boolean(this.auth.parent_features_enabled),
      },
      stepIndex: 0,
      bootstrapped: false,
    }
  },
  computed: {
    isTeacher() {
      return this.isTeacherFlag || this.accountRole === 'teacher'
    },
    isStudent() {
      return this.isStudentFlag || this.accountRole === 'student'
    },
    isParent() {
      return this.isParentFlag || this.accountRole === 'parent'
    },
    pendingConsent() {
      return this.groupMemberships.filter((row) => row.role === 'student' && row.consent !== 'granted' && row.status !== 'rejected')
    },
    filteredInstitutions() {
      if (!this.organisationType) return []
      const needle = this.organisationSearch.trim().toLowerCase()
      return this.organisationCatalog
        .filter((row) => row.type === this.organisationType)
        .filter((row) => !needle || String(row.name || '').toLowerCase().includes(needle))
        .slice(0, 12)
    },
    connectionStatusLabel() {
      if (this.institution?.status === 'pending') return this.t('ui.connections_status_pending')
      if (this.institution?.status === 'approved') return this.t('ui.connections_status_connected')
      if (this.isParent && this.children.length) return this.t('ui.connections_status_connected')
      if (this.groupMemberships.some((row) => row.status === 'approved' || row.status === 'pending')) {
        return this.t('ui.connections_status_connected')
      }
      return this.t('ui.connections_status_none')
    },
    steps() {
      const list = []
      if (this.features.teacher && this.isTeacher) {
        list.push('institution', 'class', 'import', 'invite')
      } else if (this.features.teacher && (this.isStudent || !this.accountRole)) {
        list.push('class')
        if (this.pendingConsent.length) list.push('consent')
      }
      if (this.features.parent && this.isParent) {
        list.push('parent')
      } else if (this.features.parent && this.isStudent) {
        list.push('parent')
      }
      list.push('done')
      return list
    },
    currentStep() {
      return this.steps[this.stepIndex] || 'done'
    },
    stepLede() {
      if (this.currentStep === 'institution') return this.t('ui.connections_institution_title')
      if (this.currentStep === 'class') {
        return this.isTeacher ? this.t('ui.connections_class_title') : this.t('ui.connections_join_code')
      }
      if (this.currentStep === 'import') return this.t('teacher.import_onboarding_title')
      if (this.currentStep === 'invite') return this.t('ui.connections_invite_title')
      if (this.currentStep === 'consent') return this.t('ui.connections_consent_title')
      if (this.currentStep === 'parent') return this.t('ui.connections_parent_title')
      return this.t('ui.connections_connect_lede')
    },
  },
  async mounted() {
    await this.refresh()
    this.bootstrapped = true
    this.syncStepFromState()
    if (this.inviteCode && (this.isStudent || !this.accountRole)) {
      this.stepIndex = Math.max(this.steps.indexOf('class'), 0)
      await this.saveInviteCode()
    }
  },
  methods: {
    async refresh() {
      try {
        const { data } = await axios.get(this.auth.api_url, {
          headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        })
        this.applyPayload(data)
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('teacher.action_failed')
      }
    },
    applyPayload(data) {
      this.accountRole = data.user?.account_role || this.accountRole
      this.isTeacherFlag = Boolean(data.user?.is_teacher)
      this.isStudentFlag = Boolean(data.user?.is_student)
      this.isParentFlag = Boolean(data.user?.is_parent)
      this.organisationTypes = data.organisation_types || []
      this.groupMemberships = data.group_memberships || []
      this.taughtGroups = data.taught_groups || []
      this.children = data.children || []
      this.institution = data.institution || null
      this.onboarding = data.onboarding || this.onboarding
      this.features = data.features || this.features
      this.homeUrl = data.home_url || this.homeUrl
      if (data.class_invite?.code) this.classInviteCode = data.class_invite.code
      if (data.parent_link_code?.code) this.issuedParentCode = data.parent_link_code.code
    },
    pickInstitution(name) {
      this.organisationName = name
      this.organisationSearch = name
    },
    syncStepFromState() {
      const done = new Set([...(this.onboarding.completed || []), ...(this.onboarding.skipped || [])])
      let index = 0
      for (let i = 0; i < this.steps.length; i += 1) {
        const step = this.steps[i]
        if (step === 'done') {
          index = i
          break
        }
        if (step === 'institution' && this.institution?.status === 'approved') {
          index = i + 1
          continue
        }
        if (step === 'institution' && this.institution?.status === 'pending') {
          index = i
          break
        }
        if (step === 'consent' && !this.pendingConsent.length) {
          index = i + 1
          continue
        }
        if (done.has(step)) {
          index = i + 1
          continue
        }
        index = i
        break
      }
      this.stepIndex = Math.min(index, this.steps.length - 1)
    },
    async patch(payload) {
      this.busy = true
      this.error = ''
      this.notice = ''
      try {
        const { data } = await axios.patch(this.auth.api_url, payload, {
          headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': this.auth.csrf_token,
          },
        })
        this.applyPayload(data)
        return data
      } catch (error) {
        const errors = error?.response?.data?.errors
        this.error = (errors && Object.values(errors).flat()[0]) || error?.response?.data?.message || this.t('teacher.action_failed')
        throw error
      } finally {
        this.busy = false
      }
    },
    goNextAfter(step) {
      const index = this.steps.indexOf(step)
      this.stepIndex = index >= 0 ? Math.min(index + 1, this.steps.length - 1) : this.stepIndex + 1
      if (this.currentStep === 'done') this.finish()
    },
    async saveInstitution() {
      const data = await this.patch({
        step: 'institution',
        organisation_type: this.organisationType,
        organisation_name: this.organisationName.trim(),
      })
      if (data.institution?.status === 'pending' || data.institution_result?.status === 'pending') {
        this.notice = this.t('ui.connections_org_pending_help')
        this.stepIndex = this.steps.indexOf('institution')
        return
      }
      this.goNextAfter('institution')
    },
    advanceFromInstitution() {
      this.goNextAfter('institution')
    },
    async skipInstitutionIndependently() {
      await this.patch({ step: 'institution', skip: true })
      await this.finish()
    },
    async saveTeacherClass() {
      if (this.institution?.status !== 'approved') {
        this.error = this.t('ui.connections_org_pending_help')
        this.stepIndex = Math.max(this.steps.indexOf('institution'), 0)
        return
      }
      await this.patch({ step: 'class', group_name: this.groupName.trim() })
      this.notice = this.t('ui.connections_invite_created')
      this.goNextAfter('class')
    },
    async saveInviteCode() {
      await this.patch({ step: 'class', invite_code: this.inviteCode.trim() })
      this.inviteCode = ''
      this.notice = this.t('ui.connections_joined_pending')
      if (this.pendingConsent.length && this.steps.includes('consent')) {
        this.stepIndex = this.steps.indexOf('consent')
        return
      }
      this.goNextAfter('class')
    },
    async createInviteForGroup(groupId) {
      await this.patch({ step: 'invite', create_class_invite: true, group_id: groupId })
      this.notice = this.t('ui.connections_invite_created')
    },
    async grantConsent(membershipId) {
      await this.patch({ step: 'consent', membership_id: membershipId })
      if (!this.pendingConsent.length) this.goNextAfter('consent')
    },
    async redeemParentCode() {
      await this.patch({ step: 'parent', parent_link_code: this.parentLinkCode.trim() })
      this.parentLinkCode = ''
      this.finish()
    },
    async acceptParentInvite() {
      await this.patch({ step: 'parent', parent_invite_token: this.parentInviteToken.trim() })
      this.parentInviteToken = ''
      this.notice = this.t('ui.connections_parent_linked')
    },
    async issueParentCode() {
      await this.patch({ step: 'parent', issue_parent_code: true })
      this.notice = this.t('ui.connections_parent_code_once')
    },
    async skip(step) {
      await this.patch({ step, skip: true })
      this.goNextAfter(step)
    },
    async copyInvite() {
      if (!this.classInviteCode || !navigator.clipboard) return
      await navigator.clipboard.writeText(this.classInviteCode)
      this.copied = true
      setTimeout(() => { this.copied = false }, 1500)
    },
    async finish() {
      try {
        const data = await this.patch({ finish: true })
        window.location.href = data.home_url || this.homeUrl
      } catch {
        /* error already set */
      }
    },
  },
}
</script>
