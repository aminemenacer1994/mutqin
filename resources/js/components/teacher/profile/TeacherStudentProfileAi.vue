<template>
  <div class="teacher-recite">
    <TeacherTabGuide kind="section" :title="t('teacher.review_history')" />
    <div v-if="summaryRows.length" class="teacher-review-facts">
      <span v-for="row in summaryRows" :key="row.key" class="badge rounded-pill teacher-pill" :class="row.tone">
        {{ [row.label, row.value].filter(Boolean).join(' ') }}<template v-if="row.detail"> · {{ row.detail }}</template>
      </span>
    </div>

    <template v-if="attemptGroups.length">
      <div class="teacher-review-filter">
        <p>{{ t('teacher.review_filter_label') }}</p>
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
  methods: {
    scoreTone(value) {
      const score = Number(value)
      if (!Number.isFinite(score)) return 'is-quiet'
      if (score >= 80) return 'is-score'
      if (score >= 50) return 'is-partial'
      return 'is-flagged'
    },
  },
  computed: {
    averageLabel() {
      return typeof this.profile.payload?.success_rate === 'number'
        ? this.t('teacher.score_n', { n: this.profile.payload.success_rate })
        : this.t('teacher.no_scored_checks')
    },
    latestAttempt() {
      const attempts = this.profile.payload?.attempts || []
      return attempts[0] || null
    },
    latestLabel() {
      const attempt = this.latestAttempt
      if (!attempt || typeof attempt.accuracy_percent !== 'number') return ''
      return this.t('teacher.score_n', { n: attempt.accuracy_percent })
    },
    latestWhen() {
      return this.latestAttempt ? this.formatWhen(this.latestAttempt.created_at) : ''
    },
    summaryRows() {
      const rows = []
      const count = Number(this.profile.payload?.score_count || 0)
      if (this.attemptGroups.length || typeof this.profile.payload?.success_rate === 'number') {
        rows.push({
          key: 'avg',
          label: this.t('teacher.ai_check_average'),
          value: this.averageLabel,
          tone: this.scoreTone(this.profile.payload?.success_rate),
        })
        rows.push({
          key: 'checks',
          label: '',
          value: this.t(count === 1 ? 'teacher.check_count_one' : 'teacher.check_count_many', { n: count }),
          tone: '',
        })
      }
      if (this.latestLabel) {
        rows.push({
          key: 'latest',
          label: this.t('teacher.latest_result'),
          value: this.latestLabel,
          detail: this.latestWhen,
          tone: this.scoreTone(this.latestAttempt?.accuracy_percent),
        })
      }
      return rows
    },
    visibleAttempts() {
      const groups = this.passageFilter
        ? this.attemptGroups.filter((group) => group.key === this.passageFilter)
        : this.attemptGroups
      return groups.flatMap((group) => group.rows.map((row) => ({
        ...row,
        hint: [group.title, row.hint].filter(Boolean).join(' · '),
      })))
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
