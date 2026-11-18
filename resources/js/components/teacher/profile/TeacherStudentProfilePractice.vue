<template>
  <TeacherSectionPane tone="practice" flat>
    <div class="teacher-learn">
      <header v-if="sectionLead || sectionAction" class="teacher-learn__bar">
        <p>{{ sectionLead }}</p>
        <button v-if="sectionAction" type="button" class="btn btn-primary btn-sm" @click="$emit('assign-revision', profile.student)">
          <i class="bi bi-plus-lg" aria-hidden="true"></i>
          {{ sectionAction }}
        </button>
      </header>

      <p v-if="focusLoading && activeSubview === 'revision'" class="teacher-loading-inline" role="status">{{ t('teacher.loading') }}</p>

      <template v-if="activeSubview === 'memorisation'">
        <div v-if="sessionGroups.length" class="teacher-learn__split">
          <div class="teacher-learn__passages" role="listbox" :aria-label="t('teacher.learning_memorisation')">
            <button
              v-for="group in sessionGroups"
              :key="group.key"
              type="button"
              role="option"
              :aria-selected="selectedPassage && selectedPassage.key === group.key ? 'true' : 'false'"
              :class="{ 'is-active': selectedPassage && selectedPassage.key === group.key }"
              @click="selectedPassageKey = group.key"
            >
              <strong>{{ group.title }}</strong>
              <span>{{ passageMeta(group) }}</span>
            </button>
          </div>
          <div v-if="selectedPassage" class="teacher-learn__detail">
            <TeacherRecordList layout="cards" :rows="selectedPassage.rows" />
          </div>
        </div>
        <div v-else class="teacher-profile-empty teacher-profile-empty--row">
          <TeacherEmpty icon="bi bi-journal-text" :message="t('teacher.practice_empty')" />
        </div>
      </template>

      <template v-else-if="isReview">
        <section v-if="weakRows.length" class="teacher-review-block" :aria-label="t('teacher.review_requires_attention')">
          <TeacherTabGuide kind="section" :title="t('teacher.recite_practise')" />
          <TeacherRecordList v-if="weakRows.length" layout="cards" line :rows="weakRows" @action="$emit('assign-revision', $event)" />
        </section>



        <section class="teacher-review-block teacher-review-block--checks" :aria-label="t('teacher.review_listen_title')">
          <TeacherStudentProfileAi
            :profile="reciteProfile"
            :issue-label="issueLabel"
            :format-when="formatWhen"
            :step="planRows.length ? 3 : 2"
            :focus-attempt-id="focusAttemptId"
            @assign-revision="$emit('assign-revision', $event)"
            @clear-focus="$emit('clear-focus')"
            @reviewed="$emit('refresh')"
          />
        </section>

        <section v-if="planRows.length" class="teacher-review-block" :aria-label="t('teacher.focus_reviews')">
          <TeacherTabGuide kind="section" :title="t('teacher.review_revision_followup')" />
          <TeacherRecordList
            layout="cards"
            line
            :rows="planRows"
            @action="$emit('assign-revision', $event)"
            @review="$emit('mark-reviewed', $event)"
          />
        </section>
      </template>

      <TeacherStudentProfilePlan
        v-else-if="activeSubview === 'plan'"
        :student-id="profile.student.id"
        :student-name="profile.student.name"
        :hifz="profile.meta?.hifz || null"
        :profile="profile"
        :format-when="formatWhen"
        @open-task="$emit('open-task', $event)"
        @assign-next="$emit('assign-revision', $event)"
        @updated="$emit('refresh')"
      />
    </div>
  </TeacherSectionPane>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import { learningApi } from '../../../scripts/api/learning'
import { TEACHER_LEARNING_SUBVIEWS } from '../../../scripts/teacher/constants'
import { ayahRangeLabel, groupAyahFindings, practiceMinutes, teacherRecitationEvidenceRow } from '../../../scripts/teacher/formatters'
import { teacherArabicAyah, teacherArabicSurahNames } from '../../../scripts/teacher/quranContent'
import TeacherEmpty from '../TeacherEmpty.vue'
import TeacherRecordList from '../TeacherRecordList.vue'
import TeacherSectionPane from '../TeacherSectionPane.vue'
import TeacherTabGuide from '../TeacherTabGuide.vue'
import TeacherStudentProfileAi from './TeacherStudentProfileAi.vue'
import TeacherStudentProfilePlan from './TeacherStudentProfilePlan.vue'

export default {
  name: 'TeacherStudentProfilePractice',
  components: { TeacherEmpty, TeacherRecordList, TeacherSectionPane, TeacherStudentProfileAi, TeacherStudentProfilePlan, TeacherTabGuide },
  mixins: [i18nMixin],
  props: {
    profile: { type: Object, required: true },
    sessionLabel: { type: Function, required: true },
    issueLabel: { type: Function, default() { return () => '' } },
    formatWhen: { type: Function, required: true },
    focusPayload: { type: Object, default: null },
    initialSubview: { type: String, default: 'memorisation' },
    focusAttemptId: { type: [Number, String], default: null },
  },
  emits: ['assign-revision', 'mark-reviewed', 'open-task', 'clear-focus', 'refresh'],
  data() {
    return {
      subviewOptions: TEACHER_LEARNING_SUBVIEWS,
      activeSubview: TEACHER_LEARNING_SUBVIEWS.some((item) => item.id === this.initialSubview) ? this.initialSubview : 'memorisation',
      selectedPassageKey: '',
      sectionId: `teacher-learning-${Math.random().toString(36).slice(2, 8)}`,
      arabicNames: {},
      arabicAyahs: {},
      focusData: null,
      focusLoading: false,
      focusRequestId: 0,
    }
  },
  mounted() {
    teacherArabicSurahNames().then((names) => { this.arabicNames = names })
    this.ensureFocusData()
  },
  watch: {
    initialSubview(value) {
      if (value && this.subviewOptions.some((item) => item.id === value)) {
        this.activeSubview = value
      }
    },
    focusPayload: {
      immediate: true,
      handler(value) {
        if (value) this.focusData = value
      },
    },
    'profile.student.id': {
      immediate: true,
      handler() {
        if (!this.focusPayload) {
          this.focusData = null
          this.ensureFocusData()
        }
        this.loadRevisionArabic()
      },
    },
    activeSubview(value) {
      if (value === 'revision') this.loadRevisionArabic()
    },
  },
  computed: {
    focusSource() {
      return this.focusPayload || this.focusData
    },
    reciteProfile() {
      const own = this.profile.payload
      if (own && (Array.isArray(own.attempts) || typeof own.success_rate === 'number')) {
        return this.profile
      }
      const payload = this.profile.sectionPayloads?.ai || { attempts: [], difficulties: { counts: {}, items: [] } }
      return { ...this.profile, payload }
    },
    summaryRows() {
      const sessions = this.profile.payload?.sessions || []
      const rows = []
      if (sessions.length) {
        const groups = new Set(sessions.map((session) => this.sessionLabel(session)))
        const minutes = practiceMinutes(sessions.reduce((total, session) => total + Number(session.duration_seconds || 0), 0))
        rows.push(
          { key: 'sessions', label: this.t('teacher.sessions'), value: sessions.length },
          { key: 'minutes', label: this.t('teacher.practice_time'), value: minutes },
          { key: 'passages', label: this.t('teacher.passages'), value: groups.size },
        )
      }
      const weak = (this.focusSource?.items || []).length
      const reviews = (this.focusSource?.plans || []).length
      if (weak) rows.push({ key: 'weak', label: this.t('teacher.focus_ayahs'), value: weak })
      if (reviews) rows.push({ key: 'reviews', label: this.t('teacher.focus_reviews'), value: reviews })
      return rows
    },
    revisionFullyEmpty() {
      return !this.weakRows.length && !this.planRows.length
    },
    sectionCounts() {
      const sessions = (this.profile.payload?.sessions || []).length
      const checks = (this.reciteProfile.payload?.attempts || []).length
      const revision = this.weakRows.length + this.planRows.length
      return {
        memorisation: sessions || null,
        recite: checks || null,
        revision: revision || null,
        plan: null,
      }
    },
    isReview() {
      return this.activeSubview === 'recite' || this.activeSubview === 'revision'
    },
    sectionLead() {
      if (this.isReview || this.activeSubview === 'plan') return ''
      const key = {
        memorisation: 'teacher.learning_memorising_lead',
        plan: 'teacher.learning_plan_lead',
      }[this.activeSubview]
      return key ? this.t(key) : ''
    },
    sectionAction() {
      if (this.activeSubview === 'memorisation') return this.t('teacher.learning_set_passage')
      return ''
    },
    selectedPassage() {
      const groups = this.sessionGroups
      return groups.find((group) => group.key === this.selectedPassageKey) || groups[0] || null
    },
    sessionGroups() {
      const groups = new Map()
      for (const session of this.profile.payload.sessions || []) {
        const title = this.sessionLabel(session)
        if (!groups.has(title)) {
          groups.set(title, { key: title, title, surah: session.surah_number, rows: [], seconds: 0 })
        }
        const group = groups.get(title)
        group.rows.push(this.sessionEvidenceRow(session))
        group.seconds += Number(session.duration_seconds || 0)
      }
      return [...groups.values()]
    },
    weakRows() {
      const items = this.focusSource?.items || []
      return groupAyahFindings(items, this.t).map((group) => ({
        key: `fix-${group.key}`,
        title: group.title,
        pills: [
          { label: this.t(group.maxChecks === 1 ? 'teacher.weak_spot_short_one' : 'teacher.weak_spot_short', { n: group.maxChecks }), tone: 'danger' },
        ],
        actionLabel: this.t('teacher.assign_revision'),
        actionPayload: {
          id: this.profile.student.id,
          weak_example: {
            surah_number: group.first?.surah_number,
            ayah_number: group.first?.ayah_number,
          },
        },
      }))
    },
    planRows() {
      return (this.focusSource?.plans || [])
        .map((plan) => ({
          key: `plan-${plan.id}`,
          icon: 'bi bi-journal-bookmark',
          iconTone: plan.overdue ? 'warn' : 'accent',
          title: ayahRangeLabel(plan.surah_name, plan.ayah_start, plan.ayah_end, this.t),
          hint: plan.recommended_review_at ? this.t('teacher.review_due', { date: this.formatWhen(plan.recommended_review_at) }) : '',
          badge: plan.overdue
            ? this.t('teacher.overdue')
            : this.t('teacher.scheduled'),
          badgeTone: plan.overdue ? 'danger' : 'muted',
          href: plan.evidence_url || '',
          overdue: Boolean(plan.overdue),
          reviewAt: plan.recommended_review_at || '',
          actionLabel: this.t('teacher.assign_revision'),
          actionPayload: {
            id: this.profile.student.id,
            task_kind: 'practice',
            hifz_category: 'manzil',
            weak_example: { surah_number: plan.surah_number, ayah_start: plan.ayah_start, ayah_end: plan.ayah_end },
          },
          reviewActionLabel: this.t('teacher.mark_reviewed'),
          reviewActionPayload: { id: plan.id, studentId: this.profile.student.id },
        }))
        .sort((a, b) => Number(b.overdue) - Number(a.overdue) || String(a.reviewAt).localeCompare(String(b.reviewAt)))
    },
  },
  methods: {
    async ensureFocusData() {
      if (this.focusPayload || this.focusData || !this.profile?.student?.id) return
      const id = ++this.focusRequestId
      this.focusLoading = true
      try {
        const payload = await learningApi.getTeacherStudent(this.profile.student.id, 'focus')
        if (id !== this.focusRequestId) return
        this.focusData = payload.payload || null
      } catch {
        if (id === this.focusRequestId) this.focusData = { items: [], plans: [] }
      } finally {
        if (id === this.focusRequestId) this.focusLoading = false
      }
    },
    sessionEvidenceRow(session) {
      const practicedRange = session.practiced_range || (session.surah_number && (session.ayah_start || session.ayah_number) ? {
        surah: session.surah_number,
        from: session.ayah_start || session.ayah_number,
        to: session.ayah_end || session.ayah_number,
        surah_name: session.surah_name,
      } : null)
      return teacherRecitationEvidenceRow({
        key: session.id,
        studentId: this.profile.student.id,
        icon: 'bi bi-journal-text',
        iconTone: 'accent',
        title: this.sessionTitle(session),
        reviewable: true,
        hint: this.sessionContext(session, session.assigned_range),
        badge: session.status ? this.statusLabel(session.status) : '',
        badgeTone: session.status === 'completed' ? 'good' : 'muted',
        assignedRange: session.evidence?.assigned_range || session.assigned_range || null,
        practicedRange,
      }, session.evidence, practicedRange ? {
        surah: practicedRange.surah,
        from: practicedRange.from,
        to: practicedRange.to,
      } : null)
    },
    subviewIcon(id) {
      return {
        memorisation: 'bi bi-journal-text',
        recite: 'bi bi-mic',
        revision: 'bi bi-arrow-repeat',
        plan: 'bi bi-calendar-week',
      }[id] || 'bi bi-circle'
    },
    passageMeta(group) {
      const count = group.rows.length
      const sessions = `${count} ${count === 1 ? this.t('teacher.session_one') : this.t('teacher.session_many')}`
      const minutes = practiceMinutes(group.seconds)
      return minutes ? `${sessions} · ${minutes} min` : sessions
    },
    sessionTitle(session) {
      return this.formatWhen(session.last_activity_at) || this.t('teacher.practice_session')
    },
    sessionContext(session) {
      if (!session.duration_seconds) return ''
      return this.t('teacher.session_duration_minutes', { n: practiceMinutes(session.duration_seconds) })
    },
    statusLabel(status) {
      if (status === 'completed') return this.t('teacher.status_completed')
      return this.t('teacher.practice_saved_status')
    },
    async loadRevisionArabic() {
      if (!this.focusSource?.items?.length) return
      const names = await teacherArabicSurahNames()
      this.arabicNames = { ...this.arabicNames, ...names }
      const findings = groupAyahFindings(this.focusSource.items, this.t).map((group) => group.first)
      const unique = [...new Set(findings.filter((item) => item?.surah_number && item?.ayah_number).map((item) => `${item.surah_number}:${item.ayah_number}`))]
      const loaded = await Promise.all(unique.map(async (key) => {
        const [surah, ayah] = key.split(':')
        return [key, await teacherArabicAyah(surah, ayah)]
      }))
      this.arabicAyahs = { ...this.arabicAyahs, ...Object.fromEntries(loaded) }
    },
  },
}
</script>
