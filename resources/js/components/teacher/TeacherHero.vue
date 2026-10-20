<template>
  <header class="dash-hero dash-section dash-reveal">
    <div class="dash-hero__top">
      <div class="dash-hero__greeting">
        <span class="dash-kicker">{{ t('teacher.kicker') }}</span>
        <h1>{{ t('teacher.greeting', { name: firstName }) }}</h1>
        <div v-if="organisationName" class="teacher-hero__chips">
          <span class="dash-chip">
            <i class="bi bi-building" aria-hidden="true"></i>
            {{ organisationName }}
          </span>
        </div>
      </div>
      <div class="teacher-hero__actions">
        <a class="dash-btn dash-btn--ghost" :href="practiceUrl">
          <i class="bi bi-journal-text" aria-hidden="true"></i>
          {{ t('teacher.my_practice') }}
        </a>
      </div>
    </div>
  </header>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'

export default {
  name: 'TeacherHero',
  mixins: [i18nMixin],
  props: {
    firstName: { type: String, required: true },
    organisationName: { type: String, default: '' },
    practiceUrl: { type: String, required: true },
  },
}
</script>
