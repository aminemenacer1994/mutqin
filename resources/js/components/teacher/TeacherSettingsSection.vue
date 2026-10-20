<template>
  <section class="teacher-stack">
    <TeacherPanel :title="t('teacher.nav_settings')" icon="bi bi-person" compact>
      <div class="teacher-account">
        <div class="teacher-profile-hero">
          <span class="teacher-profile-hero__avatar" aria-hidden="true">{{ studentInitial(teacherName) }}</span>
          <div class="teacher-profile-hero__copy">
            <h2>{{ teacher?.name }}</h2>
            <p v-if="teacher?.email" class="teacher-account__email">{{ teacher.email }}</p>
            <p v-if="teacher?.organisation?.name" class="teacher-meta">
              <i class="bi bi-building" aria-hidden="true"></i>
              {{ teacher.organisation.name }}
            </p>
          </div>
        </div>
        <div class="teacher-form__actions">
          <a class="dash-btn dash-btn--ghost dash-btn--sm" :href="practiceUrl">
            <i class="bi bi-book" aria-hidden="true"></i>
            {{ t('teacher.my_practice') }}
          </a>
          <a class="dash-btn dash-btn--ghost dash-btn--sm" :href="profileUrl">
            <i class="bi bi-person" aria-hidden="true"></i>
            {{ t('teacher.profile') }}
          </a>
        </div>
      </div>
    </TeacherPanel>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import TeacherPanel from './TeacherPanel.vue'

export default {
  name: 'TeacherSettingsSection',
  components: { TeacherPanel },
  mixins: [i18nMixin],
  props: {
    teacher: { type: Object, default: null },
    teacherName: { type: String, required: true },
    studentInitial: { type: Function, required: true },
    practiceUrl: { type: String, required: true },
    profileUrl: { type: String, required: true },
  },
}
</script>
