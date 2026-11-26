<template>
  <div class="teacher-profile-sheet" :class="{ 'teacher-profile-sheet--cards': layout === 'cards', 'is-selectable': selectable }">
  <div v-if="layout === 'cards'" class="teacher-record-grid">
    <article
      v-for="(row, index) in visibleRows"
      :key="row.key ?? index"
      class="teacher-record-card"
      :class="{ 'is-line': line, 'is-interactive': playbackReview(row), 'is-selected': isSelected(row) }"
      @click="onCardClick($event, row)"
    >
      <button v-if="hasReviewEvidence(row) && !playbackReview(row)" type="button" class="teacher-record-card__title" @click="openEvidence(row, preferredEvidenceMode(row))">{{ row.title }}</button>
      <strong v-else class="teacher-record-card__title">{{ row.title }}</strong>
      <div v-if="row.pills?.length" class="teacher-record-card__pills">
        <span v-for="(pill, pillIndex) in row.pills" :key="`${row.key}-pill-${pillIndex}`" class="teacher-fact" :class="`teacher-fact--${pill.tone || 'neutral'}`">
          <TeacherWordingMatch v-if="pill.wording">{{ pill.label }}</TeacherWordingMatch>
          <template v-else>{{ pill.label }}</template>
        </span>
      </div>
      <p v-else-if="row.hint" class="teacher-record-card__hint">{{ row.hint }}</p>
      <span
        v-if="row.badge"
        class="teacher-badge"
        :class="row.badgeTone ? `teacher-badge--${row.badgeTone}` : 'teacher-badge--muted'"
      >{{ row.badge }}</span>
      <div v-if="playbackReview(row) || showEvidenceActions(row) || row.actionLabel || row.reviewActionLabel" class="teacher-record-card__controls">
        <div v-if="playbackReview(row) || showEvidenceActions(row)" class="teacher-records__evidence-actions">
          <button v-if="playbackReview(row)" type="button" class="btn btn-primary btn-sm teacher-records__review" @click="openEvidence(row, 'audio')">
            {{ t('teacher.playback_open') }}
          </button>
          <button v-if="!playbackReview(row) && row.audio?.available" type="button" class="teacher-records__evidence-icon is-audio is-available" :aria-label="`${t('teacher.play_recording')}: ${row.title}`" :title="t('teacher.play_recording')" @click="openEvidence(row, 'audio')">
            <i class="bi bi-play-circle-fill" aria-hidden="true"></i>
          </button>
          <button v-if="!playbackReview(row) && (row.transcript || hasCanonicalEvidence(row))" type="button" class="teacher-records__evidence-icon is-transcript is-available" :aria-label="`${t('teacher.view_transcript')}: ${row.title}`" :title="t('teacher.view_transcript')" @click="openTranscriptReview(row)">
            <i class="bi bi-file-text" aria-hidden="true"></i>
          </button>
        </div>
        <div v-if="row.actionLabel || row.reviewActionLabel" class="teacher-record-card__actions">
          <button v-if="row.actionLabel" type="button" class="btn btn-sm" :class="playbackReview(row) ? 'btn-outline-secondary' : 'btn-primary'" @click="$emit('action', row.actionPayload)">{{ row.actionLabel }}</button>
          <button v-if="row.reviewActionLabel" type="button" class="btn btn-sm btn-outline-secondary" @click="$emit('review', row.reviewActionPayload)">{{ row.reviewActionLabel }}</button>
        </div>
      </div>
    </article>
  </div>
  <div v-else class="table-responsive">
  <table class="table align-middle mb-0 teacher-profile-table teacher-profile-table--records">
    <thead>
      <tr>
        <th scope="col">{{ columnHeadings.title }}</th>
        <th scope="col">{{ columnHeadings.detail }}</th>
        <th scope="col">{{ columnHeadings.status }}</th>
        <th scope="col" class="text-end"><span class="visually-hidden">{{ t('teacher.student_actions') }}</span></th>
      </tr>
    </thead>
    <tbody>
      <template v-for="(row, index) in tableRows" :key="row.key ?? index">
        <tr class="teacher-profile-table__row" :class="{ 'has-issues': row.attention, 'is-selected': isSelected(row) }" @click="onRowClick($event, row)">
          <th scope="row" class="teacher-profile-table__item">
            <a v-if="row.href" class="teacher-profile-table__title" :class="{ 'teacher-quran': row.quran }" :href="row.href">
              <i :class="rowIconClass(row)" aria-hidden="true"></i>
              <span>{{ row.title }}</span>
            </a>
            <button v-else-if="hasReviewEvidence(row)" type="button" class="teacher-profile-table__title" :class="{ 'teacher-quran': row.quran }" @click="openEvidence(row, preferredEvidenceMode(row))">
              <i :class="rowIconClass(row)" aria-hidden="true"></i>
              <span>{{ row.title }}</span>
            </button>
            <span v-else class="teacher-profile-table__title" :class="{ 'teacher-quran': row.quran }">
              <i :class="rowIconClass(row)" aria-hidden="true"></i>
              <span>{{ row.title }}</span>
            </span>
          </th>
          <td class="teacher-profile-table__detail">
            <span v-if="row.hint">{{ row.hint }}</span>
            <details v-if="row.arabicText && ayahRange(row)" class="teacher-records__ayah-details" @toggle="loadAyahPreview($event, row)">
              <summary>{{ t('teacher.show_ayah_text') }}</summary>
              <QuranAyahDisplay v-if="ayahPreview(row)" :words="ayahPreview(row).words" :loading="ayahPreview(row).loading" />
            </details>
          </td>
          <td class="teacher-profile-table__status">
            <span
              v-if="row.badge"
              class="teacher-badge"
              :class="row.badgeTone ? `teacher-badge--${row.badgeTone}` : 'teacher-badge--muted'"
            >{{ row.badge }}</span>
            <span v-if="row.source" class="teacher-profile-table__source">{{ row.source }}</span>
          </td>
          <td class="teacher-profile-table__actions text-end">
            <div v-if="playbackReview(row) || showEvidenceActions(row)" class="teacher-records__evidence-actions" :aria-label="t('teacher.recitation_evidence')">
              <button v-if="playbackReview(row)" type="button" class="btn btn-primary btn-sm teacher-records__review" @click="openEvidence(row, 'audio')">
                {{ t('teacher.playback_open') }}
              </button>
              <button v-if="!playbackReview(row) && row.audio?.available" type="button" class="teacher-records__evidence-icon is-audio is-available" :aria-label="`${t('teacher.play_recording')}: ${row.title}`" :title="t('teacher.play_recording')" @click="openEvidence(row, 'audio')">
                <i class="bi bi-play-circle-fill" aria-hidden="true"></i>
              </button>
              <button v-if="!playbackReview(row) && (row.transcript || hasCanonicalEvidence(row))" type="button" class="teacher-records__evidence-icon is-transcript is-available" :aria-label="`${t('teacher.view_transcript')}: ${row.title}`" :title="t('teacher.view_transcript')" @click="openTranscriptReview(row)">
                <i class="bi bi-file-text" aria-hidden="true"></i>
              </button>
            </div>
            <button
              v-if="row.actionLabel"
              type="button"
              class="btn btn-outline-secondary btn-sm"
              :aria-label="`${row.actionLabel}: ${row.title}`"
              :title="row.actionLabel"
              @click="$emit('action', row.actionPayload)"
            >
              <i :class="row.actionIcon || 'bi bi-journal-plus'" aria-hidden="true"></i>
              <span class="visually-hidden">{{ row.actionLabel }}</span>
            </button>
            <button v-if="row.reviewActionLabel" type="button" class="btn btn-outline-secondary btn-sm" :aria-label="`${row.reviewActionLabel}: ${row.title}`" :title="row.reviewActionLabel" @click="$emit('review', row.reviewActionPayload)">
              <i class="bi bi-check2-circle" aria-hidden="true"></i><span class="visually-hidden">{{ row.reviewActionLabel }}</span>
            </button>
          </td>
        </tr>
        <tr v-if="inlineEvidence && showEvidencePanel(row) && !playbackReview(row)" class="teacher-profile-table__evidence">
          <td colspan="4">
            <TeacherRecordEvidenceMushafInline v-if="mushafReviewModal" :row="row" />
            <TeacherRecordEvidenceInline v-else :row="row" />
          </td>
        </tr>
      </template>
    </tbody>
  </table>
  </div>
  <TeacherPagination
    v-if="layout === 'table'"
    :current-page="listPage"
    :page-count="listPageCount"
    :total="rows.length"
    summary-mode="rows"
    @page="listPage = $event"
  />
  <TeacherMore v-else :remaining="rows.length - shown" :shown="shown" :initial="5" @more="shown += 5" @less="shown = 5" />
  <TeacherAudioDrawer :open="Boolean(activeEvidence)" :row="activeEvidence" :mode="evidenceMode" :text-evidence-in-drawer="!mushafReviewModal" @close="activeEvidence = null" />
  <TeacherRecitationPlaybackReview
    :open="Boolean(playbackRow)"
    :student-id="playbackRow?.studentId"
    :attempt-id="playbackRow?.attemptId"
    :focus-ayah="playbackRow?.focusAyah || null"
    :autoplay="playbackAutoplay"
    :queue="playbackQueue"
    @close="playbackRow = null"
    @navigate="onPlaybackNavigate"
    @reviewed="onReviewed"
  />
  <TeacherReciteEvidenceModal
    v-if="mushafReviewModal"
    :open="Boolean(mushafModalRow)"
    :row="mushafModalRow"
    mode="mushaf"
    @close="mushafModalRow = null"
  />
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { recordAyahRange } from '../../scripts/teacher/recordAyahRange.js'
import { loadTeacherMadaniWords } from '../../scripts/teacher/madaniDisplayWords.js'
import QuranAyahDisplay from './QuranAyahDisplay.vue'
import TeacherAudioDrawer from './TeacherAudioDrawer.vue'
import TeacherMore from './TeacherMore.vue'
import TeacherPagination from './TeacherPagination.vue'
import { tablePageCount, tablePageSlice } from '../../scripts/teacher/tablePagination.js'

const RECORD_TABLE_PAGE_SIZE = 10
import TeacherRecordEvidenceInline from './TeacherRecordEvidenceInline.vue'
import TeacherRecordEvidenceMushafInline from './TeacherRecordEvidenceMushafInline.vue'
import TeacherRecitationPlaybackReview from './TeacherRecitationPlaybackReview.vue'
import TeacherReciteEvidenceModal from './TeacherReciteEvidenceModal.vue'
import TeacherWordingMatch from './TeacherWordingMatch.vue'
export default {
  name: 'TeacherRecordList',
  components: { QuranAyahDisplay, TeacherAudioDrawer, TeacherMore, TeacherPagination, TeacherRecordEvidenceInline, TeacherRecordEvidenceMushafInline, TeacherRecitationPlaybackReview, TeacherReciteEvidenceModal, TeacherWordingMatch },
  mixins: [i18nMixin],
  props: {
    rows: { type: Array, default: () => [] },
    layout: { type: String, default: 'table' },
    line: { type: Boolean, default: false },
    inlineEvidence: { type: Boolean, default: true },
    mushafReviewModal: { type: Boolean, default: false },
    headings: { type: Object, default: () => ({}) },
    selectable: { type: Boolean, default: false },
    selectedKey: { type: [String, Number], default: null },
  },
  emits: ['action', 'review', 'select', 'reviewed'],
  data() {
    return {
      shown: 5,
      listPage: 1,
      ayahPreviews: new Map(),
      previewGeneration: 0,
      activeEvidence: null,
      evidenceMode: 'audio',
      mushafModalRow: null,
      playbackRow: null,
      playbackAutoplay: false,
    }
  },
  computed: {
    visibleRows() {
      return this.rows.slice(0, this.shown)
    },
    listPageCount() {
      return tablePageCount(this.rows.length, RECORD_TABLE_PAGE_SIZE)
    },
    tableRows() {
      return tablePageSlice(this.rows, this.listPage, RECORD_TABLE_PAGE_SIZE)
    },
    playbackQueue() {
      return this.rows
        .filter((row) => row?.attemptId && row?.studentId)
        .map((row) => ({ studentId: row.studentId, attemptId: row.attemptId }))
    },
    columnHeadings() {
      return {
        title: this.headings.title || this.t('teacher.profile_col_item'),
        detail: this.headings.detail || this.t('teacher.profile_col_detail'),
        status: this.headings.status || this.t('teacher.col_status'),
      }
    },
  },
  watch: {
    rows() { this.listPage = 1 },
  },
  beforeUnmount() {
    this.previewGeneration += 1
  },
  methods: {
    ayahRange(row) {
      return recordAyahRange(row)
    },
    ayahPreviewKey(row) {
      const range = this.ayahRange(row)
      return range ? `${range.surah}:${range.from}:${range.to}` : ''
    },
    ayahPreview(row) {
      return this.ayahPreviews.get(this.ayahPreviewKey(row)) || null
    },
    async loadAyahPreview(event, row) {
      if (!event.target.open) return
      const range = this.ayahRange(row)
      const key = this.ayahPreviewKey(row)
      if (!range || !key || this.ayahPreviews.has(key)) return
      const generation = this.previewGeneration
      this.ayahPreviews.set(key, { loading: true, words: [] })
      let words = []
      try {
        words = await loadTeacherMadaniWords({ range, words: [] }, { paintStatus: false })
      } catch {
        // The shared display shows its unavailable state; raw Arabic is never a fallback.
      }
      if (generation === this.previewGeneration) this.ayahPreviews.set(key, { loading: false, words })
    },
    isSelected(row) {
      return this.selectedKey != null && String(this.selectedKey) === String(row.key)
    },
    onCardClick(event, row) {
      if (event.target.closest('button, a, summary, input, textarea')) return
      if (this.playbackReview(row)) {
        this.openEvidence(row, 'audio')
        return
      }
      if (this.selectable) this.$emit('select', row)
    },
    onRowClick(event, row) {
      if (!this.selectable) return
      if (event.target.closest('button, a, summary, input, textarea')) return
      this.$emit('select', row)
    },
    rowIconClass(row) {
      return [row.icon || 'bi bi-dot', row.iconTone ? `is-${row.iconTone}` : '']
    },
    playbackReview(row) {
      return Boolean(row?.attemptId && row?.studentId)
    },
    onPlaybackNavigate(item) {
      const row = this.rows.find((entry) => Number(entry.attemptId) === Number(item?.attemptId))
      if (row) this.playbackRow = row
    },
    onReviewed() {
      if (!this.playbackRow) return
      this.playbackRow.badge = this.t('teacher.playback_status_reviewed')
      this.playbackRow.badgeTone = 'good'
      this.playbackRow.reviewState = 'reviewed'
      this.$emit('reviewed', this.playbackRow)
    },
    openEvidence(row, mode) {
      if (this.playbackReview(row)) {
        this.playbackAutoplay = mode === 'audio'
        this.playbackRow = row
        return
      }
      this.activeEvidence = row
      this.evidenceMode = mode
    },
    openTranscriptReview(row) {
      if (this.playbackReview(row)) {
        this.playbackAutoplay = false
        this.playbackRow = row
        return
      }
      if (this.mushafReviewModal) {
        this.mushafModalRow = row
        return
      }
      this.openEvidence(row, 'transcript')
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
    showEvidencePanel(row) {
      return Boolean(row?.range?.surah && row?.range?.from) || this.showEvidenceActions(row)
    },
  },
}
</script>
