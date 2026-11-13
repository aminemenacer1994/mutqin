<template>
  <li class="dash-ai-results__attempt-block dash-fb-card-block">
    <article
      class="dash-fb-card"
      :class="[`is-${tone}`, { 'is-expanded': expanded }]"
    >
      <div class="dash-fb-card__summary">
        <div class="dash-fb-card__score" :aria-label="percentLabel">
          <span class="dash-fb-card__score-value">{{ scoreShort }}</span>
        </div>

        <div class="dash-fb-card__body">
          <header class="dash-fb-card__head">
            <h3 class="dash-fb-card__title">
              <span>{{ title }}</span>
              <span v-if="rangeLabel" class="dash-fb-card__range">{{ rangeLabel }}</span>
            </h3>
            <p v-if="summary.wordsMatchedLabel" class="dash-fb-card__match">
              {{ summary.wordsMatchedLabel }}
            </p>
          </header>

          <ul
            v-if="showCountRow"
            class="dash-fb-card__counts"
            :aria-label="t('dashboard.ai_recite.word_counts_label')"
          >
            <li v-if="summary.matched != null">
              <span class="dash-fb-card__count-n">{{ summary.matched }}</span>
              {{ t('dashboard.ai_recite.count_matched') }}
            </li>
            <li v-if="summary.uncertain != null" class="is-uncertain">
              <span class="dash-fb-card__count-n">{{ summary.uncertain }}</span>
              {{ t('dashboard.ai_recite.count_uncertain') }}
            </li>
            <li v-if="summary.mismatch != null" class="is-mismatch">
              <span class="dash-fb-card__count-n">{{ summary.mismatch }}</span>
              {{ t('dashboard.ai_recite.count_mismatch') }}
            </li>
          </ul>

          <p class="dash-fb-card__meta">
            <span>{{ summary.reviewHint }}</span>
            <span v-if="checkedLabel" class="dash-fb-card__sep" aria-hidden="true">·</span>
            <time v-if="item.occurred_at" :datetime="item.occurred_at">{{ checkedLabel }}</time>
          </p>

          <p v-if="summary.insight" class="dash-fb-card__insight">{{ summary.insight }}</p>
        </div>

        <div class="dash-fb-card__actions">
          <button
            v-if="item.card_kind === 'attempt'"
            type="button"
            class="dash-btn dash-btn--ghost dash-btn--sm"
            :aria-expanded="expanded ? 'true' : 'false'"
            :aria-controls="detailId"
            @click="$emit('toggle')"
          >
            <span>{{ expanded ? t('dashboard.history_less') : t('dashboard.ai_recite.review_feedback') }}</span>
            <i class="bi" :class="expanded ? 'bi-chevron-up' : 'bi-chevron-down'" aria-hidden="true"></i>
          </button>
          <a
            v-else-if="focusHref"
            class="dash-btn dash-btn--ghost dash-btn--sm"
            :href="focusHref"
          >
            <span>{{ t('dashboard.ai_focus_review') }}</span>
            <i class="bi bi-arrow-right-short" aria-hidden="true"></i>
          </a>
          <a
            v-if="item.card_kind === 'attempt' && checkAgainHref"
            class="dash-btn dash-btn--ghost dash-btn--sm"
            :href="checkAgainHref"
          >
            {{ t('dashboard.revisit_check_again') }}
          </a>
        </div>
      </div>

      <div
        v-if="item.card_kind === 'attempt' && expanded"
        :id="detailId"
        class="dash-attempt-detail dash-fb-detail"
      >
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

          <ul class="dash-fb-ayah-list">
            <li
              v-for="ayah in visibleAyahs"
              :key="`${item.id}-${ayah.number}`"
              class="dash-fb-ayah"
              :class="{ 'is-open': expandedAyah === ayah.number }"
            >
              <button
                type="button"
                class="dash-fb-ayah__toggle"
                :aria-expanded="expandedAyah === ayah.number ? 'true' : 'false'"
                @click="toggleAyah(ayah.number)"
              >
                <span class="dash-fb-ayah__label">
                  <strong>{{ t('dashboard.ayah_n', { n: ayah.number }) }}</strong>
                  <span v-if="ayah.percent != null">{{ t('dashboard.ai_recite.ayah_matched_percent', { n: ayah.percent }) }}</span>
                  <span>{{ ayahAttentionLabel(ayah) }}</span>
                </span>
                <i class="bi" :class="expandedAyah === ayah.number ? 'bi-chevron-up' : 'bi-chevron-down'" aria-hidden="true"></i>
              </button>

              <div v-if="expandedAyah === ayah.number" class="dash-fb-ayah__body">
                <ul class="dash-color-key dash-color-key--compact" :aria-label="t('dashboard.ai_word_meaning')">
                  <li class="is-matched">{{ t('dashboard.word_matched') }}</li>
                  <li class="is-uncertain">{{ t('dashboard.word_uncertain') }}</li>
                  <li class="is-mismatch">{{ t('dashboard.word_mismatch') }}</li>
                </ul>

                <p class="dash-fb-ayah__explain">{{ ayahExplanation(ayah) }}</p>

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
                    <span class="dash-word__text">{{ word.text }}</span>
                    <span class="visually-hidden">{{ t(word.labelKey) }}</span>
                  </span>
                </p>
                <p v-else class="dash-attempt-detail__empty">{{ t('dashboard.reference_unavailable') }}</p>

                <div v-if="ayah.reviewWords.length" class="dash-fb-review-words">
                  <h4>{{ t('dashboard.ai_recite.words_requiring_review') }}</h4>
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

                <div class="dash-fb-ayah__actions">
                  <a
                    class="dash-btn dash-btn--primary dash-btn--sm"
                    :href="reviewAyahHref(ayah)"
                    @click="$emit('stash-review', reviewAyahItem(ayah))"
                  >
                    {{ t('dashboard.ai_recite.review_ayah') }}
                  </a>
                </div>
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

          <div class="dash-attempt-detail__actions">
            <a
              class="dash-btn dash-btn--primary dash-btn--sm"
              :href="reviewHref"
              @click="$emit('stash-review', reviewItem)"
            >
              {{ t('dashboard.revisit_review') }}
            </a>
            <a class="dash-btn dash-btn--ghost dash-btn--sm" :href="checkAgainHref">
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
          </div>
        </template>
      </div>
    </article>
  </li>
</template>

<script>
import { compactAttemptSummary } from '../../scripts/dashboardAiRecite/attemptFeedback.js'

export default {
  name: 'DashAiReciteAttemptCard',
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
    reviewItem: { type: Object, default: null },
    buildReviewHref: { type: Function, default: null },
  },
  emits: ['toggle', 'retry', 'listen', 'stash-review'],
  data() {
    return {
      showAllAyahs: false,
      expandedAyah: null,
    }
  },
  computed: {
    detailId() {
      return `dash-fb-detail-${this.item.id}`
    },
    summary() {
      return compactAttemptSummary(this.item, this.t.bind(this))
    },
    showCountRow() {
      return this.summary.counts?.source === 'word_counts'
        || this.summary.counts?.source === 'color_counts'
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
      if (!value) {
        this.showAllAyahs = false
        this.expandedAyah = null
      }
    },
    detail(value) {
      if (!value) {
        this.expandedAyah = null
        return
      }
      if (this.attentionAyahs.length === 1 && !this.isMobile()) {
        // Keep collapsed on mobile; desktop may auto-open the single attention ayah.
        this.expandedAyah = null
      }
    },
  },
  methods: {
    t(key, params) {
      if (typeof this.$t === 'function') return this.$t(key, params)
      return key
    },
    isMobile() {
      if (typeof window === 'undefined' || !window.matchMedia) return true
      return window.matchMedia('(max-width: 767.98px)').matches
    },
    toggleAyah(number) {
      if (this.expandedAyah === number) {
        this.expandedAyah = null
        return
      }
      // One open at a time on mobile to limit scroll.
      this.expandedAyah = number
    },
    ayahAttentionLabel(ayah) {
      const key = `dashboard.ai_recite.${ayah.attentionKey}`
      const n = ayah.attentionCount || 1
      return this.t(key, { n })
    },
    ayahExplanation(ayah) {
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
    reviewAyahItem(ayah) {
      return {
        ...this.item,
        ayah_number: ayah.number,
        ayah_start: ayah.number,
        ayah_end: ayah.number,
        words: ayah.stored || [],
        attempt_id: this.item.id,
      }
    },
    reviewAyahHref(ayah) {
      if (typeof this.buildReviewHref === 'function') {
        return this.buildReviewHref(this.reviewAyahItem(ayah))
      }
      return this.reviewHref
    },
  },
}
</script>
