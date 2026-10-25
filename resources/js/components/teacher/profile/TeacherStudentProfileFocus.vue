<template>
  <TeacherSectionPane tone="neutral">
    <div class="teacher-section-explainer teacher-section-explainer--warn">
      <i class="bi bi-bullseye" aria-hidden="true"></i>
      <div>
        <strong>{{ t('teacher.focus_explainer_title') }}</strong>
        <p>{{ t('teacher.focus_explainer_body') }}</p>
      </div>
    </div>

    <div class="teacher-focus-grid">
      <section class="teacher-focus-group" :aria-labelledby="`${sectionId}-fix`">
        <h4 :id="`${sectionId}-fix`" class="teacher-section-label">
          <i class="bi bi-tools" aria-hidden="true"></i>
          <span><strong>{{ t('teacher.focus_ayahs') }}</strong><small>{{ t('teacher.focus_ayahs_help') }}</small></span>
        </h4>
        <TeacherRecordList v-if="weakRows.length" :rows="weakRows" @action="$emit('assign-revision', $event)" />
        <TeacherEmpty v-else inline icon="bi bi-check2-circle" :message="t('teacher.focus_ayahs_empty')" />
      </section>

      <section class="teacher-focus-group" :aria-labelledby="`${sectionId}-reviews`">
        <h4 :id="`${sectionId}-reviews`" class="teacher-section-label">
          <i class="bi bi-calendar-event" aria-hidden="true"></i>
          <span><strong>{{ t('teacher.focus_reviews') }}</strong><small>{{ t('teacher.focus_reviews_help') }}</small></span>
        </h4>
        <TeacherRecordList v-if="planRows.length" :rows="planRows" />
        <div v-else class="teacher-focus-empty">
          <TeacherEmpty illustrated :message="t('teacher.focus_reviews_empty')" />
          <button type="button" class="btn btn-outline-secondary btn-sm" @click="$emit('assign-revision', profile.student)">
            <i class="bi bi-calendar-plus" aria-hidden="true"></i>
            {{ t('teacher.assign_revision') }}
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
  emits: ['assign-revision'],
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
        hint: group.findings.join(' · '),
        href: group.first?.evidence_url || '',
        badge: this.t(Number(group.first?.affected_attempt_count || 0) === 1 ? 'teacher.check_count_one' : 'teacher.check_count_many', { n: Number(group.first?.affected_attempt_count || 0) }),
        badgeTone: 'warn',
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
          arabicName: this.arabicNames[plan.surah_number] || '',
          arabicText: this.arabicAyahs[`${plan.surah_number}:${plan.ayah_start}`] || '',
          hint: plan.overdue ? this.t('teacher.plan_overdue_hint') : this.t('teacher.plan_due_hint'),
          badge: plan.overdue
            ? this.t('teacher.overdue')
            : (plan.recommended_review_at ? this.formatWhen(plan.recommended_review_at) : this.t('teacher.unavailable')),
          badgeTone: plan.overdue ? 'danger' : 'muted',
          href: plan.evidence_url || '',
          overdue: Boolean(plan.overdue),
          reviewAt: plan.recommended_review_at || '',
        }))
        .sort((a, b) => Number(b.overdue) - Number(a.overdue) || String(a.reviewAt).localeCompare(String(b.reviewAt)))
    },
  },
  methods: {
    async loadArabic() {
      const names = await teacherArabicSurahNames()
      this.arabicNames = names
      const findings = groupAyahFindings(this.profile.payload.items, this.t).map((group) => group.first)
      const verses = [...findings, ...(this.profile.payload.plans || []).map((plan) => ({ surah_number: plan.surah_number, ayah_number: plan.ayah_start }))]
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
