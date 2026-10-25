<template>
  <ul v-if="rows.length" class="list-group list-group-flush teacher-attention-list">
    <li v-for="student in visibleRows" :key="student.id" class="list-group-item teacher-attention-list__item d-flex align-items-center" :class="`is-${reason(student)?.tone || 'quiet'}`">
      <button type="button" class="btn btn-link teacher-attention-list__main d-flex align-items-center gap-3 flex-grow-1 text-start text-decoration-none p-0" @click="$emit('open-student', student.id)">
        <span class="teacher-list__avatar" aria-hidden="true">{{ initial(student.name) }}</span>
        <span class="teacher-attention-list__copy">
          <span class="teacher-attention-list__name">{{ student.name }}</span>
          <span class="teacher-attention-list__reasons">
            <span v-for="item in reasons(student).slice(0, 2)" :key="item.key" class="teacher-attention-list__reason" :class="`is-${item.tone}`">
              <i :class="item.icon" aria-hidden="true"></i>
              {{ item.label }}
            </span>
            <span v-if="reasons(student).length > 2" class="teacher-attention-list__more" :title="reasons(student).slice(2).map((item) => item.label).join(', ')" :aria-label="reasons(student).slice(2).map((item) => item.label).join(', ')">{{ t('teacher.more_reasons', { n: reasons(student).length - 2 }) }}</span>
          </span>
        </span>
      </button>
      <button
        type="button"
        class="teacher-attention-list__assign"
        :aria-label="t('teacher.assign_revision_for', { name: student.name })"
        :title="t('teacher.assign_revision')"
        @click="$emit('assign-revision', student)"
      >
        <i class="bi bi-journal-plus" aria-hidden="true"></i>
      </button>
      <i class="bi bi-chevron-right teacher-attention-list__chev" aria-hidden="true"></i>
    </li>
  </ul>
  <TeacherMore v-if="rows.length" :remaining="rows.length - shown" :shown="shown" :initial="5" @more="shown += 5" @less="shown = 5" />
  <TeacherEmpty v-else icon="bi bi-check2-circle" :message="t('teacher.need_look_empty')" />
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { attentionReasonTags, studentInitial } from '../../scripts/teacher/formatters'
import TeacherEmpty from './TeacherEmpty.vue'
import TeacherMore from './TeacherMore.vue'

export default {
  name: 'TeacherAttentionList',
  components: { TeacherEmpty, TeacherMore },
  mixins: [i18nMixin],
  props: {
    rows: { type: Array, default: () => [] },
  },
  emits: ['open-student', 'assign-revision'],
  data() {
    return { shown: 5 }
  },
  computed: {
    visibleRows() {
      return this.rows.slice(0, this.shown)
    },
  },
  methods: {
    initial: studentInitial,
    reason(student) {
      return attentionReasonTags(student, this.t)[0] || null
    },
    reasons(student) {
      return attentionReasonTags(student, this.t)
    },
  },
}
</script>
