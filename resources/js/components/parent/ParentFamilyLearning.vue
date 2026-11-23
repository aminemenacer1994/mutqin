<template>
  <section class="teacher-stack">
    <header class="teacher-page-header">
      <div>
        <p class="teacher-kicker">{{ t('parent.workspace_label') }}</p>
        <h1 class="teacher-page-header__title">{{ t('parent.nav_learning') }}</h1>
        <p class="teacher-page-header__hint">{{ t('parent.learning_hint') }}</p>
      </div>
    </header>
    <ParentChildFilter :children="children" :selected-id="selectedId" @select="$emit('select-child', $event)" />
    <TeacherEmpty v-if="!children.length" illustrated icon="bi bi-people" :message="t('parent.children_empty')" />
    <TeacherSectionPane v-else-if="!shared" :title="t('parent.nav_learning')" icon="bi bi-journal-text" flat>
      <TeacherEmpty inline icon="bi bi-lock" :message="t('parent.permission_assignments')" />
    </TeacherSectionPane>
    <TeacherSectionPane v-else :title="t('parent.overview_homework')" icon="bi bi-journal-text" flat>
      <TeacherEmpty v-if="!homework.length" inline icon="bi bi-check2-circle" :message="t('parent.homework_empty')" />
      <ul v-else class="teacher-activity-list">
        <li v-for="item in homework" :key="item.id">
          <button type="button" @click="$emit('select-child', item.child_id)">
            <span class="teacher-activity-list__avatar" aria-hidden="true">{{ initial(item.child_name) }}</span>
            <span class="teacher-activity-list__copy">
              <strong>{{ item.child_name }}</strong>
              <small>{{ taskLine(item) }}</small>
              <small v-if="item.teacher_name">{{ t('parent.teacher_named', { name: item.teacher_name }) }}</small>
              <small v-if="item.feedback">{{ item.feedback }}</small>
            </span>
            <span class="teacher-pill">{{ statusLabel(item.status) }}</span>
            <i class="bi bi-chevron-right" aria-hidden="true"></i>
          </button>
        </li>
      </ul>
    </TeacherSectionPane>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { activityName, formatWhen, initial, passageLabel } from '../../scripts/parent/dashboard'
import ParentChildFilter from './ParentChildFilter.vue'
import TeacherEmpty from '../teacher/TeacherEmpty.vue'
import TeacherSectionPane from '../teacher/TeacherSectionPane.vue'

export default {
  name: 'ParentFamilyLearning',
  components: { ParentChildFilter, TeacherEmpty, TeacherSectionPane },
  mixins: [i18nMixin],
  props: {
    children: { type: Array, default: () => [] },
    homework: { type: Array, default: () => [] },
    selectedId: { type: Number, default: null },
    shared: { type: Boolean, default: false },
  },
  emits: ['select-child'],
  methods: {
    initial,
    taskLine(item) {
      const task = [activityName(this.t, item.activity), passageLabel(item)].filter(Boolean).join(' · ')
      const when = formatWhen(item.due_at)
      return when ? this.t('parent.homework_due', { task, when }) : task
    },
    statusLabel(status) {
      const key = `parent.homework_${status}`
      const label = this.t(key)
      return label && label !== key ? label : status
    },
  },
}
</script>
