<template>
  <TeacherSectionPane tone="warn">
    <TeacherRecordList
      v-if="weakRows.length"
      :rows="weakRows"
      @action="$emit('assign-revision', $event)"
    />
    <TeacherEmpty v-else icon="bi bi-emoji-smile" :message="t('teacher.weak_empty')" />
  </TeacherSectionPane>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import { groupAyahFindings } from '../../../scripts/teacher/formatters'
import TeacherEmpty from '../TeacherEmpty.vue'
import TeacherRecordList from '../TeacherRecordList.vue'
import TeacherSectionPane from '../TeacherSectionPane.vue'

export default {
  name: 'TeacherStudentProfileWeak',
  components: { TeacherEmpty, TeacherRecordList, TeacherSectionPane },
  mixins: [i18nMixin],
  props: {
    profile: { type: Object, required: true },
    formatWhen: { type: Function, required: true },
  },
  emits: ['assign-revision'],
  computed: {
    weakRows() {
      return groupAyahFindings(this.profile.payload.items, this.t).map((group) => ({
        key: group.key,
        icon: 'bi bi-exclamation-triangle',
        iconTone: 'warn',
        title: group.title,
        hint: group.findings.join(' · '),
        actionLabel: this.t('teacher.assign_revision'),
        actionPayload: this.assignPayload(group.first),
      }))
    },
  },
  methods: {
    assignPayload(item) {
      return {
        id: this.profile.student.id,
        weak_example: {
          surah_number: item.surah_number,
          ayah_number: item.ayah_number,
        },
      }
    },
  },
}
</script>
