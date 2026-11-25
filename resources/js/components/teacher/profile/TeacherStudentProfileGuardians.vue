<template>
  <div class="teacher-guardians-page">
    <section class="teacher-guardians-intro" :aria-labelledby="introHeadingId">
      <h2 :id="introHeadingId" class="teacher-guardians-intro__title">{{ t('teacher.guardians_what_title') }}</h2>
      <p class="teacher-guardians-intro__lead">{{ t('teacher.guardians_intro') }}</p>
      <ul class="teacher-guardians-intro__list">
        <li>{{ t('teacher.guardians_bullet_invite') }}</li>
        <li>{{ t('teacher.guardians_bullet_accept') }}</li>
        <li>{{ t('teacher.guardians_bullet_scope') }}</li>
      </ul>
    </section>

    <section class="teacher-guardians-panel teacher-pane" :aria-labelledby="inviteHeadingId">
      <header class="teacher-guardians-panel__head">
        <h3 :id="inviteHeadingId">{{ t('teacher.guardians_invite_title') }}</h3>
        <p>{{ t('teacher.guardians_invite_hint') }}</p>
      </header>
      <div class="teacher-guardians-panel__body">
        <p v-if="loading" class="teacher-loading-inline" role="status">{{ t('teacher.loading') }}</p>
        <p v-else-if="error" class="alert alert-danger mb-0" role="alert">{{ error }}</p>
        <template v-else>
          <p v-if="notice" class="alert alert-success mb-0" role="status">{{ notice }}</p>
          <form class="teacher-guardians-invite" @submit.prevent="invite">
            <label class="teacher-guardians-invite__label" for="guardian-email">{{ t('teacher.guardians_email') }}</label>
            <div class="teacher-guardians-invite__row">
              <input id="guardian-email" v-model="email" type="email" class="form-control" required :placeholder="t('teacher.guardians_email_placeholder')" :disabled="saving">
              <button type="submit" class="btn btn-primary" :disabled="saving">{{ t('teacher.guardians_invite') }}</button>
            </div>
          </form>
          <p v-if="inviteUrl" class="teacher-meta teacher-guardians-invite__link mb-0">
            {{ t('teacher.guardians_copy') }}
            <a :href="inviteUrl">{{ inviteUrl }}</a>
          </p>
        </template>
      </div>
    </section>

    <section class="teacher-guardians-panel teacher-pane" :aria-labelledby="linkedHeadingId">
      <header class="teacher-guardians-panel__head">
        <h3 :id="linkedHeadingId">{{ t('teacher.guardians_linked_title') }}</h3>
        <p>{{ t('teacher.guardians_linked_hint') }}</p>
      </header>
      <div class="teacher-guardians-panel__body">
        <p v-if="loading" class="teacher-loading-inline" role="status">{{ t('teacher.loading') }}</p>
        <p v-else-if="!rows.length" class="teacher-meta mb-0">{{ t('teacher.guardians_empty') }}</p>
        <ul v-else class="teacher-guardians-list">
          <li v-for="row in rows" :key="`${row.kind}-${row.id}`" class="teacher-guardians-list__item">
            <div class="teacher-guardians-list__copy">
              <strong>{{ row.name || row.email }}</strong>
              <span class="teacher-pill">{{ statusLabel(row.status) }}</span>
              <p v-if="row.name" class="teacher-meta mb-0">{{ row.email }}</p>
              <p v-if="row.status === 'pending'" class="teacher-meta mb-0">{{ t('teacher.guardians_pending') }}</p>
            </div>
            <div class="teacher-guardians-list__actions">
              <button v-if="row.kind === 'invitation' && (row.status === 'pending' || row.status === 'expired')" type="button" class="btn btn-outline-secondary btn-sm" :disabled="saving" @click="resend(row)">{{ t('teacher.guardians_resend') }}</button>
              <button v-if="row.status === 'pending' || row.status === 'accepted'" type="button" class="btn btn-outline-secondary btn-sm" :disabled="saving" @click="revoke(row)">{{ t('teacher.guardians_revoke') }}</button>
            </div>
          </li>
        </ul>
      </div>
    </section>
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
      introHeadingId: `teacher-guardians-intro-${Math.random().toString(36).slice(2, 8)}`,
      inviteHeadingId: `teacher-guardians-invite-${Math.random().toString(36).slice(2, 8)}`,
      linkedHeadingId: `teacher-guardians-linked-${Math.random().toString(36).slice(2, 8)}`,
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