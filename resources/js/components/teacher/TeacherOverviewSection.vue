<template>
  <section class="teacher-stack" aria-labelledby="teacher-overview-heading">
    <h2 id="teacher-overview-heading" class="visually-hidden">{{ t('teacher.nav_overview') }}</h2>

    <section class="teacher-overview-summary" :aria-label="t('teacher.nav_overview')">
      <div class="teacher-section-intro">
        <div>
          <p class="teacher-section-intro__eyebrow">{{ t('teacher.overview_at_a_glance') }}</p>
          <h3>{{ t('teacher.overview_title') }}</h3>
          <p>{{ t('teacher.overview_subtitle') }}</p>
        </div>
        <span class="teacher-section-intro__icon" aria-hidden="true"><i class="bi bi-compass"></i></span>
      </div>
      <TeacherKpiGrid :cards="kpiCards" compact selectable @select="$emit('select-kpi', $event)" />
    </section>

    <TeacherSectionPane
      :title="t('teacher.overview_need_look')"
      :hint="t('teacher.overview_need_look_hint')"
      icon="bi bi-exclamation-circle"
      tone="warn"
    >
      <TeacherAttentionList
        :rows="attentionRows"
        @open-student="openStudent"
        @assign-revision="$emit('assign-revision', $event)"
      />
    </TeacherSectionPane>

    <div class="teacher-overview-detail-grid">
      <TeacherSectionPane
        :title="t('teacher.overview_recent_activity')"
        :hint="t('teacher.overview_recent_activity_hint')"
        icon="bi bi-activity"
        tone="practice"
      >
        <ul v-if="recentActivity.length" class="teacher-activity-list">
          <li v-for="student in recentActivity" :key="student.id">
            <button type="button" @click="openStudent(student.id)">
              <span class="teacher-activity-list__avatar" aria-hidden="true">{{ initial(student.name) }}</span>
              <span class="teacher-activity-list__copy">
                <strong>{{ student.name }}</strong>
                <small>{{ t('teacher.activity_recorded', { when: formatWhen(student.last_activity_at) }) }}</small>
              </span>
              <span v-if="typeof student.ai_success_rate === 'number'" class="teacher-activity-list__score">
                {{ student.ai_success_rate }}%
                <small>{{ t('teacher.ai_word_match_short') }}</small>
              </span>
              <i class="bi bi-chevron-right" aria-hidden="true"></i>
            </button>
          </li>
        </ul>
        <TeacherEmpty v-else inline icon="bi bi-calendar2" :message="t('teacher.activity_empty')" />
      </TeacherSectionPane>

      <TeacherSectionPane
        :title="t('teacher.overview_task_status')"
        :hint="t('teacher.overview_task_status_hint')"
        icon="bi bi-clipboard-check"
        tone="neutral"
      >
        <div class="teacher-task-pulse">
          <div class="teacher-task-pulse__lead">
            <strong>{{ openTaskCount }}</strong>
            <span>{{ t('teacher.open_tasks_explained') }}</span>
          </div>
          <dl class="teacher-task-pulse__breakdown">
            <div v-for="item in taskBreakdown" :key="item.key" :class="`is-${item.tone}`">
              <dt><span aria-hidden="true"></span>{{ item.label }}</dt>
              <dd>{{ item.value }}</dd>
            </div>
          </dl>
        </div>
      </TeacherSectionPane>
    </div>
  </section>
</template>
<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { studentInitial } from '../../scripts/teacher/formatters'
import TeacherAttentionList from './TeacherAttentionList.vue'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherKpiGrid from './TeacherKpiGrid.vue'
import TeacherSectionPane from './TeacherSectionPane.vue'

export default {
  name: 'TeacherOverviewSection',
  components: {
    TeacherAttentionList,
    TeacherEmpty,
    TeacherKpiGrid,
    TeacherSectionPane,
  },
  mixins: [i18nMixin],
  props: {
    overview: { type: Object, required: true },
    kpiCards: { type: Array, default: () => [] },
    attentionPreview: { type: Array, default: () => [] },
    formatWhen: { type: Function, required: true },
  },
  emits: ['open-student', 'select-kpi', 'assign-revision'],
  computed: {
    recentActivity() {
      return (this.overview.recently_active || []).slice(0, 5)
    },
    openTaskCount() {
      return Number(this.overview.assignments?.outstanding || 0)
    },
    taskBreakdown() {
      const counts = this.overview.assignments || {}
      return [
        { key: 'pending', label: this.t('teacher.status_pending'), value: Number(counts.pending || 0), tone: 'muted' },
        { key: 'progress', label: this.t('teacher.status_in_progress'), value: Number(counts.in_progress || 0), tone: 'mid' },
        { key: 'overdue', label: this.t('teacher.status_overdue'), value: Number(counts.overdue || 0), tone: 'danger' },
        { key: 'completed', label: this.t('teacher.status_completed'), value: Number(counts.completed || 0), tone: 'good' },
      ]
    },
    attentionRows() {
      if (this.attentionPreview.length) return this.attentionPreview
      const inactive = this.overview.inactive || []
      const extra = (this.overview.recently_active || []).filter((student) => student.needs_attention)
      const seen = new Set()
      return [...inactive, ...extra].filter((student) => {
        if (!student?.needs_attention || seen.has(student.id)) return false
        seen.add(student.id)
        return true
      })
    },
  },
  methods: {
    initial: studentInitial,
    openStudent(id) {
      this.$emit('open-student', id, 'overview')
    },
  },
}
</script>
