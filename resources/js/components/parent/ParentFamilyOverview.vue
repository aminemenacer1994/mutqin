<template>
  <section class="teacher-stack" aria-labelledby="parent-overview-heading">
    <h2 id="parent-overview-heading" class="visually-hidden">{{ t('parent.nav_overview') }}</h2>
    <header class="dash-reveal teacher-hero">
      <div class="teacher-hero__row">
        <div class="teacher-hero__identity">
          <span class="teacher-hero__mark" aria-hidden="true"><i class="bi bi-people"></i></span>
          <div class="teacher-hero__copy">
            <p class="teacher-hero__eyebrow">{{ t('parent.workspace_label') }}</p>
            <h1 class="teacher-hero__title">{{ t('parent.greeting', { name: firstName }) }}</h1>
            <p class="teacher-meta">{{ t('parent.children_linked', { count: children.length }) }}</p>
          </div>
        </div>
      </div>
    </header>

    <ParentChildFilter :children="children" :selected-id="selectedId" @select="$emit('select-child', $event)" />
    <TeacherKpiGrid :cards="kpiCards" compact selectable @select="$emit('select-kpi', $event)" />

    <TeacherEmpty v-if="!children.length" illustrated icon="bi bi-people" :message="t('parent.children_empty')" />

    <div v-else class="teacher-overview-columns">
      <TeacherSectionPane :title="t('parent.overview_children')" icon="bi bi-people" flat>
        <ul class="teacher-activity-list">
          <li v-for="child in children" :key="child.id">
            <button type="button" @click="$emit('open-child', child.id)">
              <span class="teacher-activity-list__avatar" aria-hidden="true">{{ initial(child.name) }}</span>
              <span class="teacher-activity-list__copy">
                <strong>{{ child.name }}</strong>
                <small>{{ childLine(child) }}</small>
              </span>
              <i class="bi bi-chevron-right" aria-hidden="true"></i>
            </button>
          </li>
        </ul>
      </TeacherSectionPane>

      <TeacherSectionPane :title="t('parent.overview_activity')" icon="bi bi-activity" flat>
        <ul v-if="activity.length" class="teacher-activity-list">
          <li v-for="item in activity" :key="item.id">
            <button type="button" @click="$emit('open-child', item.child_id)">
              <span class="teacher-activity-list__avatar" aria-hidden="true">{{ initial(item.child_name) }}</span>
              <span class="teacher-activity-list__copy">
                <strong>{{ item.child_name }}</strong>
                <small>{{ activityLine(item) }}</small>
              </span>
              <span class="teacher-activity-list__score">{{ formatWhen(item.at) }}</span>
              <i class="bi bi-chevron-right" aria-hidden="true"></i>
            </button>
          </li>
        </ul>
        <TeacherEmpty v-else inline icon="bi bi-calendar2" :message="t('parent.activity_empty')" />
      </TeacherSectionPane>
    </div>

    <div v-if="children.length" class="teacher-overview-columns">
      <TeacherSectionPane :title="t('parent.overview_homework')" icon="bi bi-journal-text" flat>
        <p v-if="!summary.assignments_shared" class="teacher-meta">{{ t('parent.permission_assignments') }}</p>
        <ul v-else-if="homework.length" class="teacher-activity-list">
          <li v-for="item in homework" :key="item.id">
            <button type="button" @click="$emit('open-learning', item.child_id)">
              <span class="teacher-activity-list__avatar" aria-hidden="true">{{ initial(item.child_name) }}</span>
              <span class="teacher-activity-list__copy">
                <strong>{{ item.child_name }}</strong>
                <small>{{ homeworkLine(item) }}</small>
              </span>
              <span class="teacher-pill">{{ statusLabel(item.status) }}</span>
              <i class="bi bi-chevron-right" aria-hidden="true"></i>
            </button>
          </li>
        </ul>
        <TeacherEmpty v-else inline icon="bi bi-check2-circle" :message="t('parent.homework_empty')" />
      </TeacherSectionPane>

      <TeacherSectionPane :title="t('parent.overview_feedback')" icon="bi bi-chat-dots" flat>
        <p v-if="!summary.messages_shared" class="teacher-meta">{{ t('parent.permission_messages') }}</p>
        <ul v-else-if="feedback.length" class="teacher-activity-list">
          <li v-for="item in feedback" :key="item.id">
            <button type="button" @click="$emit('open-messages', item.child_id)">
              <span class="teacher-activity-list__avatar" aria-hidden="true">{{ initial(item.child_name) }}</span>
              <span class="teacher-activity-list__copy">
                <strong>{{ item.teacher_name || item.child_name }}</strong>
                <small>{{ item.excerpt }}</small>
              </span>
            </button>
          </li>
        </ul>
        <TeacherEmpty v-else inline icon="bi bi-chat" :message="t('parent.feedback_empty')" />
      </TeacherSectionPane>
    </div>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { activityName, formatWhen, initial, learningLabel, passageLabel } from '../../scripts/parent/dashboard'
import ParentChildFilter from './ParentChildFilter.vue'
import TeacherEmpty from '../teacher/TeacherEmpty.vue'
import TeacherKpiGrid from '../teacher/TeacherKpiGrid.vue'
import TeacherSectionPane from '../teacher/TeacherSectionPane.vue'

export default {
  name: 'ParentFamilyOverview',
  components: { ParentChildFilter, TeacherEmpty, TeacherKpiGrid, TeacherSectionPane },
  mixins: [i18nMixin],
  props: {
    firstName: { type: String, required: true },
    children: { type: Array, default: () => [] },
    summary: { type: Object, default: () => ({}) },
    homework: { type: Array, default: () => [] },
    activity: { type: Array, default: () => [] },
    feedback: { type: Array, default: () => [] },
    selectedId: { type: Number, default: null },
  },
  emits: ['select-child', 'select-kpi', 'open-child', 'open-learning', 'open-messages'],
  computed: {
    kpiCards() {
      const shared = Boolean(this.summary.assignments_shared)
      const hidden = this.t('parent.not_shared')
      return [
        { key: 'children', icon: 'bi bi-people', label: this.t('parent.kpi_children'), value: this.summary.children ?? this.children.length },
        { key: 'active', icon: 'bi bi-journal-text', label: this.t('parent.kpi_active'), value: shared ? (this.summary.active_assignments ?? 0) : hidden },
        { key: 'completed', icon: 'bi bi-check2-circle', label: this.t('parent.kpi_completed'), value: shared ? (this.summary.completed_assignments ?? 0) : hidden },
        { key: 'attention', icon: 'bi bi-exclamation-circle', label: this.t('parent.kpi_attention'), value: shared ? (this.summary.needs_attention ?? 0) : hidden },
      ]
    },
  },
  methods: {
    initial,
    formatWhen,
    childLine(child) {
      const names = (child.teachers || []).map((row) => row.name)
      const teacher = names.length > 1
        ? this.t('parent.teachers_more', { name: names[0], count: names.length - 1 })
        : (names[0] || this.t('parent.teachers_empty'))
      const area = child.permissions?.progress ? learningLabel(this.t, child.learning) : ''
      return [teacher, area].filter(Boolean).join(' · ')
    },
    activityLine(item) {
      if (item.kind === 'completed') {
        return this.t('parent.activity_completed', { task: [activityName(this.t, item.activity), passageLabel(item)].filter(Boolean).join(' · ') })
      }
      const count = Number(item.recent_ayahs || 0)
      if (count === 1) return this.t('parent.activity_practice_one')
      return this.t('parent.activity_practice', { count })
    },
    homeworkLine(item) {
      const when = formatWhen(item.due_at)
      const task = [activityName(this.t, item.activity), passageLabel(item)].filter(Boolean).join(' · ')
      return when ? `${task} · ${when}` : task
    },
    statusLabel(status) {
      const key = `parent.homework_${status}`
      const label = this.t(key)
      return label && label !== key ? label : status
    },
  },
}
</script>
