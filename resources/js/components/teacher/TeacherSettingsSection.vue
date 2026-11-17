<template>
  <section class="teacher-stack">
    <header class="teacher-page-header">
      <div>
        <p class="teacher-kicker">{{ t('teacher.workspace_label') }}</p>
        <h1 class="teacher-page-header__title">{{ t('teacher.nav_settings') }}</h1>
        <p class="teacher-page-header__hint">{{ t('teacher.account_hint') }}</p>
      </div>
    </header>
    <div class="card teacher-account teacher-account--flat">
      <div class="teacher-account__identity">
        <span class="teacher-profile-hero__avatar" aria-hidden="true">{{ studentInitial(teacherName) }}</span>
        <div>
          <p class="teacher-account__role">{{ t('teacher.account_role') }}</p>
          <h2>{{ teacher?.name || teacherName }}</h2>
          <p v-if="teacher?.email" class="teacher-account__email">{{ teacher.email }}</p>
          <p v-if="teacher?.organisation?.name" class="teacher-account__org">
            <i class="bi bi-building" aria-hidden="true"></i>
            {{ teacher.organisation.name }}
          </p>
        </div>
      </div>
      <nav class="list-group list-group-flush teacher-account__nav" :aria-label="t('teacher.account_links_label')">
        <a class="list-group-item list-group-item-action teacher-account__link d-flex align-items-center gap-3" :href="practiceUrl">
          <span class="teacher-account__link-icon"><i class="bi bi-book" aria-hidden="true"></i></span>
          <span class="teacher-account__link-text">
            <span class="teacher-account__link-title">{{ t('teacher.my_practice') }}</span>
            <span class="teacher-account__link-desc">{{ t('teacher.account_practice_hint') }}</span>
          </span>
          <i class="bi bi-chevron-right teacher-account__link-chevron ms-auto" aria-hidden="true"></i>
        </a>
        <a class="list-group-item list-group-item-action teacher-account__link d-flex align-items-center gap-3" :href="profileUrl">
          <span class="teacher-account__link-icon"><i class="bi bi-person" aria-hidden="true"></i></span>
          <span class="teacher-account__link-text">
            <span class="teacher-account__link-title">{{ t('teacher.profile') }}</span>
            <span class="teacher-account__link-desc">{{ t('teacher.account_profile_hint') }}</span>
          </span>
          <i class="bi bi-chevron-right teacher-account__link-chevron ms-auto" aria-hidden="true"></i>
        </a>
      </nav>
      <section class="teacher-account__panel">
        <h2>{{ t('teacher.account_classes') }}</h2>
        <ul v-if="classes.length" class="teacher-account__classes">
          <li v-for="group in classes" :key="group.id">
            <span class="teacher-account__link-icon" aria-hidden="true"><i class="bi bi-people"></i></span>
            <span class="teacher-account__link-text">
              <span class="teacher-account__link-title">{{ group.name }}</span>
              <span class="teacher-account__link-desc">{{ t('teacher.account_class_students', { n: group.authorised_students || 0 }) }}</span>
            </span>
          </li>
        </ul>
        <p v-else class="teacher-account__empty">{{ t('teacher.account_classes_empty') }}</p>
      </section>
      <section class="teacher-account__panel teacher-account__export">
        <div>
          <h2>{{ t('teacher.account_export') }}</h2>
          <p>{{ t('teacher.account_export_help') }}</p>
        </div>
        <button type="button" class="btn btn-outline-secondary btn-sm" @click="$emit('export')">{{ t('teacher.account_export_action') }}</button>
      </section>
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
    groups: { type: Array, default: () => [] },
  },
  emits: ['export'],
  computed: {
    classes() {
      return this.groups.filter((group) => group.teaches !== false)
    },
  },
}
</script>
