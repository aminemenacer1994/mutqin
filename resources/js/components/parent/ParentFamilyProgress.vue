<template>
  <section class="teacher-stack">
    <header class="teacher-page-header">
      <div>
        <p class="teacher-kicker">{{ t('parent.workspace_label') }}</p>
        <h1 class="teacher-page-header__title">{{ t('parent.nav_progress') }}</h1>
        <p class="teacher-page-header__hint">{{ t('parent.progress_hint') }}</p>
      </div>
    </header>
    <ParentChildFilter :children="allChildren" :selected-id="selectedId" @select="$emit('select-child', $event)" />
    <TeacherEmpty v-if="!children.length" illustrated icon="bi bi-people" :message="t('parent.children_empty')" />
    <div v-else class="d-grid gap-3">
      <TeacherSectionPane v-for="child in children" :key="child.id" :title="child.name" icon="bi bi-graph-up" flat>
        <TeacherEmpty v-if="!child.permissions?.progress" inline icon="bi bi-lock" :message="t('parent.permission_progress')" />
        <div v-else class="d-grid gap-2">
          <p class="mb-0"><strong>{{ t('parent.learning_area') }}</strong> {{ learningLabel(t, child.learning) || t('parent.learning_empty') }}</p>
          <p class="mb-0">{{ progressLine(child) }}</p>
          <p v-if="teacherLine(child)" class="teacher-meta mb-0">{{ teacherLine(child) }}</p>
          <button type="button" class="btn btn-outline-secondary btn-sm" @click="$emit('open-learning', child.id)">{{ t('parent.open_learning') }}</button>
        </div>
      </TeacherSectionPane>
    </div>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { formatWhen, learningLabel } from '../../scripts/parent/dashboard'
import ParentChildFilter from './ParentChildFilter.vue'
import TeacherEmpty from '../teacher/TeacherEmpty.vue'
import TeacherSectionPane from '../teacher/TeacherSectionPane.vue'

export default {
  name: 'ParentFamilyProgress',
  components: { ParentChildFilter, TeacherEmpty, TeacherSectionPane },
  mixins: [i18nMixin],
  props: {
    children: { type: Array, default: () => [] },
    allChildren: { type: Array, default: () => [] },
    selectedId: { type: Number, default: null },
  },
  emits: ['select-child', 'open-learning'],
  methods: {
    learningLabel,
    progressLine(child) {
      const count = Number(child.progress?.recent_ayahs || 0)
      const when = formatWhen(child.progress?.last_activity_at)
      if (!when) return this.t('parent.progress_none')
      if (count === 1) return this.t('parent.progress_recent_one', { when })
      return this.t('parent.progress_recent', { count, when })
    },
    teacherLine(child) {
      const names = (child.teachers || []).map((teacher) => teacher.name)
      return names.length ? this.t('parent.teachers_named', { names: names.join(', ') }) : ''
    },
  },
}
</script>
