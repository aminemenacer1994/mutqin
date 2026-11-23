<template>
  <div class="teacher-pane">
    <header class="teacher-pane__head">
      <div>
        <h2 class="teacher-pane__title">{{ t('teacher.tab_guardians') }}</h2>
        <p class="teacher-pane__hint">{{ t('teacher.guardians_intro') }}</p>
      </div>
    </header>
    <div class="teacher-pane__body d-grid gap-3">
      <p v-if="loading" class="teacher-loading-inline" role="status">{{ t('teacher.loading') }}</p>
      <p v-else-if="error" class="alert alert-danger mb-0" role="alert">{{ error }}</p>
      <template v-else>
        <p v-if="notice" class="alert alert-success mb-0" role="status">{{ notice }}</p>
        <form class="d-flex flex-wrap gap-2" @submit.prevent="invite">
          <label class="visually-hidden" for="guardian-email">{{ t('teacher.guardians_email') }}</label>
          <input id="guardian-email" v-model="email" type="email" class="form-control" required :placeholder="t('teacher.guardians_email')" :disabled="saving">
          <button type="submit" class="btn btn-primary" :disabled="saving">{{ t('teacher.guardians_invite') }}</button>
        </form>
        <p v-if="inviteUrl" class="teacher-meta mb-0">
          {{ t('teacher.guardians_copy') }}
          <a :href="inviteUrl">{{ inviteUrl }}</a>
        </p>
        <p v-if="!rows.length" class="teacher-meta mb-0">{{ t('teacher.guardians_empty') }}</p>
        <ul v-else class="list-unstyled mb-0 d-grid gap-2">
          <li v-for="row in rows" :key="`${row.kind}-${row.id}`" class="teacher-pane">
            <div>
              <strong>{{ row.name || row.email }}</strong>
              <span class="teacher-pill ms-2">{{ statusLabel(row.status) }}</span>
              <p v-if="row.name" class="teacher-meta mb-0">{{ row.email }}</p>
            </div>
            <p v-if="row.status === 'pending'" class="teacher-meta mb-0">{{ t('teacher.guardians_pending') }}</p>
            <div class="d-flex flex-wrap gap-2 mt-2">
              <button v-if="row.kind === 'invitation' && (row.status === 'pending' || row.status === 'expired')" type="button" class="btn btn-outline-secondary btn-sm" :disabled="saving" @click="resend(row)">{{ t('teacher.guardians_resend') }}</button>
              <button v-if="row.status === 'pending' || row.status === 'accepted'" type="button" class="btn btn-outline-secondary btn-sm" :disabled="saving" @click="revoke(row)">{{ t('teacher.guardians_revoke') }}</button>
            </div>
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>

<script>
import { learningApi } from '../../../scripts/api/learning'
import { i18nMixin } from '../../../mixins/i18nMixin'

export default {
  name: 'TeacherStudentProfileGuardians',
  mixins: [i18nMixin],
  props: {
    studentId: { type: Number, required: true },
  },
  data() {
    return {
      loading: true,
      saving: false,
      error: '',
      notice: '',
      email: '',
      inviteUrl: '',
      invitations: [],
      guardians: [],
    }
  },
  computed: {
    rows() {
      const seen = new Set()
      const rows = []
      this.guardians.forEach((row) => {
        const key = String(row.email || '').toLowerCase()
        if (key) seen.add(key)
        rows.push(row)
      })
      this.invitations.forEach((row) => {
        const key = String(row.email || '').toLowerCase()
        if (key && seen.has(key) && row.status !== 'pending' && row.status !== 'expired') return
        rows.push(row)
      })
      return rows
    },
  },
  watch: {
    studentId: {
      immediate: true,
      handler() {
        this.load()
      },
    },
  },
  methods: {
    statusLabel(status) {
      const key = `teacher.guardians_status_${status}`
      const label = this.t(key)
      return label && label !== key ? label : status
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        const data = await learningApi.getTeacherGuardians(this.studentId)
        this.invitations = Array.isArray(data.invitations) ? data.invitations : []
        this.guardians = Array.isArray(data.guardians) ? data.guardians : []
      } catch {
        this.error = this.t('teacher.guardians_failed')
      } finally {
        this.loading = false
      }
    },
    async invite() {
      this.saving = true
      this.notice = ''
      this.error = ''
      try {
        const data = await learningApi.inviteTeacherGuardian(this.studentId, this.email)
        this.inviteUrl = data.invite_url || ''
        this.email = ''
        this.notice = this.t('teacher.guardians_saved')
        await this.load()
      } catch (error) {
        this.error = error?.response?.data?.errors?.email?.[0] || this.t('teacher.guardians_failed')
      } finally {
        this.saving = false
      }
    },
    async resend(row) {
      this.saving = true
      this.error = ''
      try {
        const data = await learningApi.resendTeacherGuardianInvitation(row.id)
        this.inviteUrl = data.invite_url || ''
        this.notice = this.t('teacher.guardians_saved')
        await this.load()
      } catch {
        this.error = this.t('teacher.guardians_failed')
      } finally {
        this.saving = false
      }
    },
    async revoke(row) {
      this.saving = true
      this.error = ''
      try {
        if (row.kind === 'link') await learningApi.revokeTeacherGuardianLink(this.studentId, row.id)
        else await learningApi.revokeTeacherGuardianInvitation(row.id)
        this.notice = this.t('teacher.guardians_saved')
        await this.load()
      } catch {
        this.error = this.t('teacher.guardians_failed')
      } finally {
        this.saving = false
      }
    },
  },
}
</script>
