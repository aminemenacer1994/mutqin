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
      </template>
    </TeacherDialog>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'
import TeacherDialog from './TeacherDialog.vue'

export default {
  name: 'TeacherSettingsSection',
  components: { TeacherDialog },
  mixins: [i18nMixin],
  props: { teacher: { type: Object, default: null }, teacherName: { type: String, required: true }, studentInitial: { type: Function, required: true }, practiceUrl: { type: String, required: true }, profileUrl: { type: String, required: true }, groups: { type: Array, default: () => [] } },
  emits: ['export', 'refresh-classes'],
  data() {
    const uid = Math.random().toString(36).slice(2, 9)
    return { profileHeadingId: `teacher-account-profile-${uid}`, classesHeadingId: `teacher-account-classes-${uid}`, reportsHeadingId: `teacher-account-reports-${uid}`, practiceHeadingId: `teacher-account-practice-${uid}`, classNameId: `teacher-account-class-name-${uid}`, newClassName: '', creatingClass: false, activeClass: null, classLoading: false, classError: '', membershipActionId: null }
  },
  computed: {
    classes() { return this.groups.filter((group) => group.teaches === true) },
    classStudentCount() { return this.classes.reduce((total, group) => total + Number(group.authorised_students || 0), 0) },
  },
  methods: {
    errorMessage(error) { const errors = error?.response?.data?.errors; const first = errors ? Object.values(errors).flat().find(Boolean) : ''; return first || error?.response?.data?.message || this.t('teacher.action_failed') },
    async createClass() {
      const name = this.newClassName.trim()
      if (!name || this.creatingClass) return
      this.creatingClass = true; this.classError = ''
      try { await learningApi.createTeacherGroup(name); this.newClassName = ''; this.$emit('refresh-classes') } catch (error) { this.classError = this.errorMessage(error) } finally { this.creatingClass = false }
    },
    async openClass(group) {
      if (!group?.id || group.teaches !== true) return
      this.activeClass = { ...group }; this.classLoading = true; this.classError = ''
      try { this.activeClass = await learningApi.getTeacherGroup(group.id) } catch (error) { this.classError = this.errorMessage(error) } finally { this.classLoading = false }
    },
    closeClass() { if (this.classLoading || this.membershipActionId !== null) return; this.activeClass = null; this.classError = '' },
    async reviewMembership(membership, action) {
      if (!membership?.id || this.membershipActionId !== null || !this.activeClass?.id) return
      this.membershipActionId = membership.id; this.classError = ''
      try { await learningApi.reviewTeacherMembership(membership.id, action); this.activeClass = await learningApi.getTeacherGroup(this.activeClass.id); this.$emit('refresh-classes') } catch (error) { this.classError = this.errorMessage(error) } finally { this.membershipActionId = null }
    },
  },
}
</script>
