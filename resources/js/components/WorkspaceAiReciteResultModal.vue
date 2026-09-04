<template>
  <Teleport to="body">
    <transition name="post-session-fade">
      <div
        v-if="open"
        class="post-session-simple post-session-simple--calm-v2 post-session-simple--premium workspace-recite-result"
        data-testid="workspace-recite-result"
      >
        <div class="post-session-simple__backdrop" aria-hidden="true"></div>
        <div
          class="post-session-simple__overlay"
          @mousedown.self.prevent="requestClose"
          @click.self.prevent="requestClose"
        >
          <div
            ref="dialog"
            class="post-session-simple__dialog post-session-simple__dialog--lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="workspaceReciteResultTitle"
            tabindex="-1"
          >
            <header class="post-session-simple__header post-session-simple__header--calm">
              <span class="post-session-simple__check" aria-hidden="true">
                <i class="bi bi-stars"></i>
              </span>
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
                    <span class="post-session-simple__beta-badge" role="note">{{ betaBadgeLabel }}</span>
                  </p>
                  <h3 class="post-session-simple__outcome-title">
                    {{ view.outcomeHeadline }}
                  </h3>
                  <p
                    v-if="view.understandingText"
                    class="post-session-simple__outcome-summary post-session-simple__ai-review-summary"
                  >
                    {{ view.understandingText }}
                  </p>
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
                  v-if="view.infoArchitecture?.mainFocus?.explanation || view.focusAyahRows?.length"
                  class="post-session-simple__focus-block post-session-simple__support-block"
                  data-testid="workspace-recite-main-focus"
                >
                  <p class="post-session-simple__section-kicker post-session-simple__section-kicker--sub">
                    {{ view.infoArchitecture.mainFocus.title }}
                  </p>
                  <p
                    v-if="view.infoArchitecture.mainFocus.explanation"
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
                      >
                        <span class="post-session-simple__quran-focus-text" dir="rtl" lang="ar">
                          <span
                            v-for="(part, idx) in row.parts"
                            :key="`workspace-focus-${row.ayah}-${idx}`"
                            class="post-session-simple__quran-token"
                            :class="{
                              'is-weak': part.weak && part.tone !== 'omitted' && part.tone !== 'partial',
                              'is-incorrect': part.tone === 'incorrect',
                              'is-partial': part.tone === 'partial',
                              'is-omitted': part.tone === 'omitted',
                              'is-corrected': part.tone === 'ok' && !part.weak,
                            }"
                            :data-tone="part.tone || (part.weak ? 'incorrect' : 'ok')"
                          >
                            <span class="post-session-simple__quran-token-text">{{ part.text }}</span>
                          </span>
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
                      v-for="row in view.infoArchitecture.weakAreas.items"
                      :key="`workspace-weak-ayah-${row.ayah}`"
                      class="post-session-simple__weak-spots-item"
                    >
                      <strong class="post-session-simple__weak-spots-ayah">{{ row.ayahLabel }}</strong>
                      <span
                        v-if="row.wordEntries?.length"
                        class="post-session-simple__weak-spots-words"
                        dir="rtl"
                        lang="ar"
                      >
                        <span
                          v-for="(entry, wordIdx) in row.wordEntries"
                          :key="`workspace-weak-word-${row.ayah}-${wordIdx}`"
                          class="post-session-simple__weak-spots-word"
                          :class="{
                            'is-partial': entry.tone === 'partial',
                            'is-omitted': entry.tone === 'omitted',
                            'is-incorrect': entry.tone !== 'partial' && entry.tone !== 'omitted',
                          }"
                        >{{ entry.text }}<template v-if="wordIdx < row.wordEntries.length - 1"> · </template></span>
                      </span>
                      <span
                        v-else-if="row.wordsLabel"
                        class="post-session-simple__weak-spots-words"
                        dir="rtl"
                        lang="ar"
                      >{{ row.wordsLabel }}</span>
                    </li>
                  </ul>
                </section>

                <div
                  v-if="view.showDetailsToggle || view.colourSegments?.length || view.detailsMetrics?.length || view.audioUrl"
                  class="post-session-simple__ai-details post-session-simple__ai-details--open"
                >
                  <p class="post-session-simple__section-kicker post-session-simple__section-kicker--sub">
                    {{ detailsSectionLabel }}
                  </p>
                  <div
                    id="workspaceReciteAiDetailsDisclosure"
                    class="post-session-simple__ai-details-body"
                    role="region"
                    data-testid="workspace-recite-details"
                  >
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
                      <audio
                        ref="player"
                        :src="view.audioUrl"
                        controls
                        preload="metadata"
                        class="post-session-simple__audio-player"
                      ></audio>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <footer v-if="!loading && !error && !empty" class="post-session-simple__footer">
              <div class="post-session-simple__actions post-session-simple__actions--2">
                <button
                  type="button"
                  class="post-session-simple__btn post-session-simple__btn--secondary"
                  :disabled="actionsBusy"
                  @click="requestClose"
                >
                  <span>{{ closeLabel }}</span>
                </button>
                <button
                  type="button"
                  class="post-session-simple__btn post-session-simple__btn--primary"
                  :disabled="actionsBusy"
                  data-testid="workspace-recite-try-again"
                  @click="$emit('try-again')"
                >
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

export default {
  name: 'WorkspaceAiReciteResultModal',
  components: { AppStatus },
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
    detailsSectionLabel: { type: String, default: 'Details' },
    resultStatsAriaLabel: { type: String, default: 'Check results' },
    aiResultsAriaLabel: { type: String, default: 'AI memorisation result' },
    colourMeterAriaLabel: { type: String, default: 'Word colour breakdown' },
    audioTitle: { type: String, default: 'Your recording' },
    errorTitle: { type: String, default: 'Could not load results' },
    errorDesc: { type: String, default: 'Please close and try again.' },
    emptyTitle: { type: String, default: 'No results yet' },
    emptyDesc: { type: String, default: 'Complete a recitation check to see your results here.' },
  },
  emits: ['close', 'try-again'],
  watch: {
    open(value) {
      if (!value) return
      this.$nextTick(() => {
        const dialog = this.$refs.dialog
        if (dialog && typeof dialog.focus === 'function') dialog.focus()
      })
    },
  },
  methods: {
    requestClose() {
      if (this.actionsBusy) return
      this.$emit('close')
    },
  },
}
</script>
