<template>
  <header class="card border rounded-3 shadow-sm dash-reveal teacher-hero">
    <div class="card-body teacher-hero__row">
      <div class="teacher-hero__copy">
        <h1 class="teacher-hero__title">{{ t('teacher.greeting', { name: firstName }) }}</h1>
        <p v-if="organisationName" class="teacher-meta">
          <i class="bi bi-building" aria-hidden="true"></i>
          {{ organisationName }}
        </p>
        <p class="teacher-hero__summary">
          <i class="bi bi-person-check" aria-hidden="true"></i>
          <span>{{ t('teacher.hero_summary') }}</span>
        </p>
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
  },
}
</script>
