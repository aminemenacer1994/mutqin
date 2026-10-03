<template>
  <Teleport to="body">
    <transition name="post-session-fade">
      <div
        v-if="open"
        class="post-session-simple post-session-simple--calm-v2 tajweed-colour-guide"
        :data-theme="theme"
        data-testid="tajweed-colour-guide"
      >
        <div class="post-session-simple__backdrop" aria-hidden="true"></div>
        <div
          class="post-session-simple__overlay"
          @mousedown.self.prevent
          @click.self.prevent
        >
          <div
            ref="dialog"
            class="post-session-simple__dialog post-session-simple__dialog--lg tajweed-colour-guide__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tajweedColourGuideTitle"
            :aria-describedby="subtitle ? 'tajweedColourGuideSubtitle' : undefined"
            tabindex="-1"
            @keydown="onDialogKeydown"
          >
            <header class="post-session-simple__header post-session-simple__header--calm tajweed-colour-guide__header">
              <div class="post-session-simple__header-copy">
                <h2
                  id="tajweedColourGuideTitle"
                  class="post-session-simple__title"
                  tabindex="-1"
                >
                  {{ title }}
                </h2>
                <p
                  v-if="subtitle"
                  id="tajweedColourGuideSubtitle"
                  class="post-session-simple__subtitle"
                >
                  {{ subtitle }}
                </p>
              </div>
              <button
                type="button"
                class="modal-close-btn post-session-simple__close tajweed-colour-guide__close"
                :aria-label="closeAriaLabel || closeLabel"
                @click="requestClose"
              >
                <i class="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </header>

            <div class="post-session-simple__body tajweed-colour-guide__body">
              <ul class="tajweed-colour-guide__grid">
                <li
                  v-for="(rule, index) in localizedRules"
                  :key="rule.id"
                  class="tajweed-colour-guide__card"
                  :style="{ '--guide-index': index, '--guide-swatch': rule.colourHex }"
                >
                  <div class="tajweed-colour-guide__rule-head">
                    <span
                      class="tajweed-color-swatch tajweed-colour-guide__swatch"
                      :style="{ background: rule.colourHex }"
                      aria-hidden="true"
                    ></span>
                    <div class="tajweed-colour-guide__copy">
                      <strong class="tajweed-colour-guide__name">{{ rule.name }}</strong>
                      <p class="tajweed-colour-guide__description">{{ rule.description }}</p>
                    </div>
                  </div>
                  <p class="tajweed-colour-guide__example-label">{{ exampleLabel }}</p>
                  <div class="tajweed-colour-guide__example-well">
                    <p
                      class="tajweed-colour-guide__example tajweed-enabled"
                      dir="rtl"
                      lang="ar"
                      :style="arabicExampleStyle"
                    >
                      <span
                        v-for="(part, partIndex) in rule.example"
                        :key="`${rule.id}-${partIndex}`"
                        :class="part.className ? ['tajweed-mark', part.className] : null"
                        :style="part.className ? { color: rule.colourHex } : null"
                      >{{ part.text }}</span>
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            <footer class="post-session-simple__footer tajweed-colour-guide__footer">
              <div class="post-session-simple__actions">
                <button
                  type="button"
                  class="post-session-simple__btn post-session-simple__btn--primary"
                  @click="requestClose"
                >
                  {{ closeLabel }}
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
import { localizeTajweedColourGuideRules } from '../scripts/tajweed/colourGuide'
import { QURAN_FONT_FAMILIES, QURAN_FONT_DEFAULT } from '../scripts/quran/quranFonts'

export default {
  name: 'TajweedColourGuideModal',
  props: {
    open: { type: Boolean, default: false },
    theme: { type: String, default: 'light' },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    exampleLabel: { type: String, default: '' },
    closeLabel: { type: String, default: '' },
    closeAriaLabel: { type: String, default: '' },
    quranFontFamily: { type: String, default: '' },
  },
  emits: ['close'],
  data() {
    return {
      _returnFocusEl: null,
    }
  },
  computed: {
    localizedRules() {
      return localizeTajweedColourGuideRules((key) => this.t(key))
    },
    arabicExampleStyle() {
      const family = String(this.quranFontFamily || '').trim()
        || QURAN_FONT_FAMILIES[QURAN_FONT_DEFAULT]
      return { fontFamily: family, '--tajweed-guide-arabic': family }
    },
  },
  watch: {
    open: {
      immediate: true,
      handler(value) {
        if (value) {
          this._returnFocusEl = captureReturnFocus()
          this.$nextTick(() => {
            focusInitialElement(this.$refs.dialog, '#tajweedColourGuideTitle')
          })
          return
        }
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
    t(key, params) {
      if (typeof this.$t === 'function') return this.$t(key, params)
      return key
    },
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
  },
}
</script>

<style src="./TajweedColourGuideModal.css"></style>
