<template>
  <section class="parent-home">
    <header class="parent-page">
      <span class="parent-page__icon" aria-hidden="true"><i class="bi bi-graph-up-arrow"></i></span>
      <div>
        <h1>{{ t('parent.nav_progress') }}</h1>
        <p>{{ t('parent.progress_detail_hint') }}</p>
      </div>
    </header>

    <div class="parent-filters">
      <ParentChildFilter :children="allChildren" :selected-id="selectedId" :allow-all="false" @select="$emit('select-child', $event)" />
      <div class="parent-pills" role="group" :aria-label="t('parent.progress_window_label')">
        <button type="button" :class="{ 'is-active': window === 'week' }" :aria-pressed="window === 'week' ? 'true' : 'false'" @click="$emit('window', 'week')">{{ t('parent.progress_week') }}</button>
        <button type="button" :class="{ 'is-active': window === 'month' }" :aria-pressed="window === 'month' ? 'true' : 'false'" @click="$emit('window', 'month')">{{ t('parent.progress_month') }}</button>
      </div>
    </div>

    <TeacherEmpty v-if="!children.length" illustrated icon="bi bi-people" :message="t('parent.children_empty')" />
    <TeacherEmpty v-else-if="!childId" illustrated icon="bi bi-person" :message="t('parent.progress_pick_child')" />
    <TeacherEmpty v-else-if="!shared" illustrated icon="bi bi-lock" :message="t('parent.permission_progress')" />
    <div v-else-if="loading" class="teacher-skeletons" role="status">
      <div v-for="n in 3" :key="n" class="teacher-skeleton"></div>
      <span class="visually-hidden">{{ t('parent.loading') }}</span>
    </div>
    <NetworkFallback v-else-if="error" @retry="$emit('reload')" />
    <template v-else-if="payload">
      <p class="parent-lead">{{ summaryLine }}</p>
      <div class="parent-stats" role="list">
        <article v-for="card in cards" :key="card.key" class="parent-stat" role="listitem">
          <span aria-hidden="true"><i :class="card.icon"></i></span>
          <strong>{{ card.value }}</strong>
          <small>{{ card.label }}</small>
        </article>
      </div>
      <section v-if="suggestions.length" class="parent-suggest">
        <h2><i class="bi bi-lightbulb" aria-hidden="true"></i>{{ t('parent.progress_suggests') }}</h2>
        <ul>
          <li v-for="item in suggestions" :key="item.id">{{ recommendationTitle(item) }}</li>
        </ul>
      </section>
    </template>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { activityName, passageLabel } from '../../scripts/parent/dashboard'
import ParentChildFilter from './ParentChildFilter.vue'
import TeacherEmpty from '../teacher/TeacherEmpty.vue'
import NetworkFallback from '../NetworkFallback.vue'

export default {
  name: 'ParentFamilyProgress',
  components: { ParentChildFilter, TeacherEmpty, NetworkFallback },
  mixins: [i18nMixin],
  props: {
    children: { type: Array, default: () => [] },
    allChildren: { type: Array, default: () => [] },
    selectedId: { type: Number, default: null },
    shared: { type: Boolean, default: false },
    childId: { type: Number, default: null },
    payload: { type: Object, default: null },
    window: { type: String, default: 'month' },
    loading: { type: Boolean, default: false },
    error: { type: Boolean, default: false },
  },
  emits: ['select-child', 'window', 'reload'],
  computed: {
    cards() {
      const coverage = this.payload?.coverage || {}
      const practice = this.payload?.practice_volume || {}
      return [
        { key: 'memorised', label: this.t('parent.kpi_memorised'), value: coverage.memorised_ayahs || 0, icon: 'bi bi-journal-bookmark' },
        { key: 'learning', label: this.t('parent.kpi_learning'), value: coverage.learning_ayahs || 0, icon: 'bi bi-pencil' },
        { key: 'practice', label: this.t('parent.kpi_practice'), value: practice.ayah_rows || 0, icon: 'bi bi-activity' },
      ]
    },
    suggestions() {
      return (this.payload?.recommendations || []).slice(0, 3)
    },
    summaryLine() {
      const count = Number(this.payload?.practice_volume?.ayah_rows || 0)
      const when = this.t(this.window === 'week' ? 'parent.progress_when_week' : 'parent.progress_when_month')
      if (!count) return this.t('parent.progress_quiet')
      if (count === 1) return this.t('parent.progress_simple_one', { when })
      return this.t('parent.progress_simple', { count, when })
    },
  },
  methods: {
    recommendationTitle(item) {
      return [activityName(this.t, item.activity), passageLabel(item) || item.surah_name].filter(Boolean).join(' · ')
    },
  },
}
</script>
