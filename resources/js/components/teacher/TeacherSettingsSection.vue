<template>
  <div class="teacher-stack">
    <TeacherPanel :title="t('teacher.nav_settings')">
      <div class="teacher-stack">
        <div class="teacher-profile-hero">
          <span class="teacher-profile-hero__avatar" aria-hidden="true">{{ studentInitial(teacherName) }}</span>
          <div class="teacher-profile-hero__copy">
            <p><strong>{{ teacher?.name }}</strong></p>
            <p>{{ teacher?.email }}</p>
          </div>
        </div>
        <div class="teacher-form__actions">
          <a class="dash-btn dash-btn--ghost" :href="practiceUrl">{{ t('teacher.my_practice') }}</a>
          <a class="dash-btn dash-btn--ghost" :href="profileUrl">{{ t('teacher.profile') }}</a>
        </div>
      </div>
    </TeacherPanel>

    <TeacherOrganisationRoster
      v-if="roster"
      :organisation="roster.organisation"
      :teachers="roster.teachers || []"
      :students="roster.students || []"
      @open-student="$emit('open-student', $event)"
    />

    <TeacherPanel>
      <TeacherEmpty inline :message="t('teacher.settings_access')" />
    </TeacherPanel>
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherOrganisationRoster from './TeacherOrganisationRoster.vue'
import TeacherPanel from './TeacherPanel.vue'

export default {
  name: 'TeacherSettingsSection',
  components: { TeacherEmpty, TeacherOrganisationRoster, TeacherPanel },
  mixins: [i18nMixin],
  props: {
    teacher: { type: Object, default: null },
    teacherName: { type: String, default: '' },
    roster: { type: Object, default: null },
    studentInitial: { type: Function, required: true },
    practiceUrl: { type: String, required: true },
    profileUrl: { type: String, required: true },
  },
  emits: ['open-student'],
}
</script>
