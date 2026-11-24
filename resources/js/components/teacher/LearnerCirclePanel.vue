<template>
  <section class="teacher-pane learner-circle" :aria-label="t('ui.connections_my_title')">
    <header class="teacher-pane__head">
      <div class="teacher-pane__titles">
        <h2 class="teacher-pane__title">{{ t('ui.connections_my_title') }}</h2>
        <p class="teacher-pane__hint">{{ t('ui.connections_circle_hint') }}</p>
      </div>
    </header>
    <div class="teacher-pane__body">
      <form class="d-flex flex-wrap gap-2 mb-3" @submit.prevent="redeemInvite">
        <label class="visually-hidden" for="learner-class-invite">{{ t('ui.connections_join_code') }}</label>
        <input
          id="learner-class-invite"
          v-model="inviteCode"
          class="form-control"
          maxlength="2048"
          autocomplete="off"
          spellcheck="false"
          :placeholder="t('ui.connections_join_code')"
          :disabled="busy"
        >
        <button type="submit" class="btn btn-primary btn-sm" :disabled="busy || !inviteCode.trim()">
          {{ t('ui.connections_join_code_action') }}
        </button>
      </form>
      <p v-if="error" class="teacher-account__error" role="alert">{{ error }}</p>
      <p v-if="notice" class="teacher-meta" role="status">{{ notice }}</p>

      <template v-if="needsConsent.length">
        <h3 class="teacher-pane__title learner-circle__subhead">{{ t('ui.connections_consent_title') }}</h3>
        <ul class="learner-circle__list">
          <li v-for="membership in needsConsent" :key="membership.id" class="learner-circle__guardian">
            <strong>{{ membership.group?.name || ('#' + membership.id) }}</strong>
            <button type="button" class="btn btn-primary btn-sm" :disabled="busy" @click="grantConsent(membership.id)">
              {{ t('ui.connections_continue') }}
            </button>
          </li>
        </ul>
      </template>

      <h3 class="teacher-pane__title learner-circle__subhead">{{ t('dashboard.circle_teachers_title') }}</h3>
      <p v-if="!teachers.length" class="teacher-meta">{{ t('ui.connections_empty') }}</p>
      <ul v-else class="learner-circle__list">
        <li v-for="teacher in teachers" :key="teacher.id" class="learner-circle__teacher">
          <div class="learner-circle__copy">
            <strong>{{ teacher.name }}</strong>
            <p class="teacher-meta">{{ t('dashboard.circle_teacher_line') }}</p>
          </div>
          <div class="learner-circle__actions">
            <button v-if="teacher.can_message" type="button" class="dash-btn dash-btn--ghost dash-btn--sm" @click="$emit('message', teacher.id)">
              {{ t('dashboard.circle_message') }}
            </button>
            <button v-if="showLearning" type="button" class="dash-btn dash-btn--ghost dash-btn--sm" @click="$emit('learning')">
              {{ t('dashboard.circle_open_learning') }}
            </button>
          </div>
        </li>
      </ul>

      <template v-if="pendingGuardians.length">
        <h3 class="teacher-pane__title learner-circle__subhead">{{ t('ui.connections_pending_guardians') }}</h3>
        <ul class="learner-circle__list">
          <li v-for="guardian in pendingGuardians" :key="guardian.id" class="learner-circle__guardian">
            <strong>{{ guardian.display_name || guardian.relationship }}</strong>
            <span class="learner-circle__actions">
              <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="busy" @click="rejectGuardian(guardian.id)">
                {{ t('ui.connections_reject_guardian') }}
              </button>
              <button type="button" class="btn btn-primary btn-sm" :disabled="busy" @click="approveGuardian(guardian.id)">
                {{ t('ui.connections_approve_guardian') }}
              </button>
            </span>
          </li>
        </ul>
      </template>

      <template v-if="guardians.length">
        <h3 class="teacher-pane__title learner-circle__subhead">{{ t('dashboard.circle_guardians_title') }}</h3>
        <ul class="learner-circle__list">
          <li v-for="guardian in guardians" :key="guardian.id" class="learner-circle__guardian">
            <strong>{{ guardian.display_name || guardian.relationship }}</strong>
            <span class="teacher-fact">{{ t('dashboard.circle_guardian_connected') }}</span>
          </li>
        </ul>
      </template>
    </div>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'

export default {
  name: 'LearnerCirclePanel',
  mixins: [i18nMixin],
  props: {
    circle: { type: Object, default: null },
    showLearning: { type: Boolean, default: true },
  },
  emits: ['message', 'learning', 'updated'],
  data() {
    return {
      inviteCode: '',
      busy: false,
      error: '',
      notice: '',
    }
  },
  computed: {
    teachers() {
      return Array.isArray(this.circle?.teachers) ? this.circle.teachers : []
    },
    guardians() {
      return Array.isArray(this.circle?.guardians) ? this.circle.guardians : []
    },
    pendingGuardians() {
      return Array.isArray(this.circle?.pending_guardians) ? this.circle.pending_guardians : []
    },
    needsConsent() {
      return (Array.isArray(this.circle?.memberships) ? this.circle.memberships : [])
        .filter((row) => row.consent !== 'granted' && row.status !== 'rejected')
    },
  },
  methods: {
    errorMessage(error) {
      const status = Number(error?.response?.status || 0)
      if (status === 429) return this.t('ui.connections_invite_throttled')
      const errors = error?.response?.data?.errors
      const first = errors ? Object.values(errors).flat().find(Boolean) : ''
      return first || error?.response?.data?.message || this.t('teacher.action_failed')
    },
    async redeemInvite() {
      if (!this.inviteCode.trim() || this.busy) return
      this.busy = true
      this.error = ''
      this.notice = ''
      try {
        const payload = await learningApi.redeemLearnerClassInvite(this.inviteCode.trim())
        this.inviteCode = ''
        this.notice = this.t('ui.connections_joined_pending')
        this.$emit('updated', payload)
      } catch (error) {
        this.error = this.errorMessage(error)
      } finally {
        this.busy = false
      }
    },
    async grantConsent(membershipId) {
      if (!membershipId || this.busy) return
      this.busy = true
      this.error = ''
      try {
        const payload = await learningApi.grantLearnerConsent(membershipId)
        this.$emit('updated', payload)
      } catch (error) {
        this.error = this.errorMessage(error)
      } finally {
        this.busy = false
      }
    },
    async approveGuardian(linkId) {
      if (!linkId || this.busy) return
      this.busy = true
      this.error = ''
      try {
        const payload = await learningApi.approveLearnerGuardian(linkId)
        this.$emit('updated', payload)
      } catch (error) {
        this.error = this.errorMessage(error)
      } finally {
        this.busy = false
      }
    },
    async rejectGuardian(linkId) {
      if (!linkId || this.busy) return
      this.busy = true
      this.error = ''
      try {
        const payload = await learningApi.rejectLearnerGuardian(linkId)
        this.$emit('updated', payload)
      } catch (error) {
        this.error = this.errorMessage(error)
      } finally {
        this.busy = false
      }
    },
  },
}
</script>
