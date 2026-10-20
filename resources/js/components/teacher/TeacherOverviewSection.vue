<template>
  <section class="teacher-stack" aria-labelledby="teacher-overview-heading">
    <h2 id="teacher-overview-heading" class="visually-hidden">{{ t('teacher.nav_overview') }}</h2>

    <TeacherKpiGrid :cards="kpiCards" compact selectable @select="$emit('select-kpi', $event)" />

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
  </section>
</template>
<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import TeacherAttentionList from './TeacherAttentionList.vue'
import TeacherKpiGrid from './TeacherKpiGrid.vue'
import TeacherSectionPane from './TeacherSectionPane.vue'

export default {
  name: 'TeacherOverviewSection',
  components: {
    TeacherAttentionList,
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
    attentionRows() {
      if (this.attentionPreview.length) return this.attentionPreview
      const inactive = this.overview.inactive || []
      const extra = (this.overview.recently_active || []).filter((student) => student.needs_attention)
      const seen = new Set()
      return [...inactive, ...extra].filter((student) => {
        if (!student?.needs_attention || seen.has(student.id)) return false
        seen.add(student.id)
        return true
      }).slice(0, 6)
    },
  },
  methods: {
    openStudent(id) {
      this.$emit('open-student', id, 'overview')
    },
  },
}
</script>
