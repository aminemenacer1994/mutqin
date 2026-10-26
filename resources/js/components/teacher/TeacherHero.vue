<template>
  <header class="dash-reveal teacher-hero">
    <div class="teacher-hero__row">
      <div class="teacher-hero__identity">
        <span class="teacher-hero__mark" aria-hidden="true"><i class="bi bi-mortarboard"></i></span>
        <div class="teacher-hero__copy">
          <p class="teacher-hero__eyebrow">{{ t('teacher.workspace_label') }}</p>
          <h1 class="teacher-hero__title">{{ t('teacher.greeting', { name: firstName }) }}</h1>
          <p v-if="organisationName" class="teacher-meta">
            <i class="bi bi-building" aria-hidden="true"></i>
            {{ organisationName }}
          </p>
        </div>
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
    studentCount: { type: Number, default: 0 },
    supportCount: { type: Number, default: 0 },
  },
}
</script>
