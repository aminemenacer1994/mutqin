<template>
  <section
    class="teacher-profile-sheet teacher-hifz learner-hifz-overview"
    :class="embedded ? 'learner-hifz-overview--embedded' : 'teacher-pane'"
    :aria-label="t('dashboard.hifz_overview_title')"
  >
    <header v-if="embedded" class="learner-circle__subhead-wrap">
      <h3 class="teacher-pane__title learner-circle__subhead">{{ t('dashboard.hifz_overview_title') }}</h3>
      <p class="teacher-meta">{{ t('dashboard.hifz_overview_hint') }}</p>
    </header>
    <header v-else class="teacher-hifz__head">
      <strong>{{ t('dashboard.hifz_overview_title') }}</strong>
    </header>

    <div v-if="isEmpty" class="teacher-pane__body">
      <p class="teacher-meta">{{ t('dashboard.hifz_overview_empty') }}</p>
    </div>
    <div v-else class="teacher-hifz__summary">
      <section class="teacher-hifz__summary-section">
        <header>
          <span class="teacher-hifz__label">{{ t('dashboard.student_stage_new') }}</span>
          <span v-if="sabaqCount" class="teacher-hifz__count">{{ sabaqCount }}</span>
        </header>
        <p class="teacher-hifz__quiet">{{ t('teacher.hifz_sabaq_help') }}</p>
        <p class="teacher-hifz__lead">{{ rangeLine(coverage.new_memorisation) || t('dashboard.progress_none_yet') }}</p>
      </section>
      <section class="teacher-hifz__summary-section">
        <header>
          <span class="teacher-hifz__label">{{ t('dashboard.student_stage_recent') }}</span>
          <span v-if="sabqiCount" class="teacher-hifz__count">{{ sabqiCount }}</span>
        </header>
        <p class="teacher-hifz__quiet">{{ t('teacher.hifz_sabqi_help') }}</p>
        <p class="teacher-hifz__lead">{{ rangeLine(coverage.recent_revision) || t('dashboard.progress_none_yet') }}</p>
      </section>
      <section class="teacher-hifz__summary-section">
        <header>
          <span class="teacher-hifz__label">{{ t('dashboard.student_stage_older') }}</span>
          <span v-if="manzilCount" class="teacher-hifz__count">{{ manzilCount }}</span>
        </header>
        <p class="teacher-hifz__quiet">{{ t('teacher.hifz_manzil_help') }}</p>
        <p class="teacher-hifz__lead">{{ rangeLine(coverage.older_revision) || t('dashboard.progress_none_yet') }}</p>
      </section>
    </div>

    <p v-if="validatedCount" class="teacher-hifz__quiet learner-hifz-overview__validated">
      {{ t('dashboard.progress_validated') }}: {{ validatedCount }}
      <span class="teacher-kicker">{{ t('dashboard.progress_teacher_confirmed') }}</span>
    </p>
    <button type="button" class="dash-text-link learner-hifz-overview__more" @click="$emit('open-progress')">
      {{ t('dashboard.hifz_overview_open_progress') }}
    </button>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { ayahRangeLabel } from '../../scripts/teacher/formatters.js'

export default {
  name: 'LearnerHifzOverview',
  mixins: [i18nMixin],
  props: {
    summary: { type: Object, default: null },
    embedded: { type: Boolean, default: true },
  },
  emits: ['open-progress'],
  computed: {
    coverage() {
      return this.summary?.coverage || {}
    },
    isEmpty() {
      return Boolean(this.summary?.empty)
    },
    validatedCount() {
      return Number(this.summary?.validated_memorisation?.validated_ayahs || 0)
    },
    sabaqCount() {
      return Number(this.coverage.learning_ayahs || 0) || Number(this.coverage.new_memorisation?.ayahs || 0)
    },
    sabqiCount() {
      return Number(this.coverage.recent_revision?.ayahs || 0)
    },
    manzilCount() {
      return Number(this.coverage.older_revision?.ayahs || 0)
    },
  },
  methods: {
    rangeLine(bucket) {
      const items = bucket?.items || []
      if (!items.length) return ''
      const shown = items.slice(0, 2).map((range) => ayahRangeLabel(
        range.surah_name,
        range.ayah_start,
        range.ayah_end,
        this.t,
      ))
      if (bucket.omitted) shown.push(this.t('dashboard.progress_more_ranges', { n: bucket.omitted }))
      return shown.join(', ')
    },
  },
}
</script>