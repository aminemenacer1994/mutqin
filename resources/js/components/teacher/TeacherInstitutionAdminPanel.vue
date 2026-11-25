<template>
  <section v-if="institution?.organisation" class="card teacher-account teacher-account__institution" :aria-labelledby="headingId">
    <div class="teacher-account__section-head">
      <span class="teacher-account__section-icon" aria-hidden="true"><i class="bi bi-building-gear"></i></span>
      <div>
        <h2 :id="headingId">{{ t('teacher.institution_admin_title') }}</h2>
        <p>{{ t('teacher.institution_admin_hint') }}</p>
      </div>
    </div>

    <p v-if="loading" class="teacher-meta" role="status">{{ t('teacher.loading') }}</p>
    <p v-else-if="error" class="teacher-account__error" role="alert">{{ error }}</p>

    <template v-else>
      <form v-if="capabilities.manage_staff" class="teacher-account__create-class mb-3" @submit.prevent="saveProfile">
        <label class="visually-hidden" :for="nameId">{{ t('teacher.institution_name_label') }}</label>
        <input :id="nameId" v-model="profileName" type="text" maxlength="120" :placeholder="t('teacher.institution_name_label')" :disabled="profileBusy">
        <label class="visually-hidden" :for="summaryId">{{ t('teacher.institution_summary_label') }}</label>
        <textarea :id="summaryId" v-model="profileSummary" rows="2" maxlength="500" :placeholder="t('teacher.institution_summary_label')" :disabled="profileBusy"></textarea>
        <button type="submit" class="btn btn-outline-secondary btn-sm" :disabled="profileBusy">{{ profileBusy ? t('teacher.saving') : t('teacher.institution_save_profile') }}</button>
      </form>

      <div v-if="capabilities.manage_staff" class="teacher-account__create-class mb-3">
        <label class="visually-hidden" :for="inviteId">{{ t('teacher.institution_invite_label') }}</label>
        <input :id="inviteId" v-model="inviteEmail" type="email" maxlength="255" :placeholder="t('teacher.institution_invite_label')" :disabled="inviteBusy">
        <button type="button" class="btn btn-primary btn-sm" :disabled="inviteBusy || !inviteEmail.trim()" @click="sendInvite">{{ inviteBusy ? t('teacher.saving') : t('teacher.institution_invite_action') }}</button>
      </div>
      <p v-if="inviteUrl" class="teacher-meta mb-2">{{ t('teacher.institution_invite_url') }} <strong>{{ inviteUrl }}</strong></p>

      <h3 class="h6">{{ t('teacher.institution_staff_heading') }}</h3>
      <ul v-if="teacherStaff.length" class="teacher-account__member-list mb-3">
        <li v-for="row in teacherStaff" :key="row.membership_id">
          <span>
            <strong>{{ row.user?.name }}</strong>
            <small v-if="row.is_institution_admin">{{ t('teacher.org_admin_badge') }}</small>
          </span>
          <span v-if="capabilities.manage_staff && row.user?.id !== currentUserId" class="teacher-account__member-actions">
            <button type="button" class="btn btn-link btn-sm" :disabled="staffBusyId === row.membership_id" @click="toggleAdmin(row)">
              {{ row.is_institution_admin ? t('teacher.institution_remove_admin') : t('teacher.institution_make_admin') }}
            </button>
            <button type="button" class="btn btn-link btn-sm text-danger" :disabled="staffBusyId === row.membership_id" @click="revokeStaff(row)">{{ t('teacher.remove') }}</button>
          </span>
        </li>
      </ul>
      <p v-else class="teacher-account__empty">{{ t('teacher.org_teachers_empty') }}</p>

      <details v-if="capabilities.manage_staff && audit.length">
        <summary>{{ t('teacher.institution_audit_heading') }}</summary>
        <ul class="teacher-account__member-list mt-2">
          <li v-for="entry in audit" :key="entry.id">
            <strong>{{ entry.action }}</strong>
            <small>{{ entry.actor?.name || '—' }} · {{ formatAuditAt(entry.at) }}</small>
          </li>
        </ul>
      </details>
    </template>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'

export default {
  name: 'TeacherInstitutionAdminPanel',
  mixins: [i18nMixin],
  props: {
    currentUserId: { type: Number, default: null },
  },
  data() {
    const uid = Math.random().toString(36).slice(2, 9)
    return {
      headingId: `teacher-institution-admin-${uid}`,
      nameId: `teacher-institution-name-${uid}`,
      summaryId: `teacher-institution-summary-${uid}`,
      inviteId: `teacher-institution-invite-${uid}`,
      loading: true,
      error: '',
      institution: null,
      profileName: '',
      profileSummary: '',
      inviteEmail: '',
      inviteUrl: '',
      profileBusy: false,
      inviteBusy: false,
      staffBusyId: null,
    }
  },
  computed: {
    capabilities() {
      return this.institution?.capabilities || { institution_admin: false, manage_staff: false }
    },
    teacherStaff() {
      return (this.institution?.staff || []).filter((row) => row.role === 'teacher')
    },
    audit() {
      return this.institution?.audit || []
    },
  },
  mounted() {
    this.load()
  },
  methods: {
    errorMessage(error) {
      const errors = error?.response?.data?.errors
      const first = errors ? Object.values(errors).flat().find(Boolean) : ''
      return first || error?.response?.data?.message || this.t('teacher.action_failed')
    },
    formatAuditAt(iso) {
      if (!iso) return ''
      try {
        return new Date(iso).toLocaleString()
      } catch {
        return iso
      }
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        const payload = await learningApi.getInstitutionDashboard()
        this.institution = payload
        this.profileName = payload?.organisation?.name || ''
        this.profileSummary = payload?.organisation?.profile_summary || ''
      } catch (error) {
        this.error = this.errorMessage(error)
        this.institution = null
      } finally {
        this.loading = false
      }
    },
    async saveProfile() {
      if (this.profileBusy || !this.capabilities.manage_staff) return
      this.profileBusy = true
      this.error = ''
      try {
        await learningApi.updateInstitutionProfile({
          name: this.profileName.trim(),
          profile_summary: this.profileSummary.trim(),
        })
        await this.load()
      } catch (error) {
        this.error = this.errorMessage(error)
      } finally {
        this.profileBusy = false
      }
    },
    async sendInvite() {
      const email = this.inviteEmail.trim()
      if (!email || this.inviteBusy || !this.capabilities.manage_staff) return
      this.inviteBusy = true
      this.inviteUrl = ''
      this.error = ''
      try {
        const { invite_url: url } = await learningApi.inviteInstitutionTeacher(email)
        this.inviteUrl = url || ''
        this.inviteEmail = ''
        await this.load()
      } catch (error) {
        this.error = this.errorMessage(error)
      } finally {
        this.inviteBusy = false
      }
    },
    async revokeStaff(row) {
      if (!row?.membership_id || this.staffBusyId !== null) return
      this.staffBusyId = row.membership_id
      this.error = ''
      try {
        await learningApi.revokeInstitutionStaff(row.membership_id)
        await this.load()
      } catch (error) {
        this.error = this.errorMessage(error)
      } finally {
        this.staffBusyId = null
      }
    },
    async toggleAdmin(row) {
      if (!row?.membership_id || this.staffBusyId !== null) return
      this.staffBusyId = row.membership_id
      this.error = ''
      try {
        await learningApi.setInstitutionStaffAdmin(row.membership_id, !row.is_institution_admin)
        await this.load()
      } catch (error) {
        this.error = this.errorMessage(error)
      } finally {
        this.staffBusyId = null
      }
    },
  },
}
</script>