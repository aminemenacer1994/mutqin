<template>
  <Teleport to="body">
    <transition name="post-session-fade">
      <div
        v-if="open"
        class="post-session-simple post-session-simple--calm-v2 mutashabihat-practice"
        :data-theme="theme"
        data-testid="mutashabihat-practice"
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
            aria-labelledby="mutashabihatPracticeTitle"
            tabindex="-1"
            @keydown="onDialogKeydown"
          >
            <header class="post-session-simple__header post-session-simple__header--calm">
              <div class="post-session-simple__header-copy">
                <h2 id="mutashabihatPracticeTitle" class="post-session-simple__title" tabindex="-1">
                  {{ title }}
                </h2>
                <ol v-if="step?.kind !== 'result'" class="mutashabihat-practice__steps" aria-label="Practice steps">
                  <li
                    v-for="item in stepItems"
                    :key="item.id"
                    class="mutashabihat-practice__step"
                    :class="{
                      'is-current': item.id === currentStepId,
                      'is-done': item.done,
                    }"
                    :aria-current="item.id === currentStepId ? 'step' : undefined"
                  >
                    {{ item.label }}
                  </li>
                </ol>
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

            <div class="post-session-simple__body mutashabihat-practice__body">
              <template v-if="step?.kind === 'compare'">
                <p class="mutashabihat-practice__lead">{{ compareLead }}</p>
                <div class="mutashabihat-compare__grid">
                  <article class="mutashabihat-compare__panel">
                    <p class="mutashabihat-practice__ref">{{ anchorRef }}</p>
                    <p
                      class="mutashabihat-practice__arabic"
                      dir="rtl"
                      lang="ar"
                      :style="arabicTextStyle"
                      v-html="step.leftHtml"
                    ></p>
                    <p v-if="step.leftTranslation" class="mutashabihat-compare__translation">
                      {{ step.leftTranslation }}
                    </p>
                  </article>
                  <article class="mutashabihat-compare__panel">
                    <p class="mutashabihat-practice__ref">{{ otherRef }}</p>
                    <p
                      class="mutashabihat-practice__arabic"
                      dir="rtl"
                      lang="ar"
                      :style="arabicTextStyle"
                      v-html="step.rightHtml"
                    ></p>
                    <p v-if="step.rightTranslation" class="mutashabihat-compare__translation">
                      {{ step.rightTranslation }}
                    </p>
                  </article>
                </div>
              </template>

              <template v-else-if="step?.kind === 'recall'">
                <p class="mutashabihat-practice__ref">{{ anchorRef }}</p>
                <p
                  class="mutashabihat-practice__arabic"
                  dir="rtl"
                  lang="ar"
                  :style="arabicTextStyle"
                  v-html="step.blankHtml"
                ></p>
                <p class="mutashabihat-practice__prompt">{{ recallPrompt }}</p>
                <div v-if="revealed" class="mutashabihat-practice__reveal">
                  <p class="mutashabihat-practice__reveal-label">{{ recallAnswerLabel }}</p>
                  <p class="mutashabihat-practice__reveal-phrase" dir="rtl" lang="ar" :style="arabicTextStyle">
                    {{ step.answerPhrase }}
                  </p>
                </div>
              </template>

              <template v-else-if="step?.kind === 'choose'">
                <p class="mutashabihat-practice__ref">{{ anchorRef }}</p>
                <p
                  class="mutashabihat-practice__arabic"
                  dir="rtl"
                  lang="ar"
                  :style="arabicTextStyle"
                  v-html="step.contextHtml"
                ></p>
                <p class="mutashabihat-practice__prompt">{{ identifyPrompt }}</p>
                <ul class="mutashabihat-practice__options">
                  <li v-for="option in step.options" :key="option.id">
                    <button
                      type="button"
                      class="mutashabihat-practice__option"
                      :class="optionClass(option)"
                      :aria-pressed="selectedOption === option.id"
                      :disabled="chooseResolved"
                      dir="rtl"
                      lang="ar"
                      :style="arabicTextStyle"
                      @click="selectOption(option.id)"
                    >
                      <span class="mutashabihat-practice__option-text">{{ option.text }}</span>
                      <span v-if="chooseResolved && option.correct" class="mutashabihat-practice__option-mark">
                        {{ correctAnswerLabel }}
                      </span>
                      <span v-else-if="chooseResolved && selectedOption === option.id && !option.correct" class="mutashabihat-practice__option-mark">
                        {{ yourChoiceLabel }}
                      </span>
                    </button>
                  </li>
                </ul>
                <p
                  v-if="chooseFeedback"
                  class="mutashabihat-practice__feedback"
                  :data-tone="chooseCorrect ? 'ok' : 'review'"
                  role="status"
                >
                  {{ chooseFeedback }}
                </p>
                <p
                  v-if="chooseResolved && !chooseCorrect && step.leftPhrase"
                  class="mutashabihat-practice__difference"
                  dir="rtl"
                  lang="ar"
                  :style="arabicTextStyle"
                >
                  {{ step.leftPhrase }}
                </p>
              </template>

              <template v-else-if="step?.kind === 'recite'">
                <p class="mutashabihat-practice__ref">{{ reciteTargetRef }}</p>
                <p class="mutashabihat-practice__prompt">{{ recitePrompt }}</p>
              </template>

              <template v-else-if="step?.kind === 'result'">
                <p class="mutashabihat-practice__result-title">{{ resultTitle }}</p>
                <p class="mutashabihat-practice__pair">{{ pairLabel }}</p>
                <ul class="mutashabihat-practice__result-list">
                  <li>{{ recallResultLabel }}</li>
                  <li>{{ chooseResultLabel }}</li>
                  <li>{{ reciteResultLabel }}</li>
                  <li>{{ distinctionResultLabel }}</li>
                </ul>
              </template>
            </div>

            <footer class="post-session-simple__footer">
              <div v-if="step?.kind === 'compare'" class="post-session-simple__actions">
                <button type="button" class="post-session-simple__btn post-session-simple__btn--primary" @click="$emit('next')">
                  {{ comparedLabel }}
                </button>
              </div>
              <div v-else-if="step?.kind === 'recall'" class="post-session-simple__actions post-session-simple__actions--2">
                <button
                  v-if="!revealed"
                  type="button"
                  class="post-session-simple__btn post-session-simple__btn--secondary"
                  @click="revealed = true"
                >
                  {{ revealLabel }}
                </button>
                <button
                  v-if="revealed"
                  type="button"
                  class="post-session-simple__btn post-session-simple__btn--secondary"
                  @click="$emit('recall', false)"
                >
                  {{ neededHintLabel }}
                </button>
                <button
                  v-if="revealed"
                  type="button"
                  class="post-session-simple__btn post-session-simple__btn--primary"
                  @click="$emit('recall', true)"
                >
                  {{ rememberedLabel }}
                </button>
              </div>
              <div v-else-if="step?.kind === 'choose'" class="post-session-simple__actions">
                <button
                  type="button"
                  class="post-session-simple__btn post-session-simple__btn--primary"
                  :disabled="!chooseResolved"
                  @click="$emit('choose-continue')"
                >
                  {{ continueLabel }}
                </button>
              </div>
              <div v-else-if="step?.kind === 'recite'" class="post-session-simple__actions post-session-simple__actions--2">
                <button
                  type="button"
                  class="post-session-simple__btn post-session-simple__btn--secondary"
                  @click="$emit('skip-recite')"
                >
                  {{ skipReciteLabel }}
                </button>
                <button
                  type="button"
                  class="post-session-simple__btn post-session-simple__btn--primary"
                  @click="$emit('ai-recite')"
                >
                  {{ aiReciteLabel }}
                </button>
              </div>
              <div v-else-if="step?.kind === 'result'" class="post-session-simple__actions post-session-simple__actions--3">
                <button type="button" class="post-session-simple__btn post-session-simple__btn--secondary" @click="$emit('retry')">
                  {{ retryLabel }}
                </button>
                <button
                  v-if="hasNextPair"
                  type="button"
                  class="post-session-simple__btn post-session-simple__btn--secondary"
                  @click="$emit('next-pair')"
                >
                  {{ nextPairLabel }}
                </button>
                <button type="button" class="post-session-simple__btn post-session-simple__btn--primary" @click="$emit('done')">
                  {{ doneLabel }}
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
import {
  captureReturnFocus,
  focusInitialElement,
  handleModalKeydown,
  restoreReturnFocus,
} from '../utils/modalFocus'
import { QURAN_FONT_FAMILIES, QURAN_FONT_DEFAULT } from '../scripts/quran/quranFonts'

export default {
  name: 'MutashabihatPracticeModal',
  props: {
    open: { type: Boolean, default: false },
    theme: { type: String, default: 'light' },
    title: { type: String, default: 'Mutashābihāt practice' },
    step: { type: Object, default: null },
    currentStepId: { type: String, default: 'compare' },
    stepItems: { type: Array, default: () => [] },
    pairLabel: { type: String, default: '' },
    anchorRef: { type: String, default: '' },
    otherRef: { type: String, default: '' },
    reciteTargetRef: { type: String, default: '' },
    quranFontFamily: { type: String, default: '' },
    compareLead: { type: String, default: '' },
    recallPrompt: { type: String, default: '' },
    recallAnswerLabel: { type: String, default: '' },
    identifyPrompt: { type: String, default: '' },
    recitePrompt: { type: String, default: '' },
    comparedLabel: { type: String, default: "I've compared them" },
    revealLabel: { type: String, default: 'Reveal answer' },
    rememberedLabel: { type: String, default: 'I remembered it' },
    neededHintLabel: { type: String, default: 'I needed the hint' },
    continueLabel: { type: String, default: 'Continue' },
    aiReciteLabel: { type: String, default: 'AI Recite' },
    skipReciteLabel: { type: String, default: 'Continue without reciting' },
    closeLabel: { type: String, default: 'Close' },
    retryLabel: { type: String, default: 'Practice again' },
    nextPairLabel: { type: String, default: 'Next pair' },
    doneLabel: { type: String, default: 'Done' },
    hasNextPair: { type: Boolean, default: false },
    chooseFeedback: { type: String, default: '' },
    chooseCorrect: { type: Boolean, default: false },
    chooseResolved: { type: Boolean, default: false },
    correctAnswerLabel: { type: String, default: 'Correct answer' },
    yourChoiceLabel: { type: String, default: 'Your choice' },
    resultTitle: { type: String, default: '' },
    recallResultLabel: { type: String, default: '' },
    chooseResultLabel: { type: String, default: '' },
    reciteResultLabel: { type: String, default: '' },
    distinctionResultLabel: { type: String, default: '' },
  },
  emits: ['close', 'next', 'recall', 'identify-submit', 'choose-continue', 'ai-recite', 'skip-recite', 'retry', 'next-pair', 'done'],
  data() {
    return {
      selectedOption: '',
      revealed: false,
      _returnFocusEl: null,
    }
  },
  computed: {
    arabicTextStyle() {
      const family = String(this.quranFontFamily || '').trim()
        || QURAN_FONT_FAMILIES[QURAN_FONT_DEFAULT]
      return { fontFamily: family }
    },
  },
  watch: {
    step() {
      this.selectedOption = ''
      this.revealed = false
    },
    open: {
      immediate: true,
      handler(value) {
        if (value) {
          this._returnFocusEl = captureReturnFocus()
          this.$nextTick(() => focusInitialElement(this.$refs.dialog, '#mutashabihatPracticeTitle'))
          return
        }
        this.selectedOption = ''
        this.revealed = false
        restoreReturnFocus(this._returnFocusEl)
        this._returnFocusEl = null
      },
    },
  },
  beforeUnmount() {
    restoreReturnFocus(this._returnFocusEl)
    this._returnFocusEl = null
  },
  methods: {
    onDialogKeydown(event) {
      handleModalKeydown(event, {
        container: this.$refs.dialog,
        open: this.open,
        onEscape: this.requestClose,
      })
    },
    requestClose() {
      this.$emit('close')
    },
    selectOption(id) {
      if (this.chooseResolved) return
      this.selectedOption = id
      this.$emit('identify-submit', id)
    },
    optionClass(option) {
      return {
        'is-selected': this.selectedOption === option.id && !this.chooseResolved,
        'is-correct': this.chooseResolved && option.correct,
        'is-incorrect': this.chooseResolved && this.selectedOption === option.id && !option.correct,
      }
    },
  },
}
</script>

<style src="./MutashabihatPracticeModal.css"></style>
