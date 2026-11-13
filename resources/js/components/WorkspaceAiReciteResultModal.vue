<template>
  <Teleport to="body">
    <transition name="post-session-fade">
      <div
        v-if="open"
        class="post-session-simple post-session-simple--calm-v2 post-session-simple--premium workspace-recite-result workspace-recite-result--refresh"
        :data-theme="theme"
        data-testid="workspace-recite-result"
      >
        <div class="post-session-simple__backdrop" aria-hidden="true"></div>
        <div
          class="post-session-simple__overlay"
          @mousedown.self.prevent
          @click.self.prevent
        >
          <div
            ref="dialog"
            class="post-session-simple__dialog post-session-simple__dialog--lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="workspaceReciteResultTitle"
            tabindex="-1"
            @keydown="onDialogKeydown"
          >
            <header class="post-session-simple__header post-session-simple__header--calm post-session-simple__header--compact">
              <div class="post-session-simple__header-copy">
                <h2 id="workspaceReciteResultTitle" class="post-session-simple__title">
                  {{ title }}
                </h2>
                <p v-if="subtitle" class="post-session-simple__subtitle">
                  {{ subtitle }}
                </p>
              </div>
              <button
                type="button"
                class="modal-close-btn post-session-simple__close"
                :aria-label="closeLabel"
                @click="requestClose"
              >
                <i class="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </header>

            <div class="post-session-simple__body">
              <div v-if="loading" class="post-session-simple__skeleton" role="status" aria-live="polite">
                <span></span><span></span><span></span>
              </div>

              <AppStatus
                v-else-if="error"
                variant="error"
                fill
                :title="errorTitle"
                :description="errorDesc"
                :action-label="closeLabel"
                @action="requestClose"
              />

              <AppStatus
                v-else-if="empty"
                variant="empty"
                fill
                icon="bi-stars"
                :title="emptyTitle"
                :description="emptyDesc"
                :action-label="closeLabel"
                @action="requestClose"
              />

              <section
                v-else-if="view?.reviewDetails"
                class="post-session-simple__ai-review post-session-simple__ai-review--guided"
                :class="{
                  'post-session-simple__ai-review--zero-match': view.presentationMode === 'valid_zero_match',
                  'post-session-simple__ai-review--insufficient': view.presentationMode === 'insufficient_audio',
                }"
                :data-presentation="view.presentationMode"
                :data-outcome="view.outcome || 'mixed'"
                :aria-label="aiResultsAriaLabel"
                data-testid="workspace-recite-ai-review"
                data-tour="ai-results"
              >
                <div
                  class="post-session-simple__outcome post-session-simple__outcome--hero"
                  data-testid="workspace-recite-outcome"
                  :data-outcome="view.outcome || 'mixed'"
                  :data-tone="view.outcomeTone"
                >
                  <p class="post-session-simple__section-kicker post-session-simple__section-kicker--step">
                    <span class="post-session-simple__step-num" aria-hidden="true">1</span>
                    {{ yourResultLabel }}
                    <span class="post-session-simple__beta-tag mutqin-label--uncertain" role="note">{{ betaBadgeLabel }}</span>
                  </p>
                  <div class="wrr-hero wrr-hero--editorial" :data-tone="view.outcomeTone || 'mixed'">
                    <p class="wrr-hero__eyebrow">
                      {{ yourResultLabel }}
                      <span class="wrr-hero__beta">{{ betaBadgeLabel }}</span>
                    </p>
                    <div class="wrr-hero__headline-row">
                      <h3 class="post-session-simple__outcome-title">
                        {{ view.outcomeHeadline }}
                      </h3>
                      <p
                        v-if="accuracyPercent != null"
                        class="wrr-hero__metric"
                        :aria-label="matchShortLabel"
                      >
                        {{ accuracyRingLabel }}
                      </p>
                    </div>
                    <p
                      v-if="view.understandingText"
                      class="post-session-simple__outcome-summary post-session-simple__ai-review-summary"
                    >
                      {{ view.understandingText }}
                    </p>
                    <p
                      v-if="disclaimerLabel"
                      class="post-session-simple__ai-disclaimer"
                      role="note"
                      data-testid="workspace-recite-ai-disclaimer"
                    >
                      {{ disclaimerLabel }}
                    </p>
                  </div>
                  <ul
                    v-if="view.outcomeStatChips?.length"
                    class="post-session-simple__outcome-tools"
                    :aria-label="resultStatsAriaLabel"
                  >
                    <li
                      v-for="chip in view.outcomeStatChips"
                      :key="`workspace-outcome-chip-${chip.key}`"
                      class="post-session-simple__outcome-chip"
                      :data-tone="chip.tone || 'soft'"
                      :title="chip.hint || chip.label"
                    >
                      <i v-if="chip.icon" :class="chip.icon" aria-hidden="true"></i>
                      <span class="post-session-simple__outcome-chip-label">{{ chip.label }}</span>
                      <strong class="post-session-simple__outcome-chip-value">{{ chip.value }}</strong>
                    </li>
                  </ul>
                </div>

                <div
                  v-if="view.mutashabihatDrift"
                  class="post-session-simple__support-block mutashabihat-drift-block"
                  data-testid="workspace-recite-mutashabihat-drift"
                >
                  <p class="post-session-simple__section-kicker post-session-simple__section-kicker--sub">
                    {{ mutashabihatTitle }}
                  </p>
                  <p class="post-session-simple__why-block post-session-simple__next-line">
                    {{ mutashabihatLead }}
                  </p>
                  <ul class="post-session-simple__focus-ayah-list">
                    <li class="post-session-simple__focus-ayah-item">
                      <p class="post-session-simple__focus-ayah-label">{{ view.mutashabihatDrift.expectedLabel }}</p>
                    </li>
                    <li class="post-session-simple__focus-ayah-item">
                      <p class="post-session-simple__focus-ayah-label">{{ view.mutashabihatDrift.confusedLabel }}</p>
                    </li>
                  </ul>
                  <div class="post-session-simple__actions post-session-simple__actions--2 mutashabihat-drift-actions">
                    <button
                      type="button"
                      class="post-session-simple__btn post-session-simple__btn--secondary"
                      @click="$emit('mutashabihat-compare')"
                    >
                      {{ compareDifferencesLabel }}
                    </button>
                    <button
                      type="button"
                      class="post-session-simple__btn post-session-simple__btn--primary"
                      @click="$emit('try-again')"
                    >
                      {{ tryAgainLabel }}
                    </button>
                  </div>
                </div>

                <div
                  v-if="showMainFocusBlock"
                  class="post-session-simple__focus-block post-session-simple__support-block"
                  data-testid="workspace-recite-main-focus"
                  data-tour="weak-areas"
                >
                  <p class="post-session-simple__section-kicker post-session-simple__section-kicker--sub">
                    {{ view.infoArchitecture.mainFocus.title }}
                  </p>
                  <p
                    v-if="showMainFocusExplanation"
                    class="post-session-simple__why-block post-session-simple__next-line"
                    data-testid="workspace-recite-why"
                  >{{ view.infoArchitecture.mainFocus.explanation }}</p>
                  <ul
                    v-if="view.focusAyahRows?.length"
                    class="post-session-simple__focus-ayah-list"
                    data-testid="workspace-recite-focus-ayah-list"
                  >
                    <li
                      v-for="row in view.focusAyahRows"
                      :key="`workspace-focus-ayah-${row.ayah || row.ayahLabel}`"
                      class="post-session-simple__focus-ayah-item"
                    >
                      <p v-if="row.ayahLabel" class="post-session-simple__focus-ayah-label">
                        {{ row.ayahLabel }}
                      </p>
                      <div
                        v-if="row.parts?.length"
                        class="post-session-simple__quran-focus post-session-simple__quran-focus--static"
                        dir="rtl"
                        lang="ar"
                      >
                        <span class="post-session-simple__quran-focus-text" dir="rtl" lang="ar">
                          <template
                            v-for="(part, idx) in row.parts"
                            :key="`workspace-focus-${row.ayah}-${idx}`"
                          >
                            <span
                              v-if="part.madaniGlyph && part.fontFamily"
                              class="post-session-simple__quran-token"
                              :class="{
                                'is-weak': part.weak && part.tone !== 'omitted' && part.tone !== 'partial',
                                'is-incorrect': part.tone === 'incorrect',
                                'is-partial': part.tone === 'partial' || part.tone === 'uncertain',
                                'is-omitted': part.tone === 'omitted',
                                'is-corrected': part.tone === 'ok' && !part.weak,
                              }"
                              :data-tone="part.tone || (part.weak ? 'incorrect' : 'ok')"
                            >
                              <span
                                class="post-session-simple__quran-token-text"
                                data-madani-glyph="true"
                                :style="{ '--madani-font': `'${part.fontFamily}'` }"
                              >{{ part.text }}</span>
                            </span>
                          </template>
                        </span>
                      </div>
                    </li>
                  </ul>
                </div>

                <section
                  v-if="view.infoArchitecture?.weakAreas?.items?.length"
                  class="post-session-simple__weak-spots post-session-simple__support-block"
                  data-testid="workspace-recite-weak-spots"
                  :aria-label="view.infoArchitecture.weakAreas.title"
                >
                  <p class="post-session-simple__section-kicker post-session-simple__section-kicker--sub">
                    {{ view.infoArchitecture.weakAreas.title }}
                  </p>
                  <p
                    v-if="view.infoArchitecture.weakAreas.lead"
                    class="post-session-simple__weak-spots-lead"
                  >{{ view.infoArchitecture.weakAreas.lead }}</p>
                  <ul class="post-session-simple__weak-spots-list post-session-simple__weak-spots-list--inline">
                    <li
                      v-for="(row, rowIdx) in view.infoArchitecture.weakAreas.items"
                      :key="`workspace-weak-word-${row.ayah}-${rowIdx}`"
                      class="post-session-simple__weak-spots-item"
                    >
                      <strong class="post-session-simple__weak-spots-ayah">{{ row.ayahLabel }}</strong>
                      <span
                        v-if="row.wordEntries?.length"
                        class="post-session-simple__weak-spots-words"
                        dir="rtl"
                        lang="ar"
                      >
                        <template
                          v-for="(entry, wordIdx) in row.wordEntries"
                          :key="`workspace-weak-word-${row.ayah}-${wordIdx}`"
                        >
                          <span
                            v-if="entry.madaniGlyph && entry.fontFamily"
                            class="post-session-simple__weak-spots-word"
                            :class="{
                              'is-partial': entry.tone === 'partial',
                              'is-omitted': entry.tone === 'omitted',
                              'is-incorrect': entry.tone !== 'partial' && entry.tone !== 'omitted',
                            }"
                          ><span
                            class="post-session-simple__quran-token-text"
                            data-madani-glyph="true"
                            :style="{ '--madani-font': `'${entry.fontFamily}'` }"
                          >{{ entry.text }}</span></span>
                        </template>
                      </span>
                    </li>
                  </ul>
                </section>

                <div
                  v-if="view.showDetailsToggle || view.colourSegments?.length || view.detailsMetrics?.length || view.audioUrl"
                  class="post-session-simple__ai-details"
                >
                  <button
                    type="button"
                    id="workspaceReciteAiDetailsToggle"
                    class="post-session-simple__ai-details-toggle"
                    :aria-expanded="aiDetailsExpanded ? 'true' : 'false'"
                    aria-controls="workspaceReciteAiDetailsDisclosure"
                    @click="aiDetailsExpanded = !aiDetailsExpanded"
                  >
                    <span>{{ aiDetailsExpanded ? hideDetailsLabel : viewDetailsLabel }}</span>
                    <i class="bi bi-chevron-down" aria-hidden="true"></i>
                  </button>
                  <div
                    v-if="aiDetailsExpanded"
                    id="workspaceReciteAiDetailsDisclosure"
                    class="post-session-simple__ai-details-body"
                    role="region"
                    aria-labelledby="workspaceReciteAiDetailsToggle"
                    data-testid="workspace-recite-details"
                  >
                    <p class="post-session-simple__section-kicker post-session-simple__section-kicker--sub">
                      {{ detailsSectionLabel }}
                    </p>
                    <div
                      v-if="view.colourSegments?.length"
                      class="post-session-simple__check-meter"
                      role="img"
                      :aria-label="colourMeterAriaLabel"
                    >
                      <div class="post-session-simple__check-meter-track" aria-hidden="true">
                        <span
                          v-for="segment in view.colourSegments"
                          :key="`workspace-ai-meter-${segment.key}`"
                          class="post-session-simple__check-meter-segment"
                          :class="segment.tone"
                          :style="{ flexGrow: Math.max(segment.percent || segment.count, 1), flexBasis: 0 }"
                        ></span>
                      </div>
                      <ul class="post-session-simple__check-meter-legend">
                        <li
                          v-for="segment in view.colourSegments"
                          :key="`workspace-ai-legend-${segment.key}`"
                          :class="segment.tone"
                        >
                          <span aria-hidden="true"></span>
                          {{ segment.label }}
                        </li>
                      </ul>
                    </div>
                    <ul class="post-session-simple__ai-metrics post-session-simple__ai-metrics--details">
                      <li
                        v-for="metric in view.detailsMetrics"
                        :key="`workspace-detail-${metric.key}`"
                        :data-tone="metric.tone || 'soft'"
                      >
                        <span>{{ metric.label }}</span>
                        <strong>{{ metric.value }}</strong>
                      </li>
                    </ul>
                    <div v-if="view.audioUrl" class="post-session-simple__audio-review">
                      <p class="post-session-simple__section-kicker post-session-simple__section-kicker--sub">
                        {{ audioTitle }}
                      </p>
                      <RecitationAudioPlayer
                        :src="view.audioUrl"
                        :active="open"
                        :title="audioTitle"
                        :play-label="playLabel"
                        :pause-label="pauseLabel"
                        :restart-label="restartLabel"
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <footer v-if="!loading && !error && !empty" class="post-session-simple__footer post-session-simple__footer--compact">
              <div
                class="post-session-simple__actions post-session-simple__actions--2"
                :class="{ 'post-session-simple__actions--single': !showBackToProgress }"
              >
                <a
                  v-if="showBackToProgress"
                  :href="progressHref"
                  class="post-session-simple__btn post-session-simple__btn--ghost"
                  :class="{ 'is-disabled': actionsBusy }"
                  :aria-disabled="actionsBusy ? 'true' : 'false'"
                  data-testid="workspace-recite-back-progress"
                  @click="onBackToProgress"
                >
                  <i class="bi bi-chevron-left" aria-hidden="true"></i>
                  <span>{{ backToProgressLabel }}</span>
                </a>
                <button
                  type="button"
                  class="post-session-simple__btn post-session-simple__btn--primary"
                  :disabled="actionsBusy"
                  data-testid="workspace-recite-try-again"
                  @click="$emit('try-again')"
                >
                  <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
                  <span>{{ tryAgainLabel }}</span>
                </button>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script>
import AppStatus from './AppStatus.vue'
import RecitationAudioPlayer from './RecitationAudioPlayer.vue'
import './WorkspaceAiReciteResultModal.css'
import {
  captureReturnFocus,
  focusInitialElement,
  handleModalKeydown,
  restoreReturnFocus,
} from '../utils/modalFocus'

export default {
  name: 'WorkspaceAiReciteResultModal',
  components: { AppStatus, RecitationAudioPlayer },
  props: {
    open: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    error: { type: Boolean, default: false },
    empty: { type: Boolean, default: false },
    view: { type: Object, default: null },
    actionsBusy: { type: Boolean, default: false },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    closeLabel: { type: String, default: 'Close' },
    tryAgainLabel: { type: String, default: 'Try again' },
    yourResultLabel: { type: String, default: 'Your result' },
    betaBadgeLabel: { type: String, default: 'Audio recitation · Beta' },
    disclaimerLabel: { type: String, default: '' },
    detailsSectionLabel: { type: String, default: 'Details' },
    viewDetailsLabel: { type: String, default: 'View details' },
    hideDetailsLabel: { type: String, default: 'Hide details' },
    matchShortLabel: { type: String, default: 'Match' },
    resultStatsAriaLabel: { type: String, default: 'Check results' },
    aiResultsAriaLabel: { type: String, default: 'AI memorisation result' },
    colourMeterAriaLabel: { type: String, default: 'Word colour breakdown' },
    audioTitle: { type: String, default: 'Your recording' },
    playLabel: { type: String, default: 'Play' },
    pauseLabel: { type: String, default: 'Pause' },
    restartLabel: { type: String, default: 'Restart' },
    errorTitle: { type: String, default: 'Could not load results' },
    errorDesc: { type: String, default: 'Please close and try again.' },
    emptyTitle: { type: String, default: 'No results yet' },
    emptyDesc: { type: String, default: 'Complete a recitation check to see your results here.' },
    attemptSaved: { type: Boolean, default: false },
    saveState: { type: String, default: '' },
    savedLabel: { type: String, default: 'This attempt is saved.' },
    retryingLabel: { type: String, default: "Couldn't save yet. Retrying…" },
    resultsHref: { type: String, default: '' },
    resultsLabel: { type: String, default: 'See all results' },
    theme: { type: String, default: '' },
    mutashabihatTitle: { type: String, default: 'Possible similar ayah confusion' },
    mutashabihatLead: { type: String, default: 'Your recitation may have drifted toward a similar ayah.' },
    compareDifferencesLabel: { type: String, default: 'Compare differences' },
    showBackToProgress: { type: Boolean, default: false },
    backToProgressLabel: { type: String, default: 'Check progress' },
    progressHref: { type: String, default: '/progress' },
  },
  emits: ['close', 'try-again', 'mutashabihat-compare', 'back-to-progress'],
  data() {
    return {
      returnFocusEl: null,
      aiDetailsExpanded: false,
    }
  },
  computed: {
    accuracyPercent() {
      const raw = Number(this.view?.reviewDetails?.accuracy)
      return Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : null
    },
    accuracyRingStyle() {
      if (this.accuracyPercent == null) return {}
      return { '--wrr-ring-p': String(this.accuracyPercent) }
    },
    accuracyRingLabel() {
      if (this.accuracyPercent != null) return `${this.accuracyPercent}%`
      const matchChip = (this.view?.outcomeStatChips || []).find(
        (chip) => chip.key === 'match' || chip.key === 'match_percent',
      )
      return matchChip?.value || '—'
    },
    showMainFocusBlock() {
      if ((this.view?.focusAyahRows || []).length) return true
      const explanation = String(this.view?.infoArchitecture?.mainFocus?.explanation || '').trim()
      if (!explanation) return false
      const summary = String(this.view?.understandingText || '').trim()
      return explanation !== summary
    },
    showMainFocusExplanation() {
      const explanation = String(this.view?.infoArchitecture?.mainFocus?.explanation || '').trim()
      if (!explanation) return false
      const summary = String(this.view?.understandingText || '').trim()
      return explanation !== summary
    },
  },
  watch: {
    open(value) {
      if (!value) {
        restoreReturnFocus(this.returnFocusEl)
        this.returnFocusEl = null
        this.aiDetailsExpanded = false
        return
      }
      this.aiDetailsExpanded = false
      this.returnFocusEl = captureReturnFocus()
      this.$nextTick(() => focusInitialElement(this.$refs.dialog, '#workspaceReciteResultTitle'))
    },
  },
  beforeUnmount() {
    restoreReturnFocus(this.returnFocusEl)
    this.returnFocusEl = null
  },
  methods: {
    onDialogKeydown(event) {
      handleModalKeydown(event, {
        container: this.$refs.dialog,
        open: this.open,
        onEscape: () => this.requestClose(),
      })
    },
    requestClose() {
      if (this.actionsBusy) return
      this.$emit('close')
    },
    onBackToProgress(event) {
      if (this.actionsBusy) {
        event?.preventDefault?.()
        return
      }
      this.$emit('back-to-progress', event)
    },
  },
}
</script>

<style>
.workspace-recite-saved {
  display: none !important;
}
</style>
