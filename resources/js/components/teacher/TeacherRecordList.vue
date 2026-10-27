<template>
  <div>
  <ul class="list-group list-group-flush teacher-records">
    <li v-for="(row, index) in visibleRows" :key="row.key ?? index" class="list-group-item teacher-records__item d-flex align-items-center gap-3" :class="{ 'has-issues': row.attention }">
      <span class="teacher-records__icon" :class="row.iconTone ? `teacher-records__icon--${row.iconTone}` : ''" aria-hidden="true">
        <i :class="row.icon || 'bi bi-dot'"></i>
      </span>
      <div class="teacher-records__copy">
        <a v-if="row.href" class="teacher-records__title teacher-records__link" :class="{ 'teacher-quran': row.quran }" :href="row.href">{{ row.title }}</a>
        <button v-else-if="hasReviewEvidence(row)" type="button" class="teacher-records__title teacher-records__title-button" :class="{ 'teacher-quran': row.quran }" @click="openEvidence(row, preferredEvidenceMode(row))">
          {{ row.title }}
        </button>
        <span v-else class="teacher-records__title" :class="{ 'teacher-quran': row.quran }">{{ row.title }}</span>
        <span v-if="row.hint" class="teacher-records__hint">{{ row.hint }}</span>
        <details v-if="row.arabicText" class="teacher-records__ayah-details">
          <summary>{{ t('teacher.show_ayah_text') }}</summary>
          <span v-if="row.arabicName" class="teacher-records__arabic-name" lang="ar" dir="rtl">{{ row.arabicName }}</span>
          <span class="teacher-records__arabic" lang="ar" dir="rtl">{{ row.arabicText }}</span>
        </details>
      </div>
      <div class="teacher-records__aside">
        <div v-if="showEvidenceActions(row)" class="teacher-records__evidence-actions" :aria-label="t('teacher.recitation_evidence')">
          <button v-if="row.audio?.available" type="button" class="teacher-records__evidence-icon is-audio is-available" :aria-label="`${t('teacher.play_recording')}: ${row.title}`" :title="t('teacher.play_recording')" @click="openEvidence(row, 'audio')">
            <i class="bi bi-play-circle-fill" aria-hidden="true"></i>
          </button>
          <button v-if="row.transcript || hasCanonicalEvidence(row)" type="button" class="teacher-records__evidence-icon is-transcript is-available" :aria-label="`${t('teacher.view_transcript')}: ${row.title}`" :title="t('teacher.view_transcript')" @click="openEvidence(row, 'transcript')">
            <i class="bi bi-file-text" aria-hidden="true"></i>
          </button>
        </div>
        <span
          v-if="row.badge"
          class="teacher-badge"
          :class="row.badgeTone ? `teacher-badge--${row.badgeTone}` : 'teacher-badge--muted'"
        >{{ row.badge }}</span>
        <span v-if="row.source" class="teacher-records__source">{{ row.source }}</span>
        <button
          v-if="row.actionLabel"
          type="button"
          class="btn btn-outline-secondary btn-sm dash-btn dash-btn--ghost dash-btn--sm"
          :aria-label="`${row.actionLabel}: ${row.title}`"
          :title="row.actionLabel"
          @click="$emit('action', row.actionPayload)"
        >
          <i :class="row.actionIcon || 'bi bi-journal-plus'" aria-hidden="true"></i>
          <span class="visually-hidden">{{ row.actionLabel }}</span>
        </button>
        <button v-if="row.reviewActionLabel" type="button" class="btn btn-outline-secondary btn-sm dash-btn dash-btn--ghost dash-btn--sm" :aria-label="`${row.reviewActionLabel}: ${row.title}`" :title="row.reviewActionLabel" @click="$emit('review', row.reviewActionPayload)">
          <i class="bi bi-check2-circle" aria-hidden="true"></i><span class="visually-hidden">{{ row.reviewActionLabel }}</span>
        </button>
      </div>
    </li>
  </ul>
  <TeacherMore :remaining="rows.length - shown" :shown="shown" :initial="5" @more="shown += 5" @less="shown = 5" />
  <TeacherAudioDrawer :open="Boolean(activeEvidence)" :row="activeEvidence" :mode="evidenceMode" @close="activeEvidence = null" />
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import TeacherAudioDrawer from './TeacherAudioDrawer.vue'
import TeacherMore from './TeacherMore.vue'
export default {
  name: 'TeacherRecordList',
  components: { TeacherAudioDrawer, TeacherMore },
  mixins: [i18nMixin],
  props: {
    rows: { type: Array, default: () => [] },
  },
  emits: ['action', 'review'],
  data() {
    return { shown: 5, activeEvidence: null, evidenceMode: 'audio' }
  },
  computed: {
    visibleRows() {
      return this.rows.slice(0, this.shown)
    },
  },
  methods: {
    openEvidence(row, mode) {
      this.activeEvidence = row
      this.evidenceMode = mode
    },
    hasCanonicalEvidence(row) {
      return Boolean(row?.range?.surah && row?.range?.from && (row?.words?.length || row?.transcript))
    },
    hasReviewEvidence(row) {
      return Boolean(row?.reviewable || row?.audio?.available || row?.transcript || this.hasCanonicalEvidence(row))
    },
    preferredEvidenceMode(row) {
      return row?.audio?.available ? 'audio' : 'transcript'
    },
    showEvidenceActions(row) {
      return Boolean(row?.audio?.available || row?.transcript || this.hasCanonicalEvidence(row))
    },
  },
}
</script>
