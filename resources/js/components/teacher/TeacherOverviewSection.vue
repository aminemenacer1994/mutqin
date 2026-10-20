<template>
  <section class="teacher-stack" aria-labelledby="teacher-overview-heading">
    <h2 id="teacher-overview-heading" class="visually-hidden">{{ t('teacher.nav_overview') }}</h2>

    <TeacherKpiGrid :cards="kpiCards" stagger selectable @select="$emit('select-kpi', $event)" />

    <TeacherPanel
      :title="t('teacher.overview_need_look')"
      icon="bi bi-exclamation-circle"
      compact
    >
      <TeacherEmpty v-if="!needLook.length" icon="bi bi-check2-circle" :message="t('teacher.need_look_empty')" />
      <div v-else class="teacher-grid">
        <TeacherStudentCard
          v-for="student in visibleNeedLook"
          :key="student.id"
          :student="student"
          :format-when="formatWhen"
          @open="openStudent"
        />
      </div>
      <TeacherMore :remaining="needLook.length - shownNeed" @more="shownNeed += STEP" />
    </TeacherPanel>

    <TeacherPanel
      :title="t('teacher.overview_practising')"
      icon="bi bi-calendar-week"
      compact
    >
      <TeacherEmpty v-if="!thisWeek.length" icon="bi bi-moon" :message="t('teacher.none')" />
      <div v-else class="teacher-grid">
        <TeacherStudentCard
          v-for="student in visibleThisWeek"
          :key="student.id"
          :student="student"
          :format-when="formatWhen"
          @open="openStudent"
        />
      </div>
      <TeacherMore :remaining="thisWeek.length - shownWeek" @more="shownWeek += STEP" />
    </TeacherPanel>
  </section>
</template>
<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherKpiGrid from './TeacherKpiGrid.vue'
import TeacherMore from './TeacherMore.vue'
import TeacherPanel from './TeacherPanel.vue'
import TeacherStudentCard from './TeacherStudentCard.vue'

const STEP = 4

export default {
  name: 'TeacherOverviewSection',
  components: { TeacherEmpty, TeacherKpiGrid, TeacherMore, TeacherPanel, TeacherStudentCard },
  mixins: [i18nMixin],
  props: {
    overview: { type: Object, required: true },
    kpiCards: { type: Array, default: () => [] },
    formatWhen: { type: Function, required: true },
  },
  emits: ['open-student', 'select-kpi'],
  data() {
    return { shownNeed: STEP, shownWeek: STEP, STEP }
  },
  computed: {
    needLook() {
      const inactive = this.overview.inactive || []
      const extra = (this.overview.recently_active || []).filter((student) => student.needs_attention)
      const seen = new Set()
      return [...inactive, ...extra].filter((student) => {
        if (seen.has(student.id)) return false
        seen.add(student.id)
        return true
      })
    },
    thisWeek() {
      return this.overview.recently_active || []
    },
    visibleNeedLook() {
      return this.needLook.slice(0, this.shownNeed)
    },
    visibleThisWeek() {
      return this.thisWeek.slice(0, this.shownWeek)
    },
  },
  methods: {
    openStudent(id) {
      this.$emit('open-student', id, 'overview')
    },
  },
}
</script>

