<template>
  <section class="teacher-stack teacher-account-page">
    <header class="teacher-page-header">
      <div>
        <p class="teacher-kicker">{{ t('teacher.workspace_label') }}</p>
        <h1 class="teacher-page-header__title">{{ t('teacher.nav_settings') }}</h1>
        <p class="teacher-page-header__hint">{{ t('teacher.account_hint') }}</p>
      </div>
    </header>

    <div class="teacher-account__grid">
      <section class="card teacher-account teacher-account__profile" :aria-labelledby="profileHeadingId">
        <div class="teacher-account__section-head">
          <span class="teacher-account__section-icon" aria-hidden="true"><i class="bi bi-person"></i></span>
          <div><h2 :id="profileHeadingId">{{ t('teacher.account_profile_title') }}</h2><p>{{ t('teacher.account_profile_hint') }}</p></div>
        </div>
        <div class="teacher-account__identity">
          <span class="teacher-profile-hero__avatar" aria-hidden="true">{{ studentInitial(teacherName) }}</span>
          <div>
            <p class="teacher-account__role">{{ t('teacher.account_role') }}</p>
            <h3>{{ teacher?.name || teacherName }}</h3>
            <p v-if="teacher?.email" class="teacher-account__email">{{ teacher.email }}</p>
            <p v-if="teacher?.organisation?.name" class="teacher-account__org"><i class="bi bi-building" aria-hidden="true"></i>{{ teacher.organisation.name }}</p>
          </div>
        </div>
        <a class="btn btn-outline-secondary btn-sm teacher-account__action" :href="profileUrl">{{ t('teacher.manage') }}<i class="bi bi-arrow-up-right" aria-hidden="true"></i></a>
      </section>

      <section class="card teacher-account teacher-account__classes-panel" :aria-labelledby="classesHeadingId">
        <div class="teacher-account__section-head">
          <span class="teacher-account__section-icon" aria-hidden="true"><i class="bi bi-people"></i></span>
          <div><h2 :id="classesHeadingId">{{ t('teacher.account_classes') }}</h2><p>{{ t('teacher.authorised_count', { n: classStudentCount }) }}</p></div>
        </div>
        <form class="teacher-account__create-class" @submit.prevent="createClass">
          <label class="visually-hidden" :for="classNameId">{{ t('teacher.group_name') }}</label>
          <input :id="classNameId" v-model="newClassName" type="text" maxlength="120" :placeholder="t('teacher.group_name')" :disabled="creatingClass">
          <button type="submit" class="btn btn-outline-secondary btn-sm" :disabled="creatingClass || !newClassName.trim()"><i class="bi" :class="creatingClass ? 'bi-arrow-repeat' : 'bi-plus-lg'" aria-hidden="true"></i>{{ creatingClass ? t('teacher.saving') : t('teacher.create_group') }}</button>
        </form>
        <p v-if="classError" class="teacher-account__error" role="alert">{{ classError }}</p>
        <ul v-if="classes.length" class="teacher-account__classes">
          <li v-for="group in classes" :key="group.id">
            <span class="teacher-account__link-icon" aria-hidden="true"><i class="bi bi-people"></i></span>
            <span class="teacher-account__link-text"><span class="teacher-account__link-title">{{ group.name }}</span><span class="teacher-account__link-desc">{{ t('teacher.account_class_students', { n: group.authorised_students || 0 }) }}</span></span>
            <button type="button" class="btn btn-link btn-sm teacher-account__class-manage" @click="openClass(group)">{{ t('teacher.manage') }}</button>
          </li>
        </ul>
        <p v-else class="teacher-account__empty">{{ t('teacher.groups_empty') }}</p>
      </section>

      <section class="card teacher-account teacher-account__reports" :aria-labelledby="reportsHeadingId">
        <div class="teacher-account__section-head"><span class="teacher-account__section-icon" aria-hidden="true"><i class="bi bi-file-earmark-arrow-down"></i></span><div><h2 :id="reportsHeadingId">{{ t('teacher.account_export') }}</h2><p>{{ t('teacher.account_export_help') }}</p></div></div>
        <button type="button" class="btn btn-outline-secondary btn-sm teacher-account__action" @click="$emit('export')">{{ t('teacher.account_export_action') }}<i class="bi bi-download" aria-hidden="true"></i></button>
      </section>

      <section class="card teacher-account teacher-account__practice" :aria-labelledby="practiceHeadingId">
        <div class="teacher-account__section-head"><span class="teacher-account__section-icon" aria-hidden="true"><i class="bi bi-book"></i></span><div><h2 :id="practiceHeadingId">{{ t('teacher.my_practice') }}</h2><p>{{ t('teacher.account_practice_hint') }}</p></div></div>
        <a class="btn btn-outline-secondary btn-sm teacher-account__action" :href="practiceUrl">{{ t('teacher.my_practice') }}<i class="bi bi-arrow-up-right" aria-hidden="true"></i></a>
      </section>

      <section class="card teacher-account teacher-account__connections" :aria-labelledby="connectionsHeadingId">
        <div class="teacher-account__section-head">
          <span class="teacher-account__section-icon" aria-hidden="true"><i class="bi bi-diagram-3"></i></span>
          <div>
            <h2 :id="connectionsHeadingId">{{ t('ui.connections_my_title') }}</h2>
            <p>{{ t('ui.connections_connect_lede') }}</p>
          </div>
        </div>
        <p class="teacher-meta mb-2">
          {{ teacher?.organisation?.name ? t('ui.connections_status_connected') : t('ui.connections_status_none') }}
        </p>
        <p v-if="teacher?.organisation?.name" class="teacher-account__org mb-2">
          <i class="bi bi-building" aria-hidden="true"></i>{{ teacher.organisation.name }}
        </p>
        <ul v-if="organisationMemberships.length" class="teacher-account__classes mb-2">
          <li v-for="membership in organisationMemberships" :key="membership.id">
            <span class="teacher-account__link-text">
              <span class="teacher-account__link-title">{{ membership.organisation?.name }}</span>
              <span class="teacher-account__link-desc">{{ membership.status }}{{ membership.active ? ' · active' : '' }}</span>
            </span>
            <button
              v-if="membership.status === 'approved' && !membership.active && membership.organisation?.id"
              type="button"
              class="btn btn-link btn-sm"
              :disabled="orgBusy"
              @click="switchOrganisation(membership.organisation.id)"
            >{{ t('ui.connections_org_switch') }}</button>
          </li>
        </ul>
        <ul v-if="pendingOrgMemberships.length" class="teacher-account__member-list mb-2">
          <li v-for="request in pendingOrgMemberships" :key="request.id">
            <strong>{{ request.user?.name }}</strong>
            <span class="teacher-account__member-actions">
              <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="orgBusy" @click="reviewOrgMembership(request.id, 'reject')">{{ t('teacher.reject') }}</button>
              <button type="button" class="btn btn-primary btn-sm" :disabled="orgBusy" @click="reviewOrgMembership(request.id, 'approve')">{{ t('teacher.approve') }}</button>
            </span>
          </li>
        </ul>
        <a class="btn btn-outline-secondary btn-sm teacher-account__action" href="/onboarding/connections">{{ t('ui.connections_connect_action') }}</a>
      </section>

      <TeacherInstitutionAdminPanel v-if="teacher?.organisation?.id" :current-user-id="teacher?.id" />
    </div>

    <TeacherDialog :open="Boolean(activeClass)" size="md" :title="activeClass?.name || t('teacher.account_classes')" :close-label="t('teacher.close')" :busy="classLoading || membershipActionId !== null" @close="closeClass">
      <p v-if="classLoading" class="teacher-loading-inline" role="status">{{ t('teacher.loading') }}</p>
      <p v-else-if="classError" class="teacher-account__error" role="alert">{{ classError }}</p>
      <template v-else-if="activeClass">
        <section class="teacher-account__class-detail" :aria-label="t('teacher.students_heading')">
          <div class="teacher-account__class-detail-head"><h3>{{ t('teacher.students_heading') }}</h3><span>{{ t('teacher.authorised_count', { n: activeClass.authorised_students || 0 }) }}</span></div>
          <ul v-if="activeClass.students?.length" class="teacher-account__member-list"><li v-for="student in activeClass.students" :key="student.id"><span><strong>{{ student.name }}</strong><small>{{ student.sharing ? t('teacher.sharing_yes') : t('teacher.sharing_no') }}</small></span><button type="button" class="btn btn-link btn-sm text-danger" :disabled="membershipActionId !== null" @click="reviewMembership(student, 'remove')">{{ t('teacher.remove') }}</button></li></ul>
          <p v-else class="teacher-account__empty">{{ t('teacher.groups_empty') }}</p>
        </section>
        <section class="teacher-account__class-detail" :aria-label="t('teacher.requests')">
          <div class="teacher-account__class-detail-head"><h3>{{ t('teacher.requests') }}</h3><span>{{ t('teacher.pending_count', { n: activeClass.pending_requests || 0 }) }}</span></div>
          <ul v-if="activeClass.requests?.length" class="teacher-account__member-list"><li v-for="request in activeClass.requests" :key="request.id"><strong>{{ request.name }}</strong><span class="teacher-account__member-actions"><button type="button" class="btn btn-outline-secondary btn-sm" :disabled="membershipActionId !== null" @click="reviewMembership(request, 'reject')">{{ t('teacher.reject') }}</button><button type="button" class="btn btn-primary btn-sm" :disabled="membershipActionId !== null" @click="reviewMembership(request, 'approve')">{{ t('teacher.approve') }}</button></span></li></ul>
          <p v-else class="teacher-account__empty">{{ t('teacher.requests_empty') }}</p>
        </section>
        <section class="teacher-account__class-detail" :aria-label="t('ui.connections_invite_title')">
          <div class="teacher-account__class-detail-head"><h3>{{ t('ui.connections_invite_title') }}</h3></div>
          <button type="button" class="btn btn-primary btn-sm" :disabled="inviteBusy" @click="createInvite">{{ t('ui.connections_invite_title') }}</button>
          <p v-if="inviteCode" class="teacher-meta mb-0">{{ t('ui.connections_invite_created') }} <strong>{{ inviteCode }}</strong></p>
        </section>
      </template>
    </TeacherDialog>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'
import TeacherDialog from './TeacherDialog.vue'
import TeacherInstitutionAdminPanel from './TeacherInstitutionAdminPanel.vue'

export default {
  name: 'TeacherSettingsSection',
  components: { TeacherDialog, TeacherInstitutionAdminPanel },
  mixins: [i18nMixin],
  props: { teacher: { type: Object, default: null }, teacherName: { type: String, required: true }, studentInitial: { type: Function, required: true }, practiceUrl: { type: String, required: true }, profileUrl: { type: String, required: true }, groups: { type: Array, default: () => [] } },
  emits: ['export', 'refresh-classes'],
  data() {
    const uid = Math.random().toString(36).slice(2, 9)
    return {
      profileHeadingId: `teacher-account-profile-${uid}`,
      classesHeadingId: `teacher-account-classes-${uid}`,
      reportsHeadingId: `teacher-account-reports-${uid}`,
      practiceHeadingId: `teacher-account-practice-${uid}`,
      connectionsHeadingId: `teacher-account-connections-${uid}`,
      classNameId: `teacher-account-class-name-${uid}`,
      newClassName: '',
      creatingClass: false,
      activeClass: null,
      classLoading: false,
      classError: '',
      membershipActionId: null,
      organisationMemberships: [],
      pendingOrgMemberships: [],
      orgBusy: false,
      inviteBusy: false,
      inviteCode: '',
    }
  },
  computed: {
    classes() { return this.groups.filter((group) => group.teaches === true) },
    classStudentCount() { return this.classes.reduce((total, group) => total + Number(group.authorised_students || 0), 0) },
  },
  mounted() {
    this.loadOrganisationConnections()
  },
  methods: {
    errorMessage(error) { const errors = error?.response?.data?.errors; const first = errors ? Object.values(errors).flat().find(Boolean) : ''; return first || error?.response?.data?.message || this.t('teacher.action_failed') },
    async loadOrganisationConnections() {
      try {
        const [memberships, pending] = await Promise.all([
          learningApi.getOrganisationMemberships(),
          learningApi.getPendingOrganisationMemberships().catch(() => ({ data: [] })),
        ])
        this.organisationMemberships = Array.isArray(memberships?.data) ? memberships.data : []
        this.pendingOrgMemberships = Array.isArray(pending?.data) ? pending.data : []
      } catch {
        this.organisationMemberships = []
        this.pendingOrgMemberships = []
      }
    },
    async createClass() {
      const name = this.newClassName.trim()
      if (!name || this.creatingClass) return
      this.creatingClass = true; this.classError = ''
      try { await learningApi.createTeacherGroup(name); this.newClassName = ''; this.$emit('refresh-classes') } catch (error) { this.classError = this.errorMessage(error) } finally { this.creatingClass = false }
    },
    async openClass(group) {
      if (!group?.id || group.teaches !== true) return
      this.activeClass = { ...group }; this.classLoading = true; this.classError = ''; this.inviteCode = ''
      try { this.activeClass = await learningApi.getTeacherGroup(group.id) } catch (error) { this.classError = this.errorMessage(error) } finally { this.classLoading = false }
    },
    closeClass() { if (this.classLoading || this.membershipActionId !== null) return; this.activeClass = null; this.classError = ''; this.inviteCode = '' },
    async reviewMembership(membership, action) {
      if (!membership?.id || this.membershipActionId !== null || !this.activeClass?.id) return
      this.membershipActionId = membership.id; this.classError = ''
      try { await learningApi.reviewTeacherMembership(membership.id, action); this.activeClass = await learningApi.getTeacherGroup(this.activeClass.id); this.$emit('refresh-classes') } catch (error) { this.classError = this.errorMessage(error) } finally { this.membershipActionId = null }
    },
    async createInvite() {
      if (!this.activeClass?.id || this.inviteBusy) return
      this.inviteBusy = true
      this.classError = ''
      try {
        const result = await learningApi.createTeacherClassInvite(this.activeClass.id)
        this.inviteCode = result?.code || ''
      } catch (error) {
        this.classError = this.errorMessage(error)
      } finally {
        this.inviteBusy = false
      }
    },
    async switchOrganisation(organisationId) {
      if (!organisationId || this.orgBusy) return
      this.orgBusy = true
      try {
        await learningApi.switchOrganisation(organisationId)
        await this.loadOrganisationConnections()
        this.$emit('refresh-classes')
      } catch (error) {
        this.classError = this.errorMessage(error)
      } finally {
        this.orgBusy = false
      }
    },
    async reviewOrgMembership(membershipId, action) {
      if (!membershipId || this.orgBusy) return
      this.orgBusy = true
      try {
        await learningApi.reviewOrganisationMembership(membershipId, action)
        await this.loadOrganisationConnections()
      } catch (error) {
        this.classError = this.errorMessage(error)
      } finally {
        this.orgBusy = false
      }
    },
  },
}
</script>
