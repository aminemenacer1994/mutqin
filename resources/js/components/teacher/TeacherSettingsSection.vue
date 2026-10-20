<template>
  <section class="teacher-stack">
    <TeacherPageHeader
      :title="t('teacher.nav_settings')"
      :subtitle="t('teacher.account_hint')"
    />
    <TeacherPanel :title="t('teacher.account_profile_title')" icon="bi bi-person" compact>
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
        <nav class="teacher-account__nav" :aria-label="t('teacher.account_links_label')">
          <a class="teacher-account__link" :href="practiceUrl">
            <span class="teacher-account__link-icon"><i class="bi bi-book" aria-hidden="true"></i></span>
            <span class="teacher-account__link-text">
              <span class="teacher-account__link-title">{{ t('teacher.my_practice') }}</span>
              <span class="teacher-account__link-desc">{{ t('teacher.account_practice_hint') }}</span>
            </span>
            <i class="bi bi-chevron-right teacher-account__link-chevron" aria-hidden="true"></i>
          </a>
          <a class="teacher-account__link" :href="profileUrl">
            <span class="teacher-account__link-icon"><i class="bi bi-person" aria-hidden="true"></i></span>
            <span class="teacher-account__link-text">
              <span class="teacher-account__link-title">{{ t('teacher.profile') }}</span>
              <span class="teacher-account__link-desc">{{ t('teacher.account_profile_hint') }}</span>
            </span>
            <i class="bi bi-chevron-right teacher-account__link-chevron" aria-hidden="true"></i>
          </a>
        </nav>
      </div>
    </TeacherPanel>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import TeacherPageHeader from './TeacherPageHeader.vue'
import TeacherPanel from './TeacherPanel.vue'

export default {
  name: 'TeacherSettingsSection',
  components: { TeacherPageHeader, TeacherPanel },
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
