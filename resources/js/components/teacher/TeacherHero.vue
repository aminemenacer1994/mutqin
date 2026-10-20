<template>
  <header class="dash-hero dash-section dash-reveal teacher-hero teacher-hero--compact">
    <div class="dash-hero__top">
      <div class="dash-hero__greeting">
        <p class="teacher-kicker">{{ t('teacher.kicker') }}</p>
        <h1>{{ t('teacher.greeting', { name: firstName }) }}</h1>
        <p v-if="organisationName" class="teacher-meta">
          <i class="bi bi-building" aria-hidden="true"></i>
          {{ organisationName }}
        </p>
        <p class="teacher-hero__summary">{{ t('teacher.hero_summary') }}</p>
      </div>
      <div class="teacher-hero__actions">
        <a class="dash-btn dash-btn--ghost" :href="practiceUrl">
          <i class="bi bi-book" aria-hidden="true"></i>
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
