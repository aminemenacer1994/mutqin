<template>
  <header class="teacher-pane teacher-pane--hero dash-reveal teacher-hero">
    <div class="teacher-hero__row">
      <div class="teacher-hero__copy">
        <p class="teacher-kicker">{{ t('teacher.kicker') }}</p>
        <h1 class="teacher-hero__title">{{ t('teacher.greeting', { name: firstName }) }}</h1>
        <p v-if="organisationName" class="teacher-meta">
          <i class="bi bi-building" aria-hidden="true"></i>
          {{ organisationName }}
        </p>
        <p class="teacher-hero__summary">{{ t('teacher.hero_summary') }}</p>
      </div>
      <a class="dash-btn dash-btn--ghost dash-btn--sm" :href="practiceUrl">
        <i class="bi bi-book" aria-hidden="true"></i>
        {{ t('teacher.my_practice') }}
      </a>
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
