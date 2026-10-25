<template>
  <TeacherSectionPane tone="warn">
    <div class="teacher-section-explainer teacher-section-explainer--warn">
      <i class="bi bi-lightbulb" aria-hidden="true"></i>
      <div>
        <strong>{{ t('teacher.hard_ayahs_explainer_title') }}</strong>
        <p>{{ t('teacher.hard_ayahs_explainer_body') }}</p>
      </div>
    </div>
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
        href: group.first?.evidence_url || '',
        badge: this.t(Number(group.first?.affected_attempt_count || 0) === 1 ? 'teacher.check_count_one' : 'teacher.check_count_many', { n: Number(group.first?.affected_attempt_count || 0) }),
        badgeTone: 'warn',
        source: group.first?.evidence_url ? this.t('teacher.open_evidence') : '',
        audio: group.first?.evidence?.audio || null,
        transcript: group.first?.evidence?.transcript || '',
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
