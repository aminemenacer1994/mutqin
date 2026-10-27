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
            <div class="sa-ui-header__main">
              <div class="sa-ui-header__top">
                <h2 :id="titleId" class="modal-title">{{ title }}</h2>
                <div class="sa-ui-header__actions">
                  <slot name="header-actions" />
                  <button
                    type="button"
                    class="btn-close"
                    :aria-label="closeLabel"
                    @click="$emit('close')"
                  ></button>
                </div>
              </div>
              <div v-if="resolvedSessionLabel || resolvedSessionMeta" class="sa-ov__session">
                <span v-if="resolvedSessionLabel" class="sa-ov__chip">{{ resolvedSessionLabel }}</span>
                <span v-if="resolvedSessionMeta" class="sa-ov__when">{{ resolvedSessionMeta }}</span>
              </div>
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
                  <section v-if="analysis.aiReview && aiLeadPercent != null" class="sa-ov__hero" :class="`is-${aiLeadTone}`">
                    <div class="sa-ov__hero-main">
                      <div
                        class="sa-ov__ring"
                        role="img"
                        :aria-label="aiHeroAriaLabel"
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
                        <strong>{{ Math.round(aiLeadPercent) }}%</strong>
                      </div>
                      <div class="sa-ov__hero-copy">
                        <p class="sa-ov__hero-label">{{ recallScoreLabel }}</p>
                        <p v-if="aiHeroSummary" class="sa-ov__hero-status">{{ aiHeroSummary }}</p>
                        <p v-if="recordingNotice" class="sa-ov__recording-note">{{ recordingNotice }}</p>
                      </div>
                    </div>
                  </section>

                  <p v-else-if="aiHeroSummary" class="sa-ov__meta sa-ov__meta--lead">{{ aiHeroSummary }}</p>
                  <p v-if="!analysis.aiReview && recordingNotice" class="sa-ov__meta sa-ov__recording-note">{{ recordingNotice }}</p>

                  <p v-if="overviewCards.length" class="sa-ov__meta">
                    <span v-for="item in overviewCards" :key="item.key">{{ item.label }} {{ item.value }}</span>
                  </p>

                  <section
                    v-if="showRecordingPanel"
                    class="sa-ov__panel sa-ov__audio"
                    data-testid="session-overview-audio"
                  >
                    <h3>{{ resolvedAudioTitle }}</h3>
                    <RecitationAudioPlayer
                      v-if="analysis.audio?.url"
                      :src="analysis.audio.url"
                      :duration-ms="analysis.audio.duration_ms"
                      :active="open"
                      :title="resolvedAudioTitle"
                      :play-label="playLabel"
                      :pause-label="pauseLabel"
                      :restart-label="restartLabel"
                      :error-label="audioUnavailable || $t('dashboard.analysis_audio_unavailable')"
                    />
                    <p v-else class="sa-ov__audio-empty" data-testid="session-overview-audio-empty">
                      {{ audioEmptyCopy || audioUnavailable || $t('dashboard.analysis_audio_unavailable') }}
                    </p>
                  </section>

                  <section
                    v-if="showRevisionPanel"
                    class="sa-ov__panel sa-ov__revision"
                    :class="revisionPanelTone ? `is-${revisionPanelTone}` : ''"
                  >
                    <h3>{{ resolvedRevisionTitle }}</h3>
                    <p v-if="revisionPanelHint" class="sa-ov__meta">{{ revisionPanelHint }}</p>
                    <ul v-if="revisionTargets.length" class="sa-ov__revision-list">
                      <li v-for="target in revisionTargets" :key="target.key" class="sa-ov__revision-card">
                        <div class="sa-ov__revision-card-copy">
                          <span class="sa-ov__revision-card-label">{{ revisionLinkLabel(target) }}</span>
                          <span v-if="revisionTargetHint(target)" class="sa-ov__revision-card-hint">{{ revisionTargetHint(target) }}</span>
                        </div>
                        <a
                          class="sa-ov__revision-link sa-ov__revision-link--primary"
                          :href="revisionHref(target)"
                        >
                          <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
                          {{ resolvedRevisionActionLabel }}
                        </a>
                      </li>
                    </ul>
                    <p v-else-if="revisionPanelMessage" class="sa-ov__revision-note">{{ revisionPanelMessage }}</p>
                  </section>

                  <section v-if="analysis.ayahRows?.length" class="sa-ov__panel sa-ov__panel--ayahs">
                    <h3>{{ wordsTitle }}</h3>
                    <div
                      class="sa-ov__ayah-scroll"
                      tabindex="0"
                      :aria-label="wordsTitle"
                    >
                    <article
                      v-for="row in analysis.ayahRows"
                      :key="`ayah-${row.ayah || row.ayahLabel}`"
                      class="sa-ov__ayah"
                      :class="{
                        'sa-ov__ayah--needs-correction': row.hasMistake,
                        'sa-ov__ayah--unread': isUnreadAyah(row),
                      }"
                    >
                      <span class="sa-ov__ayah-label">{{ ayahRecitationLabel(row) }}</span>
                      <p
                        v-if="!isUnreadAyah(row)"
                        class="sa-ov__ayah-ar sa-ov__ayah-ar--recitation"
                        lang="ar"
                        dir="rtl"
                      >
                        <template v-for="(part, index) in row.parts || []" :key="`heard-${index}`">
                          <span class="sa-ov__word" :class="part.tone">{{ part.text }}</span>
                          <span v-if="index < (row.parts || []).length - 1" class="sa-ov__word-space" aria-hidden="true">&nbsp;</span>
                        </template>
                        <span v-if="ayahIndex(row)" class="sa-ov__ayah-no">{{ ayahIndex(row) }}</span>
                      </p>
                      <span v-if="row.hasMistake" class="sa-ov__ayah-label sa-ov__ayah-label--correct">{{ resolvedCorrectAyahLabel }}</span>
                      <p v-if="row.hasMistake" class="sa-ov__ayah-ar sa-ov__ayah-ar--correct" lang="ar" dir="rtl">
                        <span class="sa-ov__ayah-text">{{ row.correctText || ayahText(row) }}</span>
                        <span v-if="ayahIndex(row)" class="sa-ov__ayah-no">{{ ayahIndex(row) }}</span>
                      </p>
                    </article>
                    </div>
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
import RecitationAudioPlayer from './RecitationAudioPlayer.vue'
import { recitationAccuracyBand } from '../scripts/engine/recitationThresholds.js'
import {
  captureReturnFocus,
  focusInitialElement,
  handleModalKeydown,
  restoreReturnFocus,
} from '../utils/modalFocus'
import './SessionAnalysisOverview.css'

export default {
  name: 'SessionAnalysisModal',
  components: { AppStatus, RecitationAudioPlayer },
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
    recitationLabel: { type: String, default: '' },
    correctAyahLabel: { type: String, default: '' },
    notRecitedLabel: { type: String, default: '' },
    recommendationsTitle: { type: String, default: '' },
    audioTitle: { type: String, default: '' },
    noRecommendations: { type: String, default: '' },
    audioUnavailable: { type: String, default: '' },
    audioExpired: { type: String, default: '' },
    playLabel: { type: String, default: 'Play' },
    pauseLabel: { type: String, default: 'Pause' },
    restartLabel: { type: String, default: 'Restart' },
    memorisationBasePath: { type: String, default: '/memorisation' },
    revisionTitle: { type: String, default: '' },
    revisionHint: { type: String, default: '' },
    revisionLinkTemplate: { type: String, default: '' },
  },
  emits: ['close', 'retry'],
  data() {
    return {
      titleId: 'sessionAnalysisTitle',
      returnFocusEl: null,
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
      if (this.analysis?.aiReview) return []
      return cards.filter((card) => card.key === 'time' || card.key === 'repeats')
    },
    recallScoreLabel() {
      return this.translate('dashboard.analysis_recall_score', 'Word match')
    },
    aiHeroSummary() {
      const review = this.analysis?.aiReview
      if (!review) return ''
      const summary = String(review.summaryLine || '').trim()
      if (summary) return summary
      return String(review.outcomeLabel || '').trim()
    },
    aiHeroAriaLabel() {
      if (this.aiLeadPercent == null) return ''
      const score = Math.round(this.aiLeadPercent)
      const summary = this.aiHeroSummary
      let matchPct = `${score}% match`
      if (typeof this.$t === 'function') {
        const localized = this.$t('dashboard.drawer_accuracy', { n: score })
        if (localized && localized !== 'dashboard.drawer_accuracy') matchPct = localized
      }
      return summary ? `${this.recallScoreLabel} ${matchPct}. ${summary}` : `${this.recallScoreLabel} ${matchPct}`
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
      const review = this.analysis?.aiReview
      if (!review) return null
      const direct = Number(review.accuracy ?? review.scoredAccuracy)
      if (Number.isFinite(direct) && direct >= 0) {
        return Math.max(0, Math.min(100, direct))
      }
      const raw = String(this.aiLeadStat?.value || '')
      const match = raw.match(/(\d+(?:\.\d+)?)/)
      if (!match) return null
      return Math.max(0, Math.min(100, Number(match[1])))
    },
    aiLeadTone() {
      const percent = this.aiLeadPercent
      if (percent == null) return 'neutral'
      return recitationAccuracyBand(percent)
    },
    resolvedAudioTitle() {
      return this.audioTitle
        || this.translate('dashboard.analysis_audio_title', 'Recording')
    },
    hasWordFeedback() {
      return (this.analysis?.ayahRows || []).length > 0
    },
    showRecordingPanel() {
      return Boolean(this.analysis?.audio?.url)
    },
    recordingNotice() {
      const audio = this.analysis?.audio
      if (!audio || audio.url) return ''
      const reason = String(audio.reason || '')
      if (reason === 'expired' || reason === 'purged') {
        return this.audioExpired
          || this.translate(
            'dashboard.analysis_audio_expired_notice',
            'Recording expired for privacy. Your word match feedback is still saved.',
          )
      }
      if (reason === 'none' && this.hasWordFeedback) {
        return this.translate(
          'dashboard.analysis_audio_not_kept',
          'No recording was kept for this check. Your word match feedback is below.',
        )
      }
      if (reason === 'none') {
        return this.translate(
          'dashboard.analysis_audio_not_kept_short',
          'No recording was kept for this check.',
        )
      }
      return ''
    },
    audioEmptyCopy() {
      return this.recordingNotice
        || this.audioUnavailable
        || this.translate('dashboard.analysis_audio_unavailable', 'No recording is saved for this session.')
    },
    revisionPanel() {
      const revision = this.analysis?.revision
      if (revision && typeof revision === 'object') return revision
      const targets = Array.isArray(this.analysis?.revisionTargets) ? this.analysis.revisionTargets : []
      return {
        targets,
        state: targets.length ? 'targets' : 'unavailable',
        message: '',
        hint: targets.length ? this.resolvedRevisionHint : '',
      }
    },
    revisionTargets() {
      return Array.isArray(this.revisionPanel?.targets) ? this.revisionPanel.targets : []
    },
    showRevisionPanel() {
      if (!this.analysis) return false
      return Boolean(
        this.revisionTargets.length
        || this.revisionPanelMessage
        || this.revisionPanelHint,
      )
    },
    revisionPanelHint() {
      const hint = String(this.revisionPanel?.hint || '').trim()
      if (hint) return hint
      return this.revisionTargets.length ? this.resolvedRevisionHint : ''
    },
    revisionPanelMessage() {
      return String(this.revisionPanel?.message || '').trim()
    },
    revisionPanelTone() {
      const state = String(this.revisionPanel?.state || '')
      if (state === 'holding' || state === 'clear') return 'positive'
      if (state === 'unassessed' || state === 'unavailable') return 'muted'
      return ''
    },
    resolvedRecitationLabel() {
      return this.recitationLabel || this.translate('dashboard.analysis_recitation_label', 'Your recitation')
    },
    resolvedCorrectAyahLabel() {
      return this.correctAyahLabel || this.translate('dashboard.analysis_correct_ayah_label', 'Correct ayah')
    },
    resolvedNotRecitedLabel() {
      return this.notRecitedLabel || this.translate('dashboard.analysis_not_recited_label', 'Not recited')
    },
    resolvedRevisionTitle() {
      return this.revisionTitle || this.translate('dashboard.analysis_revision_title', 'Targeted revision')
    },
    resolvedRevisionHint() {
      return this.revisionHint || this.translate('dashboard.analysis_revision_hint', 'Practise the ayahs that needed care in this check.')
    },
    resolvedRevisionActionLabel() {
      return this.translate('dashboard.review_now', 'Review now')
    },
  },
  watch: {
    open: {
      immediate: true,
      handler(isOpen) {
        this.syncBodyLock(!!isOpen)
        if (isOpen) {
          this.returnFocusEl = captureReturnFocus(this.$refs.dialog)
          this.bindEscape()
          this.$nextTick(() => {
            focusInitialElement(this.$refs.dialog, '.btn-close, [id*="Title"], [id*="title"], h2')
          })
        } else {
          this.unbindEscape()
          const returnFocus = this.returnFocusEl
          this.returnFocusEl = null
          this.$nextTick(() => restoreReturnFocus(returnFocus))
        }
      },
    },
  },
  beforeUnmount() {
    this.unbindEscape()
    this.syncBodyLock(false)
    restoreReturnFocus(this.returnFocusEl)
  },
  methods: {
    translate(key, fallback) {
      if (typeof this.$t === 'function') {
        const value = this.$t(key)
        if (value && value !== key) return value
      }
      return fallback
    },
    isUnreadAyah(row) {
      return row?.notRecited === true || !(row?.parts || []).length
    },
    ayahRecitationLabel(row) {
      return this.isUnreadAyah(row) ? this.resolvedNotRecitedLabel : this.resolvedRecitationLabel
    },
    ayahIndex(row) {
      if (row?.ayah) return row.ayah
      const match = String(row?.ayahLabel || '').match(/\d+/)
      return match ? match[0] : ''
    },
    ayahText(row) {
      if (row?.text) return row.text
      return (Array.isArray(row?.parts) ? row.parts : [])
        .map((part) => part?.text)
        .filter(Boolean)
        .join(' ')
    },
    revisionHref(target) {
      const base = String(this.memorisationBasePath || '/memorisation').split('?')[0]
      const query = target?.query && typeof target.query === 'object' ? target.query : {}
      const params = new URLSearchParams(query)
      const qs = params.toString()
      return qs ? `${base}?${qs}` : base
    },
    revisionLinkLabel(target) {
      const ayahLabel = target?.label || ''
      const template = this.revisionLinkTemplate
        || this.translate('dashboard.analysis_revision_link', 'Revise {ayah}')
      if (template.includes('{ayah}')) return template.replace('{ayah}', ayahLabel)
      return `${template} ${ayahLabel}`.trim()
    },
    revisionTargetHint(target) {
      const surahName = String(this.analysis?.session?.surah_name || '').trim()
      if (!surahName) return ''
      const ayah = Number(target?.ayah_number || 0)
      if (!ayah) return surahName
      const ayahText = this.translate('dashboard.ayah_n', `Ayah ${ayah}`).replace('{n}', String(ayah))
      return `${surahName} · ${ayahText}`
    },
    onOverlayKeydown(event) {
      handleModalKeydown(event, {
        container: this.$refs.dialog,
        onEscape: () => this.$emit('close'),
        open: this.open,
      })
    },
    onDocumentKeydown(event) {
      handleModalKeydown(event, {
        container: this.$refs.dialog,
        onEscape: () => this.$emit('close'),
        open: this.open,
      })
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
