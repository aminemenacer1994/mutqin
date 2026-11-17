<template>
  <ul v-if="rows.length" class="list-group list-group-flush teacher-attention-list">
    <li v-for="student in visibleRows" :key="student.id" class="list-group-item teacher-attention-list__item d-flex align-items-center" :class="`is-${reason(student)?.tone || 'quiet'}`">
      <button type="button" class="btn btn-link teacher-attention-list__main d-flex align-items-center gap-3 flex-grow-1 text-start text-decoration-none p-0" @click="openRow(student)">
        <span class="teacher-list__avatar" aria-hidden="true">{{ initial(student.name) }}</span>
        <span class="teacher-attention-list__copy">
          <span class="teacher-attention-list__name">{{ student.name }}</span>
          <span class="teacher-attention-list__reasons">
            <span v-if="reason(student)" class="teacher-attention-list__reason" :class="`is-${reason(student).tone}`" :title="reasonTitle(student)">
              <i :class="reason(student).icon" aria-hidden="true"></i>
              {{ reason(student).label }}
            </span>
            <span v-if="extraReasonCount(student)" class="teacher-attention-list__reason is-quiet">+{{ extraReasonCount(student) }}</span>
            <span v-if="student.last_activity_at && formatWhen" class="teacher-attention-list__when">{{ formatWhen(student.last_activity_at) }}</span>
          </span>
        </span>
        <span class="teacher-attention-list__action">{{ action(student).label }}</span>
      </button>

    </li>
  </ul>
  <TeacherMore v-if="rows.length" :remaining="rows.length - shown" :shown="shown" :initial="5" @more="shown += 5" @less="shown = 5" />
  <TeacherEmpty v-else icon="bi bi-check2-circle" :message="t('teacher.need_look_empty')" />
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { attentionReasonTags, studentInitial, teacherAttentionAction, teacherAttentionRank } from '../../scripts/teacher/formatters'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherMore from './TeacherMore.vue'

export default {
  name: 'TeacherAttentionList',
  components: { TeacherEmpty, TeacherMore },
  mixins: [i18nMixin],
  props: {
    rows: { type: Array, default: () => [] },
    formatWhen: { type: Function, default: null },
  },
  emits: ['open-student', 'assign-revision'],
  data() {
    return { shown: 5 }
  },
  computed: {
    visibleRows() {
      return [...this.rows].sort((a, b) => teacherAttentionRank(a) - teacherAttentionRank(b)).slice(0, this.shown)
    },
  },
  methods: {
    initial: studentInitial,
    action(student) {
      return teacherAttentionAction(student, this.t)
    },
    openRow(student) {
      const next = this.action(student)
      if (next.assign) {
        this.$emit('assign-revision', student)
        return
      }
      this.$emit('open-student', student.id, next.section || 'ai', next.focus || null)
    },
    reason(student) {
      return attentionReasonTags(student, this.t)[0] || null
    },
    reasons(student) {
      return attentionReasonTags(student, this.t)
    },
    extraReasonCount(student) {
      return Math.max(0, this.reasons(student).length - 1)
    },
    reasonTitle(student) {
      return this.reasons(student).map((item) => item.label).join(' · ')
    },
  },
}
</script>
