<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-overlay mutqin-modal-overlay session-analytics-overlay session-analysis-modal-root"
      @mousedown.self.prevent
      @click.self.prevent
      @keydown="onOverlayKeydown"
    >
      <div class="modal-dialog modal-dialog-centered modal-xl mutqin-modal-dialog mutqin-modal-dialog--wide">
        <div
          ref="dialog"
          class="modal-content mutqin-modal-surface session-analytics-modal"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
        >
          <div class="modal-header session-analytics-header">
            <div class="session-analytics-head-copy">
              <h2 :id="titleId">{{ title }}</h2>
              <p v-if="resolvedSessionLabel">{{ resolvedSessionLabel }}</p>
              <small v-if="resolvedSessionMeta">{{ resolvedSessionMeta }}</small>
            </div>
            <div class="session-analytics-head-actions">
              <slot name="header-actions" />
              <button
                type="button"
                class="modal-close-btn"
                :aria-label="closeLabel"
                @click="$emit('close')"
              >
                <i class="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </div>
          </div>
          <div class="modal-body session-analytics-body">
            <div v-if="loading" class="analytics-loading" role="status">
              <i class="bi bi-hourglass-split" aria-hidden="true"></i>
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
                <template v-if="analysis">
                  <section v-if="analysis.summaryCards?.length" class="session-analytics-section">
                    <div class="session-analytics-summary-grid">
                      <article
                        v-for="item in analysis.summaryCards"
                        :key="item.key"
                        class="session-analytics-summary-card"
                      >
                        <span>{{ item.label }}</span>
                        <strong>{{ item.value }}</strong>
                        <small>{{ item.description }}</small>
                      </article>
                    </div>
                  </section>

                  <section v-if="analysis.aiReview" class="session-analytics-section">
                    <article class="session-analytics-panel analytics-ai-report">
                      <header>
                        <h3>{{ aiResultsTitle }}</h3>
                        <p>{{ aiResultsSubtitle }}</p>
                      </header>
                      <div v-if="aiStatChips.length" class="recitation-result-stats">
                        <article
                          v-for="stat in aiStatChips"
                          :key="stat.key"
                          class="recitation-result-stat"
                          :class="stat.tone"
                        >
                          <span>{{ stat.label }}</span>
                          <strong>{{ stat.value }}</strong>
                          <small>{{ stat.description }}</small>
                        </article>
                      </div>
                      <div v-if="analysis.aiReview.summaryLine || analysis.aiReview.outcomeLabel" class="recitation-next-card">
                        <span>{{ analysis.aiReview.outcomeLabel }}</span>
                        <strong>{{ analysis.aiReview.summaryLine }}</strong>
                      </div>
                    </article>
                  </section>

                  <section v-if="analysis.ayahRows?.length" class="session-analytics-section">
                    <article class="session-analytics-panel">
                      <header>
                        <h3>{{ wordsTitle }}</h3>
                      </header>
                      <ul class="session-analysis-ayah-list">
                        <li
                          v-for="row in analysis.ayahRows"
                          :key="`ayah-${row.ayah || row.ayahLabel}`"
                          class="session-analysis-ayah-item"
                        >
                          <span v-if="row.ayahLabel" class="session-analysis-ayah-label">{{ row.ayahLabel }}</span>
                          <p class="session-analysis-ayah-words" lang="ar" dir="rtl">
                            <span
                              v-for="(part, index) in row.parts"
                              :key="`${row.ayah}-${index}`"
                              class="session-analysis-word"
                              :class="part.tone"
                            >{{ part.text }}</span>
                          </p>
                        </li>
                      </ul>
                    </article>
                  </section>

                  <section v-if="analysis.recommendations?.length" class="session-analytics-section">
                    <article class="session-analytics-panel">
                      <header>
                        <h3>{{ recommendationsTitle }}</h3>
                      </header>
                      <ul class="session-analysis-note-list">
                        <li v-for="item in analysis.recommendations" :key="item.key">
                          <strong>{{ item.label }}</strong>
                          <p v-if="item.detail">{{ item.detail }}</p>
                        </li>
                      </ul>
                    </article>
                  </section>

                  <section v-if="analysis.retention?.length" class="session-analytics-section">
                    <article class="session-analytics-panel">
                      <header>
                        <h3>{{ retentionTitle }}</h3>
                      </header>
                      <ul class="session-analysis-note-list">
                        <li v-for="item in analysis.retention" :key="item.id || item.label">
                          <strong>{{ item.label }}</strong>
                          <p v-if="item.detail">{{ item.detail }}</p>
                        </li>
                      </ul>
                    </article>
                  </section>

                  <section v-if="analysis.audio?.url" class="session-analytics-section">
                    <article class="session-analytics-panel">
                      <header>
                        <h3>{{ audioTitle }}</h3>
                      </header>
                      <audio
                        class="session-analysis-audio"
                        controls
                        :src="analysis.audio.url"
                      ></audio>
                    </article>
                  </section>
                </template>
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

<style>
.session-analysis-modal-root.session-analytics-overlay {
  position: fixed;
  inset: 0;
  z-index: 12000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: color-mix(in srgb, #0a100d 62%, transparent);
  backdrop-filter: blur(6px);
}

[data-theme="light"] .session-analysis-modal-root.session-analytics-overlay,
[data-theme="sepia"] .session-analysis-modal-root.session-analytics-overlay {
  background: color-mix(in srgb, #1a1410 42%, transparent);
}

html.session-analysis-modal-open,
body.session-analysis-modal-open {
  overflow: hidden;
}

.session-analysis-modal-root .session-analytics-modal {
  width: min(1080px, calc(100% - 2rem));
  max-width: 100%;
  max-height: min(88vh, 100dvh - 2rem);
  border-radius: var(--mutqin-modal-radius, 20px);
  overflow: hidden;
  background: var(--mutqin-modal-surface-bg, var(--surface-strong, #f9f5ef));
  color: var(--text, inherit);
}

.session-analysis-modal-root .session-analytics-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.session-analysis-modal-root .session-analytics-head-copy h2 {
  margin: 0;
  font-size: 1.15rem;
}

.session-analysis-modal-root .session-analytics-head-copy p {
  margin: 6px 0 0;
  font-size: 0.9rem;
  color: var(--text, inherit);
}

.session-analysis-modal-root .session-analytics-head-copy small {
  display: block;
  margin-top: 4px;
  color: var(--text-muted, #6f655b);
  font-size: 0.76rem;
}

.session-analysis-modal-root .session-analytics-head-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.session-analysis-modal-root .session-analytics-body {
  max-height: calc(88vh - 92px);
  overflow-y: auto;
  display: grid;
  gap: 16px;
}

.session-analysis-modal-root .session-analytics-section,
.session-analysis-modal-root .session-analytics-panel,
.session-analysis-modal-root .session-analytics-summary-grid {
  display: grid;
  gap: 12px;
}

.session-analysis-modal-root .session-analytics-summary-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.session-analysis-modal-root .session-analytics-summary-card,
.session-analysis-modal-root .session-analytics-panel {
  border: 1px solid var(--border, rgba(80, 64, 48, 0.16));
  border-radius: 14px;
  padding: 14px;
  background: color-mix(in srgb, #fff 64%, transparent);
}

.session-analysis-modal-root .session-analytics-summary-card span,
.session-analysis-modal-root .session-analytics-panel header p,
.session-analysis-modal-root .analytics-empty-panel {
  font-size: 0.76rem;
  color: var(--text-muted, #6f655b);
}

.session-analysis-modal-root .session-analytics-panel header h3 {
  margin: 0;
  font-size: 0.88rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted, #6f655b);
}

.session-analysis-modal-root .recitation-result-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
  gap: 8px;
}

.session-analysis-modal-root .recitation-result-stat,
.session-analysis-modal-root .recitation-next-card {
  border: 1px solid var(--border, rgba(80, 64, 48, 0.16));
  border-radius: 12px;
  padding: 10px 12px;
  display: grid;
  gap: 4px;
}

.session-analysis-ayah-list,
.session-analysis-note-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}

.session-analysis-ayah-words {
  margin: 0.25rem 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.45rem;
  font-family: var(--font-ar, "Amiri", "Noto Naskh Arabic", serif);
  font-size: 1.15rem;
  line-height: 1.8;
}

.session-analysis-word {
  padding: 0.05rem 0.2rem;
  border-radius: 0.35rem;
}

.session-analysis-word.is-correct { color: #2d6a4f; }
.session-analysis-word.is-weak { color: #9a6b14; background: rgba(201, 162, 39, 0.14); }
.session-analysis-word.is-incorrect { color: #9b2c2c; background: rgba(180, 60, 60, 0.12); }
.session-analysis-word.is-omitted { color: #5c534b; text-decoration: underline dotted; }

.session-analysis-audio {
  width: 100%;
}

.session-analysis-modal-root .analytics-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  min-height: 8rem;
  color: var(--text-muted, #6f655b);
}

[data-theme="dark"] .session-analysis-modal-root .session-analytics-modal {
  background: var(--mutqin-modal-surface-bg, #1c1916);
}

[data-theme="dark"] .session-analysis-modal-root .session-analytics-summary-card,
[data-theme="dark"] .session-analysis-modal-root .session-analytics-panel {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 236, 216, 0.12);
}

@media (max-width: 720px) {
  .session-analysis-modal-root .session-analytics-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .session-analysis-modal-root.session-analytics-overlay {
    padding: 0;
    align-items: stretch;
  }

  .session-analysis-modal-root .session-analytics-modal {
    width: 100%;
    max-height: 100dvh;
    border-radius: 0;
  }

  .session-analysis-modal-root .session-analytics-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
