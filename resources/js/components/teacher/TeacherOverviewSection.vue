<template>
  <section class="teacher-stack" aria-labelledby="teacher-overview-heading">
    <h2 id="teacher-overview-heading" class="visually-hidden">{{ t('teacher.nav_overview') }}</h2>

    <section class="teacher-overview-summary" :aria-label="t('teacher.nav_overview')">
      <TeacherKpiGrid :cards="kpiCards" compact selectable @select="$emit('select-kpi', $event)" />
    </section>

    <TeacherActivityChart
      :chart-days="chartDays"
      :day-options="chartDayOptions"
      :is-empty="chartEmpty"
      :chart-ready="chartReady"
      :chart-data="chartData"
      :chart-options="chartOptions"
      @set-days="$emit('set-chart-days', $event)"
    />

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
      <button v-if="!attentionRows.length" type="button" class="btn btn-outline-secondary btn-sm teacher-empty-action" @click="$emit('select-kpi', 'students')">{{ t('teacher.view_students') }}</button>
    </TeacherSectionPane>

    <div class="teacher-overview-detail-grid teacher-overview-detail-grid--activity-only">
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
              <span v-if="typeof student.ai_success_rate === 'number'" class="teacher-activity-list__score" :class="`teacher-activity-list__score--${scoreTone(student.ai_success_rate)}`">
                {{ student.ai_success_rate }}%
                <small>{{ t('teacher.ai_word_match_short') }}</small>
              </span>
              <i class="bi bi-chevron-right" aria-hidden="true"></i>
            </button>
          </li>
        </ul>
        <div v-else class="teacher-empty-with-action">
          <TeacherEmpty inline icon="bi bi-calendar2" :message="t('teacher.activity_empty')" />
          <button type="button" class="btn btn-outline-secondary btn-sm teacher-empty-action" @click="$emit('select-kpi', 'students')">{{ t('teacher.view_students') }}</button>
        </div>
      </TeacherSectionPane>

    </div>
  </section>
</template>
<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { scoreBadgeTone, studentInitial } from '../../scripts/teacher/formatters'
import TeacherActivityChart from './TeacherActivityChart.vue'
import TeacherAttentionList from './TeacherAttentionList.vue'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherKpiGrid from './TeacherKpiGrid.vue'
import TeacherSectionPane from './TeacherSectionPane.vue'

export default {
  name: 'TeacherOverviewSection',
  components: {
    TeacherActivityChart,
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
    chartDays: { type: Number, default: 30 },
    chartDayOptions: { type: Array, default: () => [30, 90] },
    chartEmpty: { type: Boolean, default: false },
    chartReady: { type: Boolean, default: true },
    chartData: { type: Object, required: true },
    chartOptions: { type: Object, required: true },
  },
  emits: ['open-student', 'select-kpi', 'assign-revision', 'set-chart-days'],
  computed: {
    recentActivity() {
      return (this.overview.recently_active || []).slice(0, 5)
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
    scoreTone: scoreBadgeTone,
    openStudent(id) {
      this.$emit('open-student', id, 'overview')
    },
  },
}
</script>
