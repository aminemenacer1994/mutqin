<template>
  <section class="parent-home">
    <div v-if="loading" class="teacher-skeletons" role="status">
      <div v-for="n in 3" :key="n" class="teacher-skeleton"></div>
      <span class="visually-hidden">{{ t('parent.loading') }}</span>
    </div>
    <NetworkFallback v-else-if="error" @retry="$emit('reload')" />
    <TeacherEmpty v-else-if="!profile" illustrated :message="t('parent.profile_empty')" />
    <template v-else>
      <header class="parent-page">
        <span class="parent-avatar parent-avatar--lg" aria-hidden="true">{{ initials(profile.child?.name) }}</span>
        <div>
          <button type="button" class="parent-back" @click="$emit('back')">
            <i class="bi bi-arrow-left" aria-hidden="true"></i>{{ t('parent.back_children') }}
          </button>
          <h1>{{ profile.child?.name }}</h1>
          <p>{{ teacherLine }}</p>
        </div>
      </header>

      <div class="parent-child-card__actions parent-hub-actions">
        <button type="button" @click="$emit('open-learning')"><i class="bi bi-journal-check" aria-hidden="true"></i>{{ t('parent.home_homework') }}</button>
        <button type="button" @click="$emit('open-progress')"><i class="bi bi-graph-up-arrow" aria-hidden="true"></i>{{ t('parent.home_progress') }}</button>
      </div>

      <div v-if="cards.length" class="parent-stats" role="list">
        <article v-for="card in cards" :key="card.key" class="parent-stat" role="listitem">
          <span aria-hidden="true"><i :class="card.icon"></i></span>
          <strong>{{ card.value }}</strong>
          <small>{{ card.label }}</small>
        </article>
      </div>

      <section class="parent-panel">
        <h2><i class="bi bi-book" aria-hidden="true"></i>{{ t('parent.learning_area') }}</h2>
        <p>{{ learningLabel(t, profile.learning_area) || t('parent.learning_empty') }}</p>
      </section>

      <section v-if="latestNote" class="parent-panel">
        <h2><i class="bi bi-chat-left-quote" aria-hidden="true"></i>{{ t('parent.profile_feedback') }}</h2>
        <p>{{ latestNote.body }}</p>
        <small>{{ latestNote.teacher_name || t('parent.teacher_fallback') }} · {{ formatWhen(latestNote.at) }}</small>
      </section>
    </template>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { formatWhen, initial, learningLabel } from '../../scripts/parent/dashboard'
import TeacherEmpty from '../teacher/TeacherEmpty.vue'
import NetworkFallback from '../NetworkFallback.vue'

export default {
  name: 'ParentChildProfile',
  components: { TeacherEmpty, NetworkFallback },
  mixins: [i18nMixin],
  props: {
    profile: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    error: { type: Boolean, default: false },
  },
  emits: ['reload', 'back', 'open-learning', 'open-progress'],
  computed: {
    teacherLine() {
      const name = this.profile?.teachers?.[0]?.name
      return name ? this.t('parent.teacher_named', { name }) : this.t('parent.teachers_empty')
    },
    latestNote() {
      return this.profile?.feedback?.[0] || null
    },
    cards() {
      const summary = this.profile?.assignment_summary
      const memorised = this.profile?.curriculum?.memorised_ayahs
      const cards = []
      if (memorised !== undefined && memorised !== null) {
        cards.push({ key: 'memorised', label: this.t('parent.kpi_memorised'), value: memorised, icon: 'bi bi-journal-bookmark' })
      }
      if (summary) {
        cards.push(
          { key: 'active', label: this.t('parent.kpi_active'), value: summary.active || 0, icon: 'bi bi-journal-text' },
          { key: 'attention', label: this.t('parent.kpi_attention'), value: summary.needs_attention || 0, icon: 'bi bi-exclamation-circle' },
        )
      }
      return cards.slice(0, 3)
    },
  },
  methods: { learningLabel, initials: initial, formatWhen },
}
</script>
