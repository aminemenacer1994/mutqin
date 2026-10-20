<template>
  <section class="teacher-stack" aria-labelledby="teacher-overview-heading">
    <h2 id="teacher-overview-heading" class="visually-hidden">{{ t('teacher.nav_overview') }}</h2>

    <TeacherKpiGrid :cards="kpiCards" stagger />

    <ul class="teacher-stat-strip">
      <li>
        <span>{{ t('teacher.overdue_revisions') }}</span>
        <strong class="dash-num">{{ overview.kpis.overdue_revisions }}</strong>
      </li>
      <li>
        <span>{{ t('teacher.outstanding') }}</span>
        <strong class="dash-num">{{ overview.kpis.outstanding_assignments }}</strong>
      </li>
    </ul>

    <TeacherActivityChart
      :chart-days="chartDays"
      :day-options="dayOptions"
      :is-empty="overview.chart?.is_empty"
      :chart-ready="chartReady"
      :chart-data="chartData"
      :chart-options="chartOptions"
      @set-days="$emit('set-days', $event)"
    />

    <div class="teacher-split">
      <section class="dash-section dash-section--flat">
        <div class="dash-section__head dash-section__head--compact"><h2>{{ t('teacher.recent_active') }}</h2></div>
        <div class="dash-section__body">
          <TeacherEmpty v-if="!overview.recently_active?.length" :message="t('teacher.none')" />
          <TeacherBorderedList
            v-else
            :rows="overview.recently_active.map((student) => ({
              id: student.id,
              primary: student.name,
              secondary: formatWhen(student.last_activity_at),
              action: { type: 'student', id: student.id },
            }))"
            @action="onStudentRow"
          />
        </div>
      </section>
      <section class="dash-section dash-section--flat">
        <div class="dash-section__head dash-section__head--compact"><h2>{{ t('teacher.inactive') }}</h2></div>
        <div class="dash-section__body">
          <TeacherEmpty v-if="!overview.inactive?.length" :message="t('teacher.none')" />
          <TeacherBorderedList
            v-else
            :rows="overview.inactive.map((student) => ({
              id: student.id,
              primary: student.name,
              secondary: student.last_activity_at ? formatWhen(student.last_activity_at) : t('teacher.no_activity'),
              action: { type: 'student', id: student.id },
            }))"
            @action="onStudentRow"
          />
        </div>
      </section>
    </div>

    <section class="dash-section dash-section--flat">
      <div class="dash-section__head dash-section__head--compact"><h2>{{ t('teacher.recent_ai') }}</h2></div>
      <div class="dash-section__body">
        <TeacherEmpty v-if="!overview.recent_ai?.length" :message="t('teacher.ai_empty')" />
        <TeacherBorderedList
          v-else
          :rows="overview.recent_ai.map((item) => ({
            id: item.id,
            primary: item.student_name,
            secondary: `${item.surah_name || t('teacher.surah_n', { n: item.surah_number })} · ${item.accuracy_percent}%`,
            action: { type: 'student', id: item.student_id, section: 'ai' },
          }))"
          @action="onStudentRow"
        />
      </div>
    </section>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import TeacherActivityChart from './TeacherActivityChart.vue'
import TeacherBorderedList from './TeacherBorderedList.vue'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherKpiGrid from './TeacherKpiGrid.vue'

export default {
  name: 'TeacherOverviewSection',
  components: { TeacherActivityChart, TeacherBorderedList, TeacherEmpty, TeacherKpiGrid },
  mixins: [i18nMixin],
  props: {
    overview: { type: Object, required: true },
    kpiCards: { type: Array, default: () => [] },
    chartDays: { type: Number, required: true },
    dayOptions: { type: Array, default: () => [7, 30, 90] },
    chartReady: { type: Boolean, default: true },
    chartData: { type: Object, required: true },
    chartOptions: { type: Object, required: true },
    formatWhen: { type: Function, required: true },
  },
  emits: ['set-days', 'open-student'],
  methods: {
    onStudentRow(action) {
      this.$emit('open-student', action.id, action.section || 'overview')
    },
  },
}
</script>
