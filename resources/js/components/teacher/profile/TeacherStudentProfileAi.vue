<template>
  <div class="teacher-recite">
    <TeacherTabGuide kind="section" :title="t('teacher.review_history')" />
    <template v-if="attemptGroups.length">
      <div v-if="attemptGroups.length > 1" class="teacher-review-filter">
      <div class="teacher-learn__chips" role="group" :aria-label="t('teacher.review_filter_label')">
        <button type="button" :class="{ 'is-active': !passageFilter }" :aria-pressed="!passageFilter ? 'true' : 'false'" @click="passageFilter = ''">
          {{ t('teacher.learning_all_passages') }}
        </button>
        <button
          v-for="group in attemptGroups"
          :key="group.key"
          type="button"
          :class="{ 'is-active': passageFilter === group.key }"
          :aria-pressed="passageFilter === group.key ? 'true' : 'false'"
          @click="passageFilter = group.key"
        >
          {{ group.title }}
          <em>{{ group.rows.length }}</em>
        </button>
      </div>
      </div>
      <TeacherRecordList layout="cards" :rows="visibleAttempts" mushaf-review-modal />
    </template>
    <div v-else class="teacher-profile-empty teacher-profile-empty--row">
      <TeacherEmpty icon="bi bi-mic" :message="t('teacher.ai_empty')" />
    </div>

  </div>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import { ayahRangeLabel, scoreBadgeTone, teacherRecitationEvidenceRow } from '../../../scripts/teacher/formatters'
import TeacherEmpty from '../TeacherEmpty.vue'
import TeacherRecordList from '../TeacherRecordList.vue'
import TeacherTabGuide from '../TeacherTabGuide.vue'

export default {
  name: 'TeacherStudentProfileAi',
  components: { TeacherEmpty, TeacherRecordList, TeacherTabGuide },
  mixins: [i18nMixin],
  data() { return { passageFilter: '' } },
  props: {
    profile: { type: Object, required: true },
    issueLabel: { type: Function, required: true },
    formatWhen: { type: Function, required: true },
    step: { type: [String, Number], default: 2 },
  },
  emits: ['assign-revision'],
  watch: { 'profile.student.id'() { this.passageFilter = '' } },
  computed: {
    visibleAttempts() {
      const groups = this.passageFilter
        ? this.attemptGroups.filter((group) => group.key === this.passageFilter)
        : this.attemptGroups
      return groups.flatMap((group) => group.rows.map((row) => ({
        ...row,
        hint: [group.title, row.hint].filter(Boolean).join(' · '),
      }))).sort((a, b) => (Date.parse(b.sortAt) || 0) - (Date.parse(a.sortAt) || 0))
    },
    attemptGroups() {
      const groups = new Map()
      for (const attempt of this.profile.payload.attempts || []) {
        const name = attempt.range?.surah_name || this.t('teacher.unavailable')
        const from = attempt.range?.from
        const to = attempt.range?.to
        const title = ayahRangeLabel(name, from, to, this.t)
        const issues = attempt.issues
        const issueHint = !issues || !Object.values(issues).some((value) => Number(value) > 0)
          ? ''
          : this.issueLabel(issues)
        const assigned = attempt.evidence?.assigned_range
        const assignedHint = assigned
          ? this.t('teacher.assigned_task_short', {
            range: ayahRangeLabel(assigned.surah_name, assigned.from, assigned.to, this.t),
          })
          : ''
        const hint = [assignedHint, issueHint].filter(Boolean).join(' · ')
        const hasIssues = Boolean(issues && Object.values(issues).some((value) => Number(value) > 0))
        const when = this.formatWhen(attempt.created_at)
        const row = teacherRecitationEvidenceRow({
          key: attempt.id,
          sortAt: attempt.created_at,
          attemptId: attempt.id,
          studentId: this.profile.student?.id,
          icon: 'bi bi-mic',
          iconTone: scoreBadgeTone(attempt.accuracy_percent),
          attention: hasIssues,
          title: when || this.t('teacher.unavailable'),
          hint,
          badge: typeof attempt.accuracy_percent === 'number'
            ? this.t('teacher.score_n', { n: attempt.accuracy_percent })
            : this.t('teacher.unavailable'),
          badgeTone: scoreBadgeTone(attempt.accuracy_percent),
          href: !attempt.evidence?.audio?.available && !attempt.evidence?.transcript && !attempt.evidence?.words?.length && attempt.range?.surah_number && attempt.range?.from
            ? `/memorisation?surah=${attempt.range.surah_number}&from=${attempt.range.from}&to=${attempt.range.to || attempt.range.from}&review=1`
            : '',
        }, attempt.evidence, attempt.range ? {
          surah: attempt.range.surah_number,
          from: attempt.range.from,
          to: attempt.range.to,
        } : null)
        if (!groups.has(title)) groups.set(title, { key: title, title, surah: attempt.range?.surah_number, rows: [] })
        groups.get(title).rows.push(row)
      }
      return [...groups.values()]
    },
  },
}
</script>
