<template>
  <section class="teacher-stack">
    <div class="card teacher-account teacher-account--flat">
      <div class="card-body teacher-profile-hero teacher-profile-hero--compact d-flex align-items-center gap-3">
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
      <nav class="list-group list-group-flush teacher-account__nav" :aria-label="t('teacher.account_links_label')">
        <a class="list-group-item list-group-item-action teacher-account__link d-flex align-items-center gap-3" :href="practiceUrl">
          <span class="teacher-account__link-icon teacher-account__link-icon--practice"><i class="bi bi-book" aria-hidden="true"></i></span>
          <span class="teacher-account__link-text">
            <span class="teacher-account__link-title">{{ t('teacher.my_practice') }}</span>
            <span class="teacher-account__link-desc">{{ t('teacher.account_practice_hint') }}</span>
          </span>
          <i class="bi bi-chevron-right teacher-account__link-chevron ms-auto" aria-hidden="true"></i>
        </a>
        <a class="list-group-item list-group-item-action teacher-account__link d-flex align-items-center gap-3" :href="profileUrl">
          <span class="teacher-account__link-icon teacher-account__link-icon--profile"><i class="bi bi-person" aria-hidden="true"></i></span>
          <span class="teacher-account__link-text">
            <span class="teacher-account__link-title">{{ t('teacher.profile') }}</span>
            <span class="teacher-account__link-desc">{{ t('teacher.account_profile_hint') }}</span>
          </span>
          <i class="bi bi-chevron-right teacher-account__link-chevron ms-auto" aria-hidden="true"></i>
        </a>
      </nav>
    </div>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'

export default {
  name: 'TeacherSettingsSection',
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
