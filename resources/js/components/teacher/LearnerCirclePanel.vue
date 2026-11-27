<template>
  <section
    class="learner-circle"
    :class="sectionClass"
    :aria-label="hub ? t('dashboard.settings_teachers_title') : t('teacher.learner_teachers_classes_title')"
  >
    <header v-if="!embedded && !hub && !guardiansSection" class="teacher-pane__head">
      <div class="teacher-pane__titles">
        <h2 class="teacher-pane__title">{{ t('ui.connections_my_title') }}</h2>
        <p class="teacher-pane__hint">{{ t('ui.connections_circle_hint') }}</p>
      </div>
    </header>
    <div :class="bodyClass">
      <template v-if="showTeacherInviteBlock">
        <form class="learner-circle__invite" @submit.prevent="onInviteSubmit">
          <label class="form-label" for="learner-class-invite">{{ t('ui.connections_join_code') }}</label>
          <p id="learner-class-invite-help" class="teacher-meta learner-circle__invite-help">{{ t('ui.connections_join_code_help') }}</p>
          <div class="learner-circle__invite-row">
            <input
              id="learner-class-invite"
              v-model="inviteCode"
              class="form-control"
              maxlength="2048"
              autocomplete="off"
              aria-describedby="learner-class-invite-help"
              spellcheck="false"
              :placeholder="t('ui.connections_join_code')"
              :disabled="busy"
            >
            <button type="submit" class="dash-btn dash-btn--primary dash-btn--sm btn btn-primary btn-sm" :disabled="busy || !inviteCode.trim()">
              {{ invitePreview ? t('ui.connections_continue') : t('ui.connections_join_code_action') }}
            </button>
          </div>
        </form>

        <div v-if="invitePreview" class="learner-circle__confirm card" role="region" :aria-labelledby="`${uid}-preview`">
          <h3 :id="`${uid}-preview`" class="teacher-pane__title learner-circle__subhead">{{ t('ui.connections_invite_preview_title') }}</h3>
          <dl class="learner-circle__preview">
            <div>
              <dt>{{ t('ui.connections_invite_preview_class') }}</dt>
              <dd>{{ displayClassName(invitePreview.class_name) }}</dd>
            </div>
            <div v-if="invitePreview.independent">
              <dt>{{ t('ui.connections_invite_preview_org') }}</dt>
              <dd>{{ t('ui.connections_invite_preview_independent') }}</dd>
            </div>
            <div v-else-if="invitePreview.organisation_name">
              <dt>{{ t('ui.connections_invite_preview_org') }}</dt>
              <dd>{{ invitePreview.organisation_name }}</dd>
            </div>
          </dl>
          <p v-if="invitePreview.already_joined" class="alert alert-danger" role="alert">{{ t('ui.connections_already_joined') }}</p>
          <div class="learner-circle__actions learner-circle__actions--wrap">
            <button type="button" class="dash-btn dash-btn--ghost dash-btn--sm btn btn-outline-secondary btn-sm" :disabled="busy" @click="clearInvitePreview">
              {{ t('ui.connections_invite_cancel') }}
            </button>
            <button
              type="button"
              class="dash-btn dash-btn--primary dash-btn--sm btn btn-primary btn-sm"
              :disabled="busy || invitePreview.already_joined"
              @click="confirmRedeem"
            >
              {{ t('ui.connections_invite_confirm') }}
            </button>
          </div>
        </div>
      </template>

      <p v-if="error" class="alert alert-danger" role="alert">{{ error }}</p>
      <p v-if="notice" class="alert alert-success" role="status">{{ notice }}</p>

      <div
        v-if="showRelationshipHub && studentInstitution"
        class="learner-circle__institution"
        role="region"
        :aria-labelledby="`${uid}-institution`"
      >
        <h3 :id="`${uid}-institution`" class="learner-circle__subhead teacher-pane__title">{{ t('ui.connections_student_institution_title') }}</h3>
        <p class="teacher-meta">
          <strong>{{ studentInstitution.name }}</strong>
          <span v-if="studentInstitution.type" class="learner-circle__badge is-institution">{{ studentInstitution.type }}</span>
        </p>
      </div>

      <template v-if="needsConsent.length && showTeacherInviteBlock">
        <h3 class="teacher-pane__title learner-circle__subhead">{{ t('ui.connections_consent_title') }}</h3>
        <p class="teacher-meta">{{ t('ui.connections_consent_help') }}</p>
        <ul class="learner-circle__list">
          <li v-for="membership in needsConsent" :key="membership.id" class="learner-circle__guardian">
            <strong>{{ displayClassName(membership.group?.name) }}</strong>
            <button type="button" class="dash-btn dash-btn--primary dash-btn--sm btn btn-primary btn-sm" :disabled="busy" @click="grantConsent(membership.id)">
              {{ t('ui.connections_continue') }}
            </button>
          </li>
        </ul>
      </template>

      <template v-if="showRelationshipHub">
        <h3 class="teacher-pane__title learner-circle__subhead">{{ t('ui.connections_relationship_groups_title') }}</h3>
        <p v-if="!relationshipGroups.length" class="teacher-meta">{{ t('ui.connections_empty') }}</p>
        <div v-else class="learner-circle__groups">
          <details
            v-for="group in relationshipGroups"
            :key="group.key"
            class="learner-circle__group"
            :aria-label="groupOrganisationLabel(group)"
          >
            <summary class="learner-circle__group-head">
              <h4>{{ groupOrganisationLabel(group) }}</h4>
              <span
                class="learner-circle__badge"
                :class="group.independent ? 'is-muted' : 'is-institution'"
              >{{ group.independent ? t('ui.connections_teacher_independent') : t('ui.connections_teacher_institution') }}</span>
              <i class="bi bi-chevron-down learner-circle__group-chevron" aria-hidden="true"></i>
            </summary>
            <ul v-if="group.classes.length" class="learner-circle__list learner-circle__list--memberships">
              <li v-for="classRow in group.classes" :key="`class-${classRow.id}`" class="learner-circle__membership">
                <div class="learner-circle__copy">
                  <strong>{{ classRow.name }}</strong>
                  <p class="teacher-meta">
                    <span class="learner-circle__badge" :class="membershipStatusClass(classRow.membership)">{{ membershipStatusLabel(classRow.membership) }}</span>
                    <span>{{ t('ui.connections_class_row_label') }}</span>
                  </p>
                </div>
                <button
                  v-if="classRow.canLeave"
                  type="button"
                  class="dash-btn dash-btn--ghost dash-btn--sm btn btn-outline-secondary btn-sm"
                  :disabled="busy"
                  :title="t('ui.connections_membership_leave_impact')"
                  @click="leaveMembership(classRow.id)"
                >
                  {{ t('ui.connections_membership_leave') }}
                </button>
                <span v-else-if="classRow.leaveRestricted" class="teacher-fact">{{ t('ui.connections_membership_leave_blocked') }}</span>
              </li>
            </ul>
            <ul v-if="group.teachers.length" class="learner-circle__list">
              <li v-for="teacher in group.teachers" :key="`teacher-${teacher.id}`" class="learner-circle__teacher">
                <div class="learner-circle__copy">
                  <strong>{{ teacher.name }}</strong>
                  <p v-if="teacherClassLine(teacher)" class="teacher-meta">{{ teacherClassLine(teacher) }}</p>
                </div>
                <div class="learner-circle__actions">
                  <button v-if="teacher.can_message" type="button" class="dash-btn dash-btn--ghost dash-btn--sm btn btn-outline-secondary btn-sm" @click="$emit('message', teacher.id)">
                    {{ t('dashboard.circle_message') }}
                  </button>
                  <button v-if="showLearning" type="button" class="dash-btn dash-btn--ghost dash-btn--sm btn btn-outline-secondary btn-sm" @click="$emit('learning')">
                    {{ t('dashboard.circle_open_learning') }}
                  </button>
                </div>
              </li>
            </ul>
          </details>
        </div>
      </template>

      <template v-else-if="showTeacherInviteBlock && !guardiansSection">
        <template v-if="activeMemberships.length">
          <h3 class="teacher-pane__title learner-circle__subhead">{{ t('ui.connections_settings_teachers_title') }}</h3>
          <ul class="learner-circle__list learner-circle__list--memberships">
            <li v-for="membership in activeMemberships" :key="membership.id" class="learner-circle__membership">
              <div class="learner-circle__copy">
                <strong>{{ displayClassName(membership.group?.name) }}</strong>
                <p class="teacher-meta">
                  <span class="learner-circle__badge" :class="membershipStatusClass(membership)">{{ membershipStatusLabel(membership) }}</span>
                  <span v-if="membership.organisation_name"> · {{ membership.organisation_name }}</span>
                  <span v-else-if="membership.independent"> · {{ t('ui.connections_teacher_independent') }}</span>
                </p>
              </div>
              <button
                v-if="membership.can_leave"
                type="button"
                class="dash-btn dash-btn--ghost dash-btn--sm btn btn-outline-secondary btn-sm"
                :disabled="busy"
                :title="t('ui.connections_membership_leave_impact')"
                @click="leaveMembership(membership.id)"
              >
                {{ t('ui.connections_membership_leave') }}
              </button>
              <span v-else-if="membership.leave_restricted" class="teacher-fact">{{ t('ui.connections_membership_leave_blocked') }}</span>
            </li>
          </ul>
        </template>

        <h3 class="teacher-pane__title learner-circle__subhead">{{ t('dashboard.circle_teachers_title') }}</h3>
        <p v-if="!teachers.length" class="teacher-meta">{{ t('ui.connections_empty') }}</p>
        <ul v-else class="learner-circle__list">
          <li v-for="teacher in teachers" :key="teacher.id" class="learner-circle__teacher">
            <div class="learner-circle__copy">
              <strong>{{ teacher.name }}</strong>
              <p class="teacher-meta">
                <span
                  class="learner-circle__badge"
                  :class="teacher.independent ? 'is-muted' : 'is-institution'"
                >{{ teacher.independent ? t('ui.connections_teacher_independent') : t('ui.connections_teacher_institution') }}</span>
                <span v-if="teacher.organisation_name"> · {{ teacher.organisation_name }}</span>
                <span v-if="teacherClassLine(teacher)"> · {{ teacherClassLine(teacher) }}</span>
              </p>
            </div>
            <div class="learner-circle__actions">
              <button v-if="teacher.can_message" type="button" class="dash-btn dash-btn--ghost dash-btn--sm btn btn-outline-secondary btn-sm" @click="$emit('message', teacher.id)">
                {{ t('dashboard.circle_message') }}
              </button>
              <button v-if="showLearning" type="button" class="dash-btn dash-btn--ghost dash-btn--sm btn btn-outline-secondary btn-sm" @click="$emit('learning')">
                {{ t('dashboard.circle_open_learning') }}
              </button>
            </div>
          </li>
        </ul>
      </template>

      <template v-if="showGuardianBlock && (pendingGuardians.length || guardians.length || guardiansSection)">
        <template v-if="pendingGuardians.length">
          <h3 class="teacher-pane__title learner-circle__subhead">{{ t('ui.connections_pending_guardians') }}</h3>
          <ul class="learner-circle__list">
            <li v-for="guardian in pendingGuardians" :key="guardian.id" class="learner-circle__guardian">
              <div class="learner-circle__copy">
                <strong>{{ guardian.display_name || guardian.relationship }}</strong>
                <p class="teacher-meta">
                  <span class="learner-circle__badge is-warning">{{ t('ui.connections_guardian_pending') }}</span>
                  <span v-if="guardian.relationship"> · {{ guardian.relationship }}</span>
                </p>
              </div>
              <span class="learner-circle__actions">
                <button type="button" class="dash-btn dash-btn--secondary dash-btn--sm btn btn-outline-secondary btn-sm" :disabled="busy" @click="rejectGuardian(guardian.id)">
                  {{ t('ui.connections_reject_guardian') }}
                </button>
                <button type="button" class="dash-btn dash-btn--primary dash-btn--sm btn btn-primary btn-sm" :disabled="busy" @click="approveGuardian(guardian.id)">
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
              <div class="learner-circle__copy">
                <strong>{{ guardianDisplayName(guardian) }}</strong>
                <p class="teacher-meta">
                  <span class="learner-circle__badge is-success">{{ t('ui.connections_guardian_active') }}</span>
                  <span v-if="guardian.relationship"> · {{ guardian.relationship }}</span>
                </p>
              </div>
            </li>
          </ul>
        </template>

        <p
          v-if="guardiansSection && !pendingGuardians.length && !guardians.length"
          class="teacher-meta"
        >{{ t('dashboard.circle_guardians_empty') }}</p>
      </template>

      <p v-if="compact" class="learner-circle__compact-meta teacher-meta">{{ compactSummary }}</p>
      <button v-if="compact" type="button" class="dash-btn dash-btn--secondary dash-btn--sm btn btn-outline-secondary btn-sm" @click="$emit('open-settings')">
        {{ t('ui.connections_settings_manage') }}
      </button>
    </div>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'
import {
  buildRelationshipGroups,
  displayClassName,
  learnerCircleCompactSummary,
} from '../../scripts/dashboard/learnerCirclePresentation'

export default {
  name: 'LearnerCirclePanel',
  mixins: [i18nMixin],
  props: {
    circle: { type: Object, default: null },
    showLearning: { type: Boolean, default: true },
    embedded: { type: Boolean, default: false },
    hub: { type: Boolean, default: false },
    compact: { type: Boolean, default: false },
    guardiansSection: { type: Boolean, default: false },
    hideGuardians: { type: Boolean, default: false },
  },
  emits: ['message', 'learning', 'updated', 'open-settings'],
  data() {
    return {
      uid: `learner-circle-${Math.random().toString(36).slice(2, 9)}`,
      inviteCode: '',
      invitePreview: null,
      busy: false,
      error: '',
      notice: '',
    }
  },
  computed: {
    sectionClass() {
      if (this.guardiansSection) return 'learner-circle--guardians'
      if (this.hub) return 'learner-circle--hub'
      if (this.embedded) return 'learner-circle--embedded'
      return 'teacher-pane learner-circle'
    },
    bodyClass() {
      if (this.embedded || this.hub || this.guardiansSection) return 'learner-circle__embedded-body'
      return 'teacher-pane__body'
    },
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
    activeMemberships() {
      return (Array.isArray(this.circle?.memberships) ? this.circle.memberships : [])
        .filter((row) => row.status === 'pending' || row.status === 'approved')
    },
    studentInstitution() {
      return this.circle?.institution || null
    },
    relationshipGroups() {
      return buildRelationshipGroups(this.circle, (key, params) => this.t(key, params))
    },
    compactSummary() {
      return learnerCircleCompactSummary(this.circle, (key, params) => this.t(key, params))
    },
    showRelationshipHub() {
      return this.hub && !this.compact && !this.guardiansSection
    },
    showGuardianBlock() {
      return !this.hideGuardians && !this.compact && (this.guardiansSection || !this.hub)
    },
    showTeacherInviteBlock() {
      return !this.compact && !this.guardiansSection
    },
    groupOrganisationLabel() {
      return (group) => {
        if (group.independent) return this.t('ui.connections_group_independent')
        return group.organisationName || this.t('ui.connections_teacher_institution')
      }
    },
  },
  methods: {
    displayClassName(name) {
      return displayClassName(name, (key) => this.t(key))
    },
    guardianDisplayName(guardian) {
      if (guardian?.name_hidden) return this.t('dashboard.circle_guardian_name_hidden')
      return guardian.display_name || guardian.relationship || this.t('dashboard.circle_guardians_title')
    },
    teacherClassLine(teacher) {
      const areas = Array.isArray(teacher?.learning_areas) ? teacher.learning_areas : []
      const groups = areas
        .filter((row) => row.kind === 'group')
        .map((row) => this.displayClassName(row.label))
        .filter(Boolean)
      return groups.slice(0, 2).join(', ')
    },
    membershipStatusLabel(membership) {
      const status = String(membership?.status || '').toLowerCase()
      if (status === 'approved') return this.t('ui.connections_membership_approved')
      if (status === 'pending') return this.t('ui.connections_membership_pending')
      return status
    },
    membershipStatusClass(membership) {
      const status = String(membership?.status || '').toLowerCase()
      if (status === 'approved') return 'is-success'
      if (status === 'pending') return 'is-warning'
      return 'is-muted'
    },
    errorMessage(error) {
      const status = Number(error?.response?.status || 0)
      if (status === 429) return this.t('ui.connections_invite_throttled')
      const errors = error?.response?.data?.errors
      const first = errors ? Object.values(errors).flat().find(Boolean) : ''
      return first || error?.response?.data?.message || this.t('teacher.action_failed')
    },
    applyPayload(payload) {
      if (payload?.circle) {
        this.$emit('updated', payload)
        return
      }
      this.$emit('updated', payload)
    },
    async onInviteSubmit() {
      if (!this.inviteCode.trim() || this.busy) return
      if (this.invitePreview) {
        await this.confirmRedeem()
        return
      }
      this.busy = true
      this.error = ''
      this.notice = ''
      try {
        this.invitePreview = await learningApi.previewLearnerClassInvite(this.inviteCode.trim())
      } catch (error) {
        this.error = this.errorMessage(error)
      } finally {
        this.busy = false
      }
    },
    clearInvitePreview() {
      this.invitePreview = null
    },
    async confirmRedeem() {
      if (!this.inviteCode.trim() || this.busy) return
      this.busy = true
      this.error = ''
      this.notice = ''
      try {
        const payload = await learningApi.redeemLearnerClassInvite(this.inviteCode.trim())
        this.inviteCode = ''
        this.invitePreview = null
        this.notice = this.t('ui.connections_joined_pending')
        this.applyPayload(payload)
      } catch (error) {
        this.error = this.errorMessage(error)
      } finally {
        this.busy = false
      }
    },
    async leaveMembership(membershipId) {
      if (!membershipId || this.busy) return
      if (!window.confirm(this.t('ui.connections_membership_leave_impact'))) return
      this.busy = true
      this.error = ''
      try {
        const payload = await learningApi.rejectLearnerMembership(membershipId)
        this.applyPayload(payload)
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
        this.applyPayload(payload)
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
        this.applyPayload(payload)
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
        this.applyPayload(payload)
      } catch (error) {
        this.error = this.errorMessage(error)
      } finally {
        this.busy = false
      }
    },
  },
}
</script>
