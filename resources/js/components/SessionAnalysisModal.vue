<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop fade show sa-session-overview-backdrop"></div>
    <div
      v-if="open"
      id="sa-session-overview"
      class="modal fade show d-block session-analysis-modal-root"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      @mousedown.self.prevent
      @click.self.prevent
      @keydown="onOverlayKeydown"
    >
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
        <div
          ref="dialog"
          class="modal-content"
          tabindex="-1"
        >
          <div class="modal-header border-0 sa-ui-header">
            <div class="sa-ui-header__copy">
              <h2 :id="titleId" class="modal-title">{{ title }}</h2>
              <div class="sa-ov__session">
                <span v-if="resolvedSessionLabel" class="sa-ov__chip">{{ resolvedSessionLabel }}</span>
                <span v-if="resolvedSessionMeta" class="sa-ov__when">{{ resolvedSessionMeta }}</span>
              </div>
            </div>
            <div class="d-flex align-items-center gap-2">
              <slot name="header-actions" />
              <button
                type="button"
                class="btn-close"
                :aria-label="closeLabel"
                @click="$emit('close')"
              ></button>
            </div>
          </div>
          <div class="modal-body sa-ui-body">
            <div v-if="loading" class="d-flex align-items-center justify-content-center gap-2 py-5 text-muted" role="status">
              <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
              <span>{{ loadingLabel }}</span>
            </div>
            <AppStatus
              v-else-if="error"
              variant="error"
              fill
              :title="errorTitle"
              :description="errorDesc"
              :action-label="errorActionLabel"
              @action="$emit(errorAction === 'retry' ? 'retry' : 'close')"
            />
            <AppStatus
              v-else-if="empty || (analysis && !analysis.hasContent)"
              variant="empty"
              fill
              icon="bi-graph-up"
              :title="emptyTitle"
              :description="emptyDesc"
              :action-label="closeLabel"
              @action="$emit('close')"
            />
            <template v-else>
              <slot>
                <div v-if="analysis" class="sa-ov">
                  <section v-if="analysis.aiReview" class="sa-ov__hero" :class="`is-${aiLeadTone}`">
                    <div class="sa-ov__hero-main">
                      <div
                        v-if="aiLeadPercent != null"
                        class="sa-ov__ring"
                        role="img"
                        :aria-label="aiLeadStat ? `${aiLeadStat.label} ${aiLeadStat.value}` : ''"
                      >
                        <svg viewBox="0 0 36 36" aria-hidden="true">
                          <circle class="sa-ov__ring-track" cx="18" cy="18" r="15.5" pathLength="100" />
                          <circle
                            class="sa-ov__ring-fill"
                            cx="18"
                            cy="18"
                            r="15.5"
                            pathLength="100"
                            :stroke-dasharray="`${aiLeadPercent} 100`"
                          />
                        </svg>
                        <strong>{{ Math.round(aiLeadPercent) }}</strong>
                      </div>
                      <div class="sa-ov__hero-copy">
                        <p v-if="aiLeadStat" class="sa-ov__hero-label">{{ aiLeadStat.label }}</p>
                        <p v-if="analysis.aiReview.outcomeLabel" class="sa-ov__hero-status">{{ analysis.aiReview.outcomeLabel }}</p>
                      </div>
                    </div>
                    <ul v-if="aiFactStats.length" class="sa-ov__facts">
                      <li v-for="stat in aiFactStats" :key="stat.key">
                        <span>{{ stat.label }}</span>
                        <strong>{{ stat.value }}</strong>
                      </li>
                    </ul>
                  </section>

                  <p v-if="overviewCards.length" class="sa-ov__meta">
                    <span v-for="item in overviewCards" :key="item.key">{{ item.label }} {{ item.value }}</span>
                  </p>

                  <section v-if="analysis.ayahRows?.length" class="sa-ov__panel">
                    <h3>{{ wordsTitle }}</h3>
                    <article
                      v-for="row in analysis.ayahRows"
                      :key="`ayah-${row.ayah || row.ayahLabel}`"
                      class="sa-ov__ayah"
                    >
                      <p class="sa-ov__ayah-ar" lang="ar" dir="rtl">
                        <template v-for="(part, index) in row.parts" :key="`${row.ayah}-${index}`">
                          <span class="sa-ov__word" :class="part.tone">{{ part.text }}</span>
                          <span v-if="index < row.parts.length - 1"> </span>
                        </template>
                        <span v-if="ayahIndex(row)" class="sa-ov__ayah-no">{{ ayahIndex(row) }}</span>
                      </p>
                    </article>
                  </section>

                  <section v-if="analysis.recommendations?.length" class="sa-ov__panel">
                    <h3>{{ recommendationsTitle }}</h3>
                    <div v-for="item in analysis.recommendations" :key="item.key" class="sa-ov__note">
                      <strong>{{ item.label }}</strong>
                      <span v-if="item.detail">{{ item.detail }}</span>
                    </div>
                  </section>

                  <section v-if="analysis.retention?.length" class="sa-ov__panel sa-ov__panel--soft">
                    <h3>{{ retentionTitle }}</h3>
                    <div v-for="item in analysis.retention" :key="item.id || item.label" class="sa-ov__note">
                      <strong>{{ item.label }}</strong>
                      <span v-if="item.detail">{{ item.detail }}</span>
                    </div>
                  </section>

                  <section v-if="analysis.audio?.url" class="sa-ov__panel">
                    <h3>{{ audioTitle }}</h3>
                    <audio class="w-100" controls :src="analysis.audio.url"></audio>
                  </section>
                </div>
              </slot>
            </template>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import AppStatus from './AppStatus.vue'
import './SessionAnalysisOverview.css'

export default {
  name: 'SessionAnalysisModal',
  components: { AppStatus },
  props: {
    open: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    error: { type: Boolean, default: false },
    empty: { type: Boolean, default: false },
    analysis: { type: Object, default: null },
    title: { type: String, default: '' },
    sessionLabel: { type: String, default: '' },
    sessionMeta: { type: String, default: '' },
    closeLabel: { type: String, default: 'Close' },
    loadingLabel: { type: String, default: '' },
    errorTitle: { type: String, default: '' },
    errorDesc: { type: String, default: '' },
    errorActionLabel: { type: String, default: '' },
    errorAction: { type: String, default: 'close' },
    emptyTitle: { type: String, default: '' },
    emptyDesc: { type: String, default: '' },
    aiResultsTitle: { type: String, default: '' },
    aiResultsSubtitle: { type: String, default: '' },
    wordsTitle: { type: String, default: '' },
    recommendationsTitle: { type: String, default: '' },
    retentionTitle: { type: String, default: '' },
    audioTitle: { type: String, default: '' },
    noRecommendations: { type: String, default: '' },
    noRetention: { type: String, default: '' },
    audioUnavailable: { type: String, default: '' },
  },
  emits: ['close', 'retry'],
  data() {
    return {
      titleId: 'sessionAnalysisTitle',
    }
  },
  computed: {
    resolvedSessionLabel() {
      return this.sessionLabel || this.analysis?.sessionLabel || ''
    },
    resolvedSessionMeta() {
      return this.sessionMeta || this.analysis?.sessionMeta || ''
    },
    overviewCards() {
      const cards = Array.isArray(this.analysis?.summaryCards) ? this.analysis.summaryCards : []
      if (!this.analysis?.aiReview) return cards
      return cards.filter((card) => card.key === 'time' || card.key === 'repeats')
    },
    aiStatChips() {
      const review = this.analysis?.aiReview
      if (!review) return []
      if (Array.isArray(review.detailsMetrics) && review.detailsMetrics.length) {
        return review.detailsMetrics.slice(0, 4).map((item, index) => ({
          key: item.key || `metric-${index}`,
          label: item.label,
          value: item.value,
          description: item.hint || item.description || '',
          tone: item.tone || 'tone-neutral',
        }))
      }
      if (Array.isArray(review.chips)) {
        return review.chips.slice(0, 4).map((item, index) => ({
          key: item.key || `chip-${index}`,
          label: item.label,
          value: item.value,
          description: item.description || '',
          tone: item.tone || 'tone-neutral',
        }))
      }
      return []
    },
    aiLeadStat() {
      return this.aiStatChips[0] || null
    },
    aiFactStats() {
      return this.aiStatChips.slice(1)
    },
    aiLeadPercent() {
      const raw = String(this.aiLeadStat?.value || '')
      const match = raw.match(/(\d+(?:\.\d+)?)/)
      if (!match) return null
      return Math.max(0, Math.min(100, Number(match[1])))
    },
    aiLeadTone() {
      const percent = this.aiLeadPercent
      if (percent == null) return 'neutral'
      if (percent >= 90) return 'strong'
      if (percent >= 70) return 'mixed'
      return 'weak'
    },
  },
  watch: {
    open: {
      immediate: true,
      handler(isOpen) {
        this.syncBodyLock(!!isOpen)
        if (isOpen) {
          this.bindEscape()
          this.$nextTick(() => {
            this.$refs.dialog?.focus?.()
          })
        } else {
          this.unbindEscape()
        }
      },
    },
  },
  beforeUnmount() {
    this.unbindEscape()
    this.syncBodyLock(false)
  },
  methods: {
    ayahIndex(row) {
      if (row?.ayah) return row.ayah
      const match = String(row?.ayahLabel || '').match(/\d+/)
      return match ? match[0] : ''
    },
    onOverlayKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        this.$emit('close')
      }
    },
    onDocumentKeydown(event) {
      if (event.key !== 'Escape' || !this.open) return
      event.preventDefault()
      event.stopPropagation()
      this.$emit('close')
    },
    bindEscape() {
      if (typeof document === 'undefined' || this._escapeBound) return
      document.addEventListener('keydown', this.onDocumentKeydown, true)
      this._escapeBound = true
    },
    unbindEscape() {
      if (typeof document === 'undefined' || !this._escapeBound) return
      document.removeEventListener('keydown', this.onDocumentKeydown, true)
      this._escapeBound = false
    },
    syncBodyLock(open) {
      if (typeof document === 'undefined') return
      document.documentElement.classList.toggle('session-analysis-modal-open', open)
      document.body.classList.toggle('session-analysis-modal-open', open)
    },
  },
}
</script>
