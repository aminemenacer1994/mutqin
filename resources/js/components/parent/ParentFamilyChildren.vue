<template>
  <section class="teacher-stack">
    <header class="teacher-page-header">
      <div>
        <p class="teacher-kicker">{{ t('parent.workspace_label') }}</p>
        <h1 class="teacher-page-header__title">{{ t('parent.nav_children') }}</h1>
        <p class="teacher-page-header__hint">{{ t('parent.children_hint') }}</p>
      </div>
      <span class="teacher-page-count">{{ children.length }}</span>
    </header>
    <ParentChildFilter :children="allChildren" :selected-id="selectedId" @select="$emit('select-child', $event)" />
    <TeacherEmpty v-if="!children.length" illustrated icon="bi bi-people" :message="t('parent.children_empty')" />
    <div v-else class="d-grid gap-3">
      <article v-for="child in children" :key="child.id" class="teacher-pane">
        <header class="teacher-pane__head">
          <span class="teacher-profile-hero__avatar" aria-hidden="true">{{ initial(child.name) }}</span>
          <div class="teacher-pane__titles">
            <h2 class="teacher-pane__title mb-0">{{ child.name }}</h2>
            <p class="teacher-pane__hint mb-0">{{ teacherLine(child) }}</p>
          </div>
        </header>
        <div class="teacher-pane__body d-grid gap-3">
          <div>
            <p class="teacher-meta mb-1">{{ t('parent.learning_area') }}</p>
            <p v-if="!child.permissions?.progress" class="mb-0">{{ t('parent.permission_progress') }}</p>
            <p v-else class="mb-0">{{ learningLabel(t, child.learning) || t('parent.learning_empty') }}</p>
          </div>
          <div>
            <p class="teacher-meta mb-1">{{ t('parent.recent_progress') }}</p>
            <p v-if="!child.permissions?.progress" class="mb-0">{{ t('parent.permission_progress') }}</p>
            <p v-else class="mb-0">{{ progressLine(child) }}</p>
          </div>
          <div class="d-flex flex-wrap gap-2">
            <button type="button" class="btn btn-outline-secondary btn-sm" @click="$emit('open-learning', child.id)">{{ t('parent.open_learning') }}</button>
            <button type="button" class="btn btn-outline-secondary btn-sm" @click="$emit('open-progress', child.id)">{{ t('parent.open_progress') }}</button>
            <button type="button" class="btn btn-primary btn-sm" @click="$emit('open-messages', child.id)">{{ t('parent.open_teacher') }}</button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { formatWhen, initial, learningLabel } from '../../scripts/parent/dashboard'
import ParentChildFilter from './ParentChildFilter.vue'
import TeacherEmpty from '../teacher/TeacherEmpty.vue'

export default {
  name: 'ParentFamilyChildren',
  components: { ParentChildFilter, TeacherEmpty },
  mixins: [i18nMixin],
  props: {
    children: { type: Array, default: () => [] },
    allChildren: { type: Array, default: () => [] },
    selectedId: { type: Number, default: null },
  },
  emits: ['select-child', 'open-learning', 'open-progress', 'open-messages'],
  methods: {
    initial,
    learningLabel,
    teacherLine(child) {
      const names = (child.teachers || []).map((teacher) => teacher.name)
      return names.length ? names.join(', ') : this.t('parent.teachers_empty')
    },
    progressLine(child) {
      const recent = Number(child.progress?.recent_ayahs || 0)
      const when = formatWhen(child.progress?.last_activity_at)
      if (!when) return this.t('parent.progress_none')
      if (recent === 1) return this.t('parent.progress_recent_one', { when })
      return this.t('parent.progress_recent', { count: recent, when })
    },
  },
}
</script>
