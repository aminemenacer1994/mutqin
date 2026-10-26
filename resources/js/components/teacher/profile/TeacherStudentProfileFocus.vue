<template>
  <TeacherSectionPane tone="neutral">
    <div class="teacher-focus-grid">
      <section class="teacher-focus-group" :aria-labelledby="`${sectionId}-fix`">
        <h4 :id="`${sectionId}-fix`" class="teacher-section-label">
          <i class="bi bi-tools" aria-hidden="true"></i>
          <span><strong>{{ t('teacher.focus_ayahs') }} <em>{{ weakRows.length }}</em></strong><small>{{ t('teacher.focus_ayahs_help') }}</small></span>
        </h4>
        <TeacherRecordList v-if="weakRows.length" :rows="weakRows" @action="$emit('assign-revision', $event)" />
        <TeacherEmpty v-else inline icon="bi bi-check2-circle" :message="t('teacher.focus_ayahs_empty')" />
      </section>

      <section class="teacher-focus-group" :aria-labelledby="`${sectionId}-reviews`">
        <h4 :id="`${sectionId}-reviews`" class="teacher-section-label">
          <i class="bi bi-calendar-event" aria-hidden="true"></i>
          <span><strong>{{ t('teacher.focus_reviews') }} <em>{{ planRows.length }}</em></strong><small>{{ t('teacher.focus_reviews_help') }}</small></span>
        </h4>
        <TeacherRecordList v-if="planRows.length" :rows="planRows" @action="$emit('assign-revision', $event)" @review="$emit('mark-reviewed', $event)" />
        <div v-else class="teacher-focus-empty">
          <TeacherEmpty illustrated :message="t('teacher.focus_reviews_empty')" />
          <button type="button" class="btn btn-outline-secondary btn-sm teacher-focus-empty__action" :aria-label="t('teacher.assign_revision')" :title="t('teacher.assign_revision')" @click="$emit('assign-revision', profile.student)">
            <i class="bi bi-calendar-plus" aria-hidden="true"></i>
          </button>
        </div>
      </section>
    </div>
  </TeacherSectionPane>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import { ayahRangeLabel, groupAyahFindings } from '../../../scripts/teacher/formatters'
import { teacherArabicAyah, teacherArabicSurahNames } from '../../../scripts/teacher/quranContent'
import TeacherEmpty from '../TeacherEmpty.vue'
import TeacherRecordList from '../TeacherRecordList.vue'
import TeacherSectionPane from '../TeacherSectionPane.vue'

export default {
  name: 'TeacherStudentProfileFocus',
  components: { TeacherEmpty, TeacherRecordList, TeacherSectionPane },
  mixins: [i18nMixin],
  props: {
    profile: { type: Object, required: true },
    formatWhen: { type: Function, required: true },
  },
  emits: ['assign-revision', 'mark-reviewed'],
  data() {
    return { sectionId: `teacher-focus-${Math.random().toString(36).slice(2, 8)}`, arabicNames: {}, arabicAyahs: {} }
  },
  watch: {
    profile: { immediate: true, handler() { this.loadArabic() } },
  },
  computed: {
    weakRows() {
      return groupAyahFindings(this.profile.payload.items, this.t).map((group) => ({
        key: `fix-${group.key}`,
        icon: 'bi bi-exclamation-triangle',
        iconTone: 'warn',
        title: group.title,
        arabicName: this.arabicNames[group.first?.surah_number] || '',
        arabicText: this.arabicAyahs[`${group.first?.surah_number}:${group.first?.ayah_number}`] || '',
        hint: group.findings[0] || '',
        badge: this.t('teacher.check_count_many', { n: Math.max(2, group.maxChecks) }),
        badgeTone: 'mid',
        href: group.first?.evidence_url || '',
        audio: group.first?.evidence?.audio || null,
        transcript: group.first?.evidence?.transcript || '',
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
      return (this.profile.payload.plans || [])
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
    async loadArabic() {
      const names = await teacherArabicSurahNames()
      this.arabicNames = names
      const findings = groupAyahFindings(this.profile.payload.items, this.t).map((group) => group.first)
      const verses = findings
      const unique = [...new Set(verses.filter((item) => item?.surah_number && item?.ayah_number).map((item) => `${item.surah_number}:${item.ayah_number}`))]
      const loaded = await Promise.all(unique.map(async (key) => {
        const [surah, ayah] = key.split(':')
        return [key, await teacherArabicAyah(surah, ayah)]
      }))
      this.arabicAyahs = Object.fromEntries(loaded)
    },
  },
}
</script>
