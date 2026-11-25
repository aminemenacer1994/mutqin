<template>
  <section class="learner-difficulties" :aria-label="t('teacher.learner_difficulties_title')">
    <header class="learner-difficulties__head">
      <div>
        <p class="learner-difficulties__eyebrow">{{ t('teacher.learner_difficulties_title') }}</p>
        <h3 class="learner-difficulties__title">{{ t('teacher.learner_difficulties_help') }}</h3>
      </div>
      <div class="learner-difficulties__counts">
        <span><em>{{ counts.recurring || 0 }}</em> {{ t('teacher.difficulty_state_recurring') }}</span>
        <span><em>{{ counts.improving || 0 }}</em> {{ t('teacher.difficulty_state_improving') }}</span>
      </div>
    </header>

    <p v-if="!visibleItems.length" class="learner-difficulties__empty mb-0">{{ t('teacher.learner_difficulties_empty') }}</p>
    <ul v-else class="learner-difficulties__list list-unstyled mb-0">
      <li v-for="item in visibleItems" :key="item.id" class="learner-difficulties__item" :class="`is-${item.recurrence_state}`">
        <div class="learner-difficulties__copy">
          <strong>{{ item.ayah_label }}</strong>
          <MadaniAyahSnippet
            v-if="item.surah_number && item.ayah_number"
            class="learner-difficulties__arabic"
            :surah="item.surah_number"
            :ayah="item.ayah_number"
          />
          <span class="learner-difficulties__meta">
            <span class="learner-difficulties__badge" :class="`is-${item.recurrence_state}`">{{ stateLabel(item.recurrence_state) }}</span>
            <span>{{ t('teacher.difficulty_count', { n: item.occurrence_count || item.affected_attempt_count || 0 }) }}</span>
            <span v-if="item.teacher_review?.confirmed" class="learner-difficulties__badge is-confirmed">{{ t('teacher.difficulty_teacher_confirmed') }}</span>
            <span v-else class="learner-difficulties__badge is-ai">{{ t('teacher.difficulty_ai_flagged') }}</span>
          </span>
        </div>
        <a
          v-if="practiseHref(item)"
          class="dash-btn dash-btn--primary dash-btn--sm"
          :href="practiseHref(item)"
        >{{ t('teacher.difficulty_practise_again') }}</a>
      </li>
    </ul>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import MadaniAyahSnippet from './MadaniAyahSnippet.vue'

export default {
  name: 'LearnerRecitationDifficulties',
  components: { MadaniAyahSnippet },
  mixins: [i18nMixin],
  props: {
    difficulties: { type: Object, default: null },
    memorisationBase: { type: String, default: '/memorisation' },
  },
  computed: {
    counts() {
      return this.difficulties?.counts || {}
    },
    items() {
      return Array.isArray(this.difficulties?.items) ? this.difficulties.items : []
    },
    visibleItems() {
      return this.items
        .filter((item) => item.recurrence_state !== 'resolved')
        .slice(0, 6)
    },
    hasContent() {
      return this.visibleItems.length > 0 || (this.counts.recurring || 0) > 0 || (this.counts.improving || 0) > 0
    },
  },
  methods: {
    practiseHref(item) {
      const params = item?.practise_again?.href_params
      if (!params) return item?.href || ''
      const search = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value == null || value === '') return
        search.set(key, String(value))
      })
      return `${String(this.memorisationBase || '/memorisation').split('?')[0]}?${search.toString()}`
    },
    stateLabel(state) {
      const key = {
        recurring: 'teacher.difficulty_state_recurring',
        improving: 'teacher.difficulty_state_improving',
        resolved: 'teacher.difficulty_state_resolved',
        insufficient_data: 'teacher.difficulty_state_insufficient',
      }[state]
      return key ? this.t(key) : state
    },
  },
}
</script>
