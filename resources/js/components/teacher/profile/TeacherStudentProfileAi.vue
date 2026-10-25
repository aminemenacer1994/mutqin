<template>
  <TeacherSectionPane tone="recite">
    <div class="teacher-section-summary" role="list">
      <div role="listitem">
        <span>{{ t('teacher.ai_check_average') }}</span>
        <strong>{{ averageLabel }}</strong>
        <small>{{ t('teacher.ai_check_average_help') }}</small>
      </div>
      <div role="listitem">
        <span>{{ t('teacher.scored_checks') }}</span>
        <strong>{{ Number(profile.payload?.score_count || 0) }}</strong>
        <small>{{ scoreSummary || t('teacher.no_scored_checks') }}</small>
      </div>
      <div role="listitem">
        <span>{{ t('teacher.latest_check') }}</span>
        <strong>{{ latestCheck }}</strong>
        <small>{{ t('teacher.latest_check_help') }}</small>
      </div>
    </div>
    <div v-if="attemptGroups.length" class="teacher-history-groups">
      <details v-for="(group, index) in attemptGroups" :key="group.key" class="teacher-history-group" :open="index === 0">
        <summary class="teacher-history-group__summary">
          <span class="teacher-history-group__title">{{ group.title }} <small v-if="arabicNames[group.surah]" lang="ar" dir="rtl">{{ arabicNames[group.surah] }}</small></span>
          <span class="teacher-history-group__count">{{ group.rows.length }} {{ group.rows.length === 1 ? t('teacher.check_one') : t('teacher.check_many') }}</span>
          <i class="bi bi-chevron-down" aria-hidden="true"></i>
        </summary>
        <TeacherRecordList :rows="group.rows" />
      </details>
    </div>
    <TeacherEmpty v-else icon="bi bi-mic" :message="t('teacher.ai_empty')" />
  </TeacherSectionPane>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import { ayahRangeLabel, scoreBadgeTone } from '../../../scripts/teacher/formatters'
import { teacherArabicSurahNames } from '../../../scripts/teacher/quranContent'
import TeacherEmpty from '../TeacherEmpty.vue'
import TeacherRecordList from '../TeacherRecordList.vue'
import TeacherSectionPane from '../TeacherSectionPane.vue'

export default {
  name: 'TeacherStudentProfileAi',
  components: { TeacherEmpty, TeacherRecordList, TeacherSectionPane },
  mixins: [i18nMixin],
  data() { return { arabicNames: {} } },
  mounted() { teacherArabicSurahNames().then((names) => { this.arabicNames = names }) },
  props: {
    profile: { type: Object, required: true },
    issueLabel: { type: Function, required: true },
    formatWhen: { type: Function, required: true },
  },
  computed: {
    averageLabel() {
      return typeof this.profile.payload?.success_rate === 'number'
        ? this.t('teacher.score_n', { n: this.profile.payload.success_rate })
        : this.t('teacher.no_scored_checks')
    },
    latestCheck() {
      const latest = this.profile.payload?.attempts?.[0]?.created_at
      return latest ? this.formatWhen(latest) : this.t('teacher.no_activity')
    },
    scoreSummary() {
      const count = Number(this.profile.payload?.score_count || 0)
      if (!count) return ''
      const start = this.formatWhen(this.profile.payload?.score_window_start)
      const end = this.formatWhen(this.profile.payload?.score_window_end)
      const window = start && end ? this.t('teacher.profile_recite_score_dates', { start, end }) : ''
      return this.t('teacher.profile_recite_score_window', { count, window })
    },
    attemptGroups() {
      const groups = new Map()
      for (const attempt of this.profile.payload.attempts || []) {
        const name = attempt.range?.surah_name || this.t('teacher.unavailable')
        const from = attempt.range?.from
        const to = attempt.range?.to
        const title = ayahRangeLabel(name, from, to, this.t)
        const issues = attempt.issues
        const issueHint = issues && Object.values(issues).some((value) => Number(value) > 0) ? this.issueLabel(issues) : ''
        const when = this.formatWhen(attempt.created_at)
        const row = {
          key: attempt.id,
          icon: 'bi bi-mic',
          iconTone: scoreBadgeTone(attempt.accuracy_percent),
          title: when || this.t('teacher.unavailable'),
          hint: issueHint,
          badge: typeof attempt.accuracy_percent === 'number'
            ? this.t('teacher.score_n', { n: attempt.accuracy_percent })
            : this.t('teacher.unavailable'),
          badgeTone: scoreBadgeTone(attempt.accuracy_percent),
          href: attempt.range?.surah_number && attempt.range?.from
            ? `/memorisation?surah=${attempt.range.surah_number}&from=${attempt.range.from}&to=${attempt.range.to || attempt.range.from}&review=1`
            : '',
          audio: attempt.evidence?.audio || null,
          transcript: attempt.evidence?.transcript || '',
        }
        if (!groups.has(title)) groups.set(title, { key: title, title, surah: attempt.range?.surah_number, rows: [] })
        groups.get(title).rows.push(row)
      }
      return [...groups.values()]
    },
  },
}
</script>
