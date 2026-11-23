<template>
  <section class="teacher-pane" :aria-label="t('dashboard.revision_targets_title')">
    <header class="teacher-pane__head">
      <div class="teacher-pane__titles">
        <h2 class="teacher-pane__title">{{ t('dashboard.revision_targets_title') }}</h2>
      </div>
    </header>
    <div class="teacher-pane__body">
      <p v-if="!targets.length" class="teacher-meta">{{ t('dashboard.revision_targets_empty') }}</p>
      <ul v-else class="learner-circle__list">
        <li v-for="target in targets" :key="target.id" class="learner-circle__teacher">
          <div>
            <strong>{{ target.label }}</strong>
            <p class="teacher-meta">
              <template v-if="target.teacher_name">{{ target.teacher_name }}</template>
              <template v-if="target.due_on"> · {{ target.due_on }}</template>
            </p>
            <p v-if="target.instructions" class="teacher-meta">{{ target.instructions }}</p>
          </div>
          <a v-if="target.practice_href" class="dash-btn dash-btn--primary dash-btn--sm" :href="target.practice_href">
            {{ t('dashboard.revision_practise') }}
          </a>
        </li>
      </ul>
    </div>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'

export default {
  name: 'LearnerRevisionTargets',
  mixins: [i18nMixin],
  props: {
    targets: { type: Array, default: () => [] },
  },
}
</script>
