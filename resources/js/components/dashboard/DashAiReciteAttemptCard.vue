<template>
  <li class="dash-ai-results__attempt-block dash-fb-card-block">
    <article
      class="dash-fb-card"
      :class="[`is-${tone}`, { 'is-expanded': expanded }]"
    >
      <div class="dash-fb-card__summary">
        <div class="dash-fb-card__score" :aria-label="percentLabel">
          <span class="dash-fb-card__score-value">{{ scoreShort }}</span>
          <span class="dash-fb-card__score-label">{{ t('dashboard.ai_recite.wording_match') }}</span>
        </div>

        <div class="dash-fb-card__body">
          <header class="dash-fb-card__head">
            <h3 class="dash-fb-card__title">
              <span>{{ title }}</span>
              <span v-if="rangeLabel" class="dash-fb-card__range">{{ rangeLabel }}</span>
            </h3>
          </header>

          <p class="dash-fb-card__authority">
            <span class="teacher-pill is-partial">{{ t('dashboard.ai_recite.ai_suggestion_label') }}</span>
            <span class="dash-fb-card__note">{{ t('dashboard.ai_recite.not_tajweed_note') }}</span>
          </p>

          <ul
            v-if="summary.hasDetailedCounts"
            class="dash-fb-card__counts"
            :aria-label="t('dashboard.ai_recite.word_counts_label')"
          >
            <li v-if="summary.matched != null" class="is-matched">
              <span class="dash-fb-card__count-n">{{ summary.matched }}</span>
              {{ t('dashboard.ai_recite.count_matched') }}
            </li>
            <li v-if="summary.uncertain > 0" class="is-uncertain">
              <span class="dash-fb-card__count-n">{{ summary.uncertain }}</span>
              {{ t('dashboard.ai_recite.count_uncertain') }}
            </li>
            <li v-if="summary.mismatch > 0" class="is-mismatch">
              <span class="dash-fb-card__count-n">{{ summary.mismatch }}</span>
              {{ t('dashboard.ai_recite.count_mismatch') }}
            </li>
            <li v-if="summary.skipped != null && summary.skipped > 0" class="is-skipped">
              <span class="dash-fb-card__count-n">{{ summary.skipped }}</span>
              {{ t('dashboard.ai_recite.count_skipped') }}
            </li>
          </ul>
          <p v-else-if="!summary.hasDetailedCounts && item.has_word_alignment === false" class="dash-fb-card__meta">
            {{ t('dashboard.ai_recite.counts_unavailable') }}
          </p>

          <p v-if="qualityNote" class="dash-fb-card__note">{{ qualityNote }}</p>
          <p v-if="practiceReason" class="dash-fb-card__note">{{ practiceReason }}</p>
          <p v-if="contextLine" class="dash-fb-card__meta">{{ contextLine }}</p>

          <aside v-if="teacherReview" class="dash-fb-card__teacher" data-testid="ai-feedback-teacher-review">
            <span class="teacher-pill is-score">{{ t('dashboard.ai_recite.teacher_review_label') }}</span>
            <strong v-if="teacherReview.teacher_name">{{ teacherReview.teacher_name }}</strong>
            <span v-if="teacherReview.tajweed_score != null">{{ t('dashboard.progress_teacher_score', { n: teacherReview.tajweed_score }) }}</span>
            <span v-if="teacherReview.note">{{ teacherReview.note }}</span>
            <button
              v-if="teacherReview.recipient_id"
              type="button"
              class="dash-btn dash-btn--ghost dash-btn--sm"
              @click="$emit('open-assignment', teacherReview.recipient_id)"
            >
              {{ t('dashboard.progress_feedback_open') }}
            </button>
          </aside>

          <p class="dash-fb-card__meta">
            <span v-if="!qualityNote">{{ summary.reviewHint }}</span>
            <span v-if="!qualityNote && checkedLabel" class="dash-fb-card__sep" aria-hidden="true">·</span>
            <time v-if="item.occurred_at" :datetime="item.occurred_at">{{ checkedLabel }}</time>
          </p>

          <div class="dash-fb-card__actions">
          <a
            v-if="item.card_kind === 'attempt' && practiceHref"
            class="dash-btn dash-btn--primary dash-btn--sm"
            data-testid="ai-feedback-practice"
            :href="practiceHref"
          >
            <span>{{ t('dashboard.ai_recite.practice_revise') }}</span>
            <i class="bi bi-arrow-right-short" aria-hidden="true"></i>
          </a>
          <button
            v-if="item.card_kind === 'attempt'"
            type="button"
            class="dash-btn dash-btn--ghost dash-btn--sm dash-fb-card__open"
            :aria-expanded="expanded ? 'true' : 'false'"
            :aria-controls="detailId"
            @click="$emit('toggle')"
          >
            <span>{{ summary.attention > 0
              ? t('dashboard.ai_recite.show_flagged_ayahs')
              : t('dashboard.ai_recite.review_feedback')
            }}</span>
            <i class="bi bi-arrow-right-short" aria-hidden="true"></i>
          </button>
          <a
            v-else-if="focusHref"
            class="dash-btn dash-btn--primary dash-btn--sm"
            :href="focusHref"
          >
            <span>{{ t('dashboard.ai_recite.practice_revise') }}</span>
            <i class="bi bi-arrow-right-short" aria-hidden="true"></i>
          </a>
          </div>
        </div>
      </div>
    </article>

    <DashModalRoot workspace
      :open="item.card_kind === 'attempt' && expanded"
      root-class="teacher-dialog dash-progress-modal"
      panel-class="dash-progress-modal__panel"
      :labelled-by="detailId"
      @close="$emit('toggle')"
    >
      <header class="dash-progress-modal__head">
        <div>
          <p class="dash-progress-modal__eyebrow">{{ percentLabel }}</p>
          <h2 :id="detailId" class="dash-progress-modal__title">{{ title }}</h2>
          <p v-if="rangeLabel || checkedLabel" class="dash-progress-modal__meta">
            <span v-if="rangeLabel">{{ rangeLabel }}</span>
            <span v-if="checkedLabel">{{ checkedLabel }}</span>
          </p>
        </div>
        <button type="button" class="dash-progress-modal__close" :aria-label="t('common.close')" @click="$emit('toggle')">
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      </header>

      <div class="dash-progress-modal__body">
        <p class="dash-fb-card__note">{{ t('dashboard.ai_recite.not_tajweed_note') }}</p>
        <p v-if="qualityNote" class="dash-fb-card__note">{{ qualityNote }}</p>
        <aside v-if="teacherReview" class="dash-fb-card__teacher">
          <span class="teacher-pill is-score">{{ t('dashboard.ai_recite.teacher_review_label') }}</span>
          <span v-if="teacherReview.note">{{ teacherReview.note }}</span>
        </aside>
        <p v-if="loading" role="status">{{ t('dashboard.loading') }}</p>
        <p v-else-if="error">
          {{ t('dashboard.ai_recite.stats_error_title') }}
          <button type="button" class="dash-btn dash-btn--ghost dash-btn--sm" @click="$emit('retry')">
            {{ t('dashboard.retry') }}
          </button>
        </p>
        <template v-else-if="detail">
          <p v-if="!attentionAyahs.length && !showAllAyahs" class="dash-fb-detail__positive">
            {{ t('dashboard.ai_recite.no_attention_ayahs') }}
          </p>

          <ul class="dash-progress-modal__ayahs">
            <li
              v-for="ayah in visibleAyahs"
              :key="`${item.id}-${ayah.number}`"
              class="dash-progress-modal__ayah"
            >
              <header class="dash-progress-modal__ayah-head">
                <strong>{{ t('dashboard.ayah_n', { n: ayah.number }) }}</strong>
                <span v-if="ayah.percent != null">{{ t('dashboard.ai_recite.ayah_matched_percent', { n: ayah.percent }) }}</span>
                <span>{{ ayahAttentionLabel(ayah) }}</span>
              </header>

              <ul class="dash-color-key dash-color-key--compact" :aria-label="t('dashboard.ai_word_meaning')">
                <li class="is-matched">{{ t('dashboard.word_matched') }}</li>
                <li class="is-uncertain">{{ t('dashboard.word_uncertain') }}</li>
                <li class="is-mismatch">{{ t('dashboard.word_mismatch') }}</li>
                <li class="is-skipped">{{ t('dashboard.word_skipped') }}</li>
              </ul>

              <p v-if="ayah.needsAttention" class="dash-fb-ayah__explain">{{ ayahExplanation(ayah) }}</p>

              <p
                v-if="ayah.reference.length"
                class="dash-ayah dash-ayah--feedback"
                lang="ar"
                dir="rtl"
              >
                <span
                  v-for="(word, wordIndex) in ayah.reference"
                  :key="`${ayah.number}-ref-${wordIndex}`"
                  class="dash-word"
                  :class="`is-${word.state}`"
                >
                  <span class="dash-word__text" :style="word.fontFamily ? { fontFamily: word.fontFamily, fontWeight: 400 } : undefined">{{ word.text }}</span>
                  <span class="visually-hidden">{{ t(word.labelKey) }}</span>
                </span>
              </p>
              <p v-else class="dash-attempt-detail__empty">{{ t('dashboard.reference_unavailable') }}</p>

              <div v-if="ayah.reviewWords.length" class="dash-fb-review-words">
                <h3>{{ t('dashboard.ai_recite.words_requiring_review') }}</h3>
                <ul>
                  <li v-for="row in ayah.reviewWords" :key="row.key" class="dash-fb-review-word">
                    <p v-if="row.expected">
                      <span class="dash-fb-review-word__label">{{ t('dashboard.ai_recite.expected_word') }}</span>
                      <span lang="ar" dir="rtl">{{ row.expected }}</span>
                    </p>
                    <p>
                      <span class="dash-fb-review-word__label">{{ t('dashboard.ai_recite.recognised_word') }}</span>
                      <span v-if="row.recognised" lang="ar" dir="rtl">{{ row.recognised }}</span>
                      <span v-else class="dash-fb-review-word__missing">{{ t('dashboard.ai_recite.recognised_unavailable') }}</span>
                    </p>
                    <p>
                      <span class="dash-fb-review-word__label">{{ t('dashboard.ai_recite.result_label') }}</span>
                      <span :class="`is-${row.state}`">{{ t(row.labelKey) }}</span>
                    </p>
                  </li>
                </ul>
              </div>
            </li>
          </ul>

          <button
            v-if="hiddenMatchedCount > 0"
            type="button"
            class="dash-btn dash-btn--ghost dash-btn--sm dash-fb-detail__show-all"
            @click="showAllAyahs = !showAllAyahs"
          >
            {{ showAllAyahs
              ? t('dashboard.ai_recite.hide_matched_ayahs')
              : t('dashboard.ai_recite.show_all_ayahs', { n: detail.ayahs.length })
            }}
          </button>

          <p v-if="!detail.ayahs.length" class="dash-attempt-detail__empty">
            {{ t('dashboard.ai_no_transcript') }}
          </p>
        </template>
      </div>

      <footer v-if="detail && !loading && !error" class="dash-progress-modal__foot">
        <a
          v-if="practiceHref"
          class="dash-btn dash-btn--primary dash-btn--sm"
          :href="practiceHref"
        >
          {{ t('dashboard.ai_recite.practice_revise') }}
        </a>
        <a
          v-if="item.feedback?.valid !== false && item.feedback?.wording?.differences_reliable !== false"
          class="dash-btn dash-btn--primary dash-btn--sm"
          :href="reviewHref"
          @click="$emit('stash-review', reviewItem)"
        >
          {{ t('dashboard.ai_recite.review_passage') }}
        </a>
        <a v-if="checkAgainHref" class="dash-btn dash-btn--ghost dash-btn--sm" :href="checkAgainHref">
          {{ t('dashboard.revisit_check_again') }}
        </a>
        <button
          v-if="item.has_audio"
          type="button"
          class="dash-btn dash-btn--ghost dash-btn--sm"
          @click="$emit('listen')"
        >
          {{ t('dashboard.ai_recite.listen') }}
        </button>
      </footer>
    </DashModalRoot>
  </li>
</template>

<script>
import { compactAttemptSummary } from '../../scripts/dashboardAiRecite/attemptFeedback.js'
import {
  applyFeedbackToSummary,
  feedbackContextKeys,
  feedbackQualityKey,
  practiceReasonKey,
  teacherReviewOf,
} from '../../scripts/dashboardAiRecite/studentFeedback.js'
import DashModalRoot from './DashModalRoot.vue'

export default {
  name: 'DashAiReciteAttemptCard',
  components: { DashModalRoot },
  props: {
    item: { type: Object, required: true },
    expanded: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    error: { type: Boolean, default: false },
    detail: { type: Object, default: null },
    tone: { type: String, default: 'neutral' },
    title: { type: String, default: '' },
    rangeLabel: { type: String, default: '' },
    checkedLabel: { type: String, default: '' },
    scoreShort: { type: String, default: '—' },
    percentLabel: { type: String, default: '' },
    reviewHref: { type: String, default: '' },
    checkAgainHref: { type: String, default: '' },
    focusHref: { type: String, default: '' },
    practiceHref: { type: String, default: '' },
    reviewItem: { type: Object, default: null },
  },
  emits: ['toggle', 'retry', 'listen', 'stash-review', 'open-assignment'],
  data() {
    return {
      showAllAyahs: false,
    }
  },
  computed: {
    detailId() {
      return `dash-fb-detail-${this.item.id}`
    },
    summary() {
      return applyFeedbackToSummary(
        compactAttemptSummary(this.item, this.t.bind(this)),
        this.item?.feedback,
      )
    },
    teacherReview() {
      return teacherReviewOf(this.item?.feedback)
    },
    qualityNote() {
      const key = feedbackQualityKey(this.item?.feedback)
      return key ? this.t(key) : ''
    },
    practiceReason() {
      const key = practiceReasonKey(this.item?.feedback)
      return key ? this.t(key) : ''
    },
    contextLine() {
      return feedbackContextKeys(this.item?.feedback).map((key) => this.t(key)).filter(Boolean).join(' · ')
    },
    attentionAyahs() {
      return (this.detail?.ayahs || []).filter((ayah) => ayah.needsAttention)
    },
    matchedAyahs() {
      return (this.detail?.ayahs || []).filter((ayah) => !ayah.needsAttention)
    },
    visibleAyahs() {
      if (this.showAllAyahs) return this.detail?.ayahs || []
      if (this.attentionAyahs.length) return this.attentionAyahs
      return []
    },
    hiddenMatchedCount() {
      return this.matchedAyahs.length
    },
  },
  watch: {
    expanded(value) {
      if (!value) this.showAllAyahs = false
    },
  },
  methods: {
    t(key, params) {
      if (typeof this.$t === 'function') return this.$t(key, params)
      return key
    },
    ayahAttentionLabel(ayah) {
      if (!ayah.needsAttention && ayah.counts?.evaluated === 0) {
        return this.t('dashboard.word_unassessed')
      }
      const key = `dashboard.ai_recite.${ayah.attentionKey}`
      const n = ayah.attentionCount || 1
      return this.t(key, { n })
    },
    ayahExplanation(ayah) {
      if (this.item?.feedback?.wording?.differences_reliable === false) {
        return this.qualityNote || this.t('dashboard.ai_recite.quality_low')
      }
      if (!ayah.needsAttention) {
        return this.t('dashboard.ai_recite.ayah_explain_matched')
      }
      if (ayah.counts?.uncertain > 0 && !(ayah.counts?.mismatch > 0) && !(ayah.counts?.skipped > 0)) {
        return this.t('dashboard.ai_recite.ayah_explain_uncertain')
      }
      if (ayah.counts?.skipped > 0 && !(ayah.counts?.mismatch > 0)) {
        return this.t('dashboard.ai_recite.ayah_explain_skipped')
      }
      return this.t('dashboard.ai_recite.ayah_explain_attention')
    },
  },
}
</script>
