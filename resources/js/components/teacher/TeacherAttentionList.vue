<template>
  <ul v-if="rows.length" class="teacher-attention-list">
    <li v-for="student in rows" :key="student.id" class="teacher-attention-list__item">
      <button type="button" class="teacher-attention-list__main" @click="$emit('open-student', student.id)">
        <span class="teacher-list__avatar" aria-hidden="true">{{ initial(student.name) }}</span>
        <span class="teacher-attention-list__copy">
          <span class="teacher-attention-list__name">{{ student.name }}</span>
          <span class="teacher-attention-list__tags">
            <span
              v-for="tag in tags(student)"
              :key="tag.key"
              class="teacher-tag"
              :class="`teacher-tag--${tag.tone}`"
            >
              <i :class="tag.icon" aria-hidden="true"></i>
              {{ tag.label }}
            </span>
          </span>
        </span>
        <i class="bi bi-chevron-right teacher-attention-list__chev" aria-hidden="true"></i>
      </button>
      <button
        type="button"
        class="dash-btn dash-btn--primary dash-btn--sm teacher-attention-list__assign"
        @click.stop="$emit('assign-revision', student)"
      >
        <i class="bi bi-journal-plus" aria-hidden="true"></i>
        {{ t('teacher.assign_revision') }}
      </button>
    </li>
  </ul>
  <TeacherEmpty v-else icon="bi bi-check2-circle" :message="t('teacher.need_look_empty')" />
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { attentionReasonTags, studentInitial } from '../../scripts/teacher/formatters'
import TeacherEmpty from './TeacherEmpty.vue'

export default {
  name: 'TeacherAttentionList',
  components: { TeacherEmpty },
  mixins: [i18nMixin],
  props: {
    rows: { type: Array, default: () => [] },
  },
  emits: ['open-student', 'assign-revision'],
  methods: {
    initial: studentInitial,
    tags(student) {
      return attentionReasonTags(student, this.t)
    },
  },
}
</script>
