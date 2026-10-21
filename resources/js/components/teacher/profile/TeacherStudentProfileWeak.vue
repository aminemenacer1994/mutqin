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
      return (this.profile.payload.items || []).map((item) => ({
        key: item.id,
        icon: 'bi bi-exclamation-triangle',
        iconTone: 'warn',
        title: `${item.surah_name} ${item.ayah_number}`,
        quran: true,
        hint: this.t('teacher.weak_spot_hint', { n: item.affected_attempt_count }),
        badge: this.t('teacher.times', { n: item.affected_attempt_count }),
        badgeTone: 'warn',
        actionLabel: this.t('teacher.assign_revision'),
        actionPayload: this.assignPayload(item),
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
