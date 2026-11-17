<template>
  <div class="teacher-recite">
    <div v-if="attempts.length" class="teacher-recite__bar">
      <div class="teacher-recite__segments" role="group" :aria-label="t('teacher.recite_status_filter')">
        <button v-for="filter in statusFilters" :key="filter.id" type="button" :class="['is-' + filter.id, { 'is-active': statusFilter === filter.id }]" :aria-pressed="statusFilter === filter.id ? 'true' : 'false'" @click="statusFilter = filter.id">
          {{ filter.label }}<span>{{ filter.count }}</span>
        </button>
      </div>
      <label class="teacher-recite__search">
        <span class="visually-hidden">{{ t('teacher.recite_search') }}</span>
        <input v-model="query" type="search" :placeholder="t('teacher.recite_search')">
      </label>
      <label class="teacher-recite__field">
        <span class="visually-hidden">{{ t('teacher.recite_date_filter') }}</span>
        <select v-model="dateFilter">
          <option value="">{{ t('teacher.recite_date_all') }}</option>
          <option v-for="date in dateOptions" :key="date" :value="date">{{ date }}</option>
        </select>
      </label>
      <label v-if="attemptGroups.length > 1" class="teacher-recite__field">
        <span class="visually-hidden">{{ t('teacher.review_filter_label') }}</span>
        <select v-model="passageFilter">
          <option value="">{{ t('teacher.learning_all_passages') }}</option>
          <option v-for="group in attemptGroups" :key="group.key" :value="group.key">{{ group.chip }}</option>
        </select>
      </label>
    </div>

    <section v-if="needsReview.length" class="teacher-recite__section" :aria-label="t('teacher.recite_needs_review')">
      <h2>{{ t('teacher.recite_needs_review') }}</h2>
      <TeacherRecordList layout="cards" :rows="needsReview" mushaf-review-modal @reviewed="markRowReviewed" />
    </section>

    <section v-if="historyRows.length" class="teacher-recite__section" :aria-label="t('teacher.recite_history')">
      <h2>{{ t('teacher.recite_history') }}</h2>
      <TeacherRecordList layout="cards" :rows="historyRows" mushaf-review-modal @reviewed="markRowReviewed" />
    </section>

    <div v-if="!attempts.length" class="teacher-profile-empty teacher-profile-empty--row">
      <TeacherEmpty icon="bi bi-mic" :message="t('teacher.ai_empty')" />
    </div>
    <p v-else-if="!needsReview.length && !historyRows.length" class="teacher-recite__empty">{{ t('teacher.plan_no_matches') }}</p>
    <TeacherRecitationPlaybackReview
      :open="Boolean(activeFocusId)"
      :student-id="profile.student && profile.student.id"
      :attempt-id="activeFocusId"
      :queue="reviewQueue"
      @close="closeFocus"
      @navigate="queuedAttemptId = $event.attemptId"
      @reviewed="onFocusedReviewed"
    />
  </div>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import { ayahRangeLabel, scoreBadgeTone, teacherRecitationEvidenceRow } from '../../../scripts/teacher/formatters'
import TeacherEmpty from '../TeacherEmpty.vue'
import TeacherRecitationPlaybackReview from '../TeacherRecitationPlaybackReview.vue'
import TeacherRecordList from '../TeacherRecordList.vue'

function shortRange(attempt) {
  const name = attempt.range?.surah_name || ''
  const from = attempt.range?.from
  const to = attempt.range?.to
  if (!name) return ''
  if (!from) return name
  if (!to || Number(from) === Number(to)) return `${name} · ${from}`
  return `${name} · ${from}–${to}`
}

export default {
  name: 'TeacherStudentProfileAi',
  components: { TeacherEmpty, TeacherRecitationPlaybackReview, TeacherRecordList },
  mixins: [i18nMixin],
  data() { return { passageFilter: '', statusFilter: 'all', dateFilter: '', query: '', reviewedIds: [], queuedAttemptId: null } },
  props: {
    profile: { type: Object, required: true },
    issueLabel: { type: Function, required: true },
    formatWhen: { type: Function, required: true },
    step: { type: [String, Number], default: 2 },
    focusAttemptId: { type: [Number, String], default: null },
  },
  emits: ['assign-revision', 'clear-focus', 'reviewed'],
  watch: {
    'profile.student.id'() { this.passageFilter = ''; this.statusFilter = 'all'; this.dateFilter = ''; this.query = ''; this.reviewedIds = []; this.queuedAttemptId = null },
    focusAttemptId() { this.queuedAttemptId = null },
  },
  computed: {
    attempts() { return this.profile.payload?.attempts || [] },
    statusFilters() {
      const rows = this.attemptRows
      const countOf = (id) => (id === 'all' ? rows.length : rows.filter((row) => row.reviewState === id).length)
      return [
        { id: 'all', label: this.t('teacher.recite_status_all') },
        { id: 'pending', label: this.t('teacher.recite_status_pending') },
        { id: 'reviewed', label: this.t('teacher.recite_status_reviewed') },
        { id: 'revision', label: this.t('teacher.recite_status_revision') },
      ].map((filter) => ({ ...filter, count: countOf(filter.id) })).filter((filter) => filter.id === 'all' || filter.count > 0)
    },
    attemptRows() {
      return this.attempts.map((attempt) => this.attemptRow(attempt)).sort((a, b) => (Date.parse(b.sortAt) || 0) - (Date.parse(a.sortAt) || 0))
    },
    dateOptions() {
      return [...new Set(this.attemptRows.map((row) => row.dateLabel).filter(Boolean))]
    },
    filteredRows() {
      const query = this.query.trim().toLocaleLowerCase()
      return this.attemptRows.filter((row) => {
        if (this.passageFilter && row.passageKey !== this.passageFilter) return false
        if (this.dateFilter && row.dateLabel !== this.dateFilter) return false
        if (query && !`${row.title} ${row.hint}`.toLocaleLowerCase().includes(query)) return false
        if (this.statusFilter === 'all') return true
        return row.reviewState === this.statusFilter
      })
    },
    needsReview() {
      if (this.statusFilter !== 'all' && this.statusFilter !== 'pending') return []
      return this.filteredRows.filter((row) => row.reviewState === 'pending')
    },
    historyRows() {
      if (this.statusFilter === 'pending') return []
      if (this.statusFilter === 'all') return this.filteredRows.filter((row) => row.reviewState !== 'pending')
      return this.filteredRows
    },
    activeFocusId() {
      return this.queuedAttemptId || this.focusAttemptId
    },
    reviewQueue() {
      return [...this.needsReview, ...this.historyRows]
        .filter((row) => row.attemptId && row.studentId)
        .map((row) => ({ studentId: row.studentId, attemptId: row.attemptId }))
    },
    attemptGroups() {
      const groups = new Map()
      for (const row of this.attemptRows) {
        if (!groups.has(row.passageKey)) groups.set(row.passageKey, { key: row.passageKey, chip: '', rows: [] })
        groups.get(row.passageKey).rows.push(row)
      }
      return [...groups.values()].map((group) => ({
        ...group,
        chip: this.t(group.rows.length === 1 ? 'teacher.recite_attempt_one' : 'teacher.recite_attempts', { range: group.key, n: group.rows.length }),
      }))
    },
  },
  methods: {
    onFocusedReviewed() {
      this.queuedAttemptId = null
      this.$emit('reviewed')
      this.$emit('clear-focus')
    },
    closeFocus() {
      this.queuedAttemptId = null
      this.$emit('clear-focus')
    },
    markRowReviewed(row) {
      if (!row?.attemptId || this.reviewedIds.includes(row.attemptId)) return
      this.reviewedIds.push(row.attemptId)
      this.$emit('reviewed')
    },
    reviewState(attempt) {
      if (this.reviewedIds.includes(attempt.id)) return 'reviewed'
      if (attempt.review?.has_revision) return 'revision'
      if (attempt.review?.status === 'reviewed') return 'reviewed'
      return 'pending'
    },
    attemptRow(attempt) {
      const passage = shortRange(attempt) || ayahRangeLabel(attempt.range?.surah_name, attempt.range?.from, attempt.range?.to, this.t)
      const state = this.reviewState(attempt)
      const issues = attempt.issues
      const issueHint = !issues || !Object.values(issues).some((value) => Number(value) > 0) ? '' : this.issueLabel(issues)
      const score = typeof attempt.accuracy_percent === 'number'
        ? this.t('teacher.playback_wording_score', { n: `${attempt.accuracy_percent}%` })
        : this.t('teacher.recite_not_assessed')
      const when = this.formatWhen(attempt.created_at)
      const scoreTone = { good: 'good', mid: 'warn', warn: 'danger' }[scoreBadgeTone(attempt.accuracy_percent)] || 'neutral'
      const pills = [
        when ? { label: when, tone: 'neutral' } : null,
        { label: score, tone: typeof attempt.accuracy_percent === 'number' ? scoreTone : 'neutral', wording: typeof attempt.accuracy_percent === 'number' },
        issueHint ? { label: issueHint, tone: 'warn' } : null,
      ].filter(Boolean)
      const status = {
        pending: ['teacher.recite_status_pending', 'warn'],
        reviewed: ['teacher.playback_status_reviewed', 'good'],
        revision: ['teacher.recite_revision_requested', 'warn'],
      }[state]
      return teacherRecitationEvidenceRow({
        key: attempt.id,
        sortAt: attempt.created_at,
        attemptId: attempt.id,
        studentId: this.profile.student?.id,
        passageKey: passage,
        dateLabel: when,
        reviewState: state,
        icon: 'bi bi-mic',
        iconTone: scoreBadgeTone(attempt.accuracy_percent),
        attention: state === 'pending' || Boolean(issueHint),
        title: passage,
        hint: [when, score, issueHint].filter(Boolean).join(' · '),
        pills,
        badge: this.t(status[0]),
        badgeTone: status[1],
      }, attempt.evidence, attempt.range ? {
        surah: attempt.range.surah_number,
        from: attempt.range.from,
        to: attempt.range.to,
      } : null)
    },
  },
}
</script>
