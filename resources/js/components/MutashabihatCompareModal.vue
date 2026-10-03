<template>
  <Teleport to="body">
    <transition name="post-session-fade">
      <div
        v-if="open"
        class="post-session-simple post-session-simple--calm-v2 mutashabihat-compare"
        :data-theme="theme"
        data-testid="mutashabihat-compare"
      >
        <div class="post-session-simple__backdrop" aria-hidden="true"></div>
        <div
          class="post-session-simple__overlay"
          @mousedown.self.prevent
          @click.self.prevent
        >
          <div
            ref="dialog"
            class="post-session-simple__dialog post-session-simple__dialog--lg mutashabihat-compare__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mutashabihatCompareTitle"
            :aria-describedby="subtitle ? 'mutashabihatCompareSubtitle' : undefined"
            tabindex="-1"
            @keydown="onDialogKeydown"
          >
            <header class="post-session-simple__header post-session-simple__header--calm mutashabihat-compare__header">
              <div class="post-session-simple__header-copy">
                <p class="mutashabihat-compare__kicker">{{ title }}</p>
                <h2 id="mutashabihatCompareTitle" class="mutashabihat-compare__title" tabindex="-1">
                  {{ leftLabel }} <span aria-hidden="true">·</span> {{ rightLabel }}
                </h2>
                <p
                  v-if="subtitle"
                  id="mutashabihatCompareSubtitle"
                  class="mutashabihat-compare__subtitle"
                >
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

            <div class="post-session-simple__body mutashabihat-compare__body">
              <div class="mutashabihat-compare__grid">
                <article class="mutashabihat-compare__panel" :class="{ 'is-open': leftOpen }">
                  <header class="mutashabihat-compare__panel-head">
                    <button
                      type="button"
                      class="mutashabihat-compare__toggle"
                      :aria-expanded="leftOpen"
                      @click="leftOpen = !leftOpen"
                    >
                      <span class="mutashabihat-compare__panel-label">{{ leftLabel }}</span>
                      <i class="bi" :class="leftOpen ? 'bi-chevron-up' : 'bi-chevron-down'" aria-hidden="true"></i>
                    </button>
                    <div v-if="leftVerseKey" class="mutashabihat-compare__panel-tools">
                      <button
                        v-if="!sidePlaying(leftVerseKey)"
                        type="button"
                        class="mutashabihat-compare__icon-btn"
                        :aria-label="playLeftLabel"
                        @click="emitAudioControl(leftVerseKey, 'play')"
                      >
                        <i class="bi bi-play-fill" aria-hidden="true"></i>
                      </button>
                      <button
                        v-if="sidePlaying(leftVerseKey)"
                        type="button"
                        class="mutashabihat-compare__icon-btn"
                        :aria-label="pauseLabel"
                        @click="emitAudioControl(leftVerseKey, 'pause')"
                      >
                        <i class="bi bi-pause-fill" aria-hidden="true"></i>
                      </button>
                      <button
                        v-if="isSideActive(leftVerseKey) && (sidePlaying(leftVerseKey) || sidePaused(leftVerseKey))"
                        type="button"
                        class="mutashabihat-compare__icon-btn mutashabihat-compare__icon-btn--stop"
                        :aria-label="stopLabel"
                        @click="emitAudioControl(leftVerseKey, 'stop')"
                      >
                        <i class="bi bi-stop-fill" aria-hidden="true"></i>
                      </button>
                    </div>
                  </header>
                  <div v-show="leftOpen" class="mutashabihat-compare__panel-body">
                    <p class="mutashabihat-compare__passage-label">{{ leftLabel }}</p>
                    <p
                      class="mutashabihat-compare__arabic mutashabihat-compare__arabic--highlight"
                      dir="rtl"
                      lang="ar"
                      v-html="leftHtml"
                    ></p>
                    <p v-if="leftTranslation" class="mutashabihat-compare__translation">
                      {{ leftTranslation }}
                    </p>
                  </div>
                </article>
                <article class="mutashabihat-compare__panel" :class="{ 'is-open': rightOpen }">
                  <header class="mutashabihat-compare__panel-head">
                    <button
                      type="button"
                      class="mutashabihat-compare__toggle"
                      :aria-expanded="rightOpen"
                      @click="rightOpen = !rightOpen"
                    >
                      <span class="mutashabihat-compare__panel-label">{{ rightLabel }}</span>
                      <i class="bi" :class="rightOpen ? 'bi-chevron-up' : 'bi-chevron-down'" aria-hidden="true"></i>
                    </button>
                    <div v-if="rightVerseKey" class="mutashabihat-compare__panel-tools">
                      <button
                        v-if="!sidePlaying(rightVerseKey)"
                        type="button"
                        class="mutashabihat-compare__icon-btn"
                        :aria-label="playRightLabel"
                        @click="emitAudioControl(rightVerseKey, 'play')"
                      >
                        <i class="bi bi-play-fill" aria-hidden="true"></i>
                      </button>
                      <button
                        v-if="sidePlaying(rightVerseKey)"
                        type="button"
                        class="mutashabihat-compare__icon-btn"
                        :aria-label="pauseLabel"
                        @click="emitAudioControl(rightVerseKey, 'pause')"
                      >
                        <i class="bi bi-pause-fill" aria-hidden="true"></i>
                      </button>
                      <button
                        v-if="isSideActive(rightVerseKey) && (sidePlaying(rightVerseKey) || sidePaused(rightVerseKey))"
                        type="button"
                        class="mutashabihat-compare__icon-btn mutashabihat-compare__icon-btn--stop"
                        :aria-label="stopLabel"
                        @click="emitAudioControl(rightVerseKey, 'stop')"
                      >
                        <i class="bi bi-stop-fill" aria-hidden="true"></i>
                      </button>
                    </div>
                  </header>
                  <div v-show="rightOpen" class="mutashabihat-compare__panel-body">
                    <p class="mutashabihat-compare__passage-label">{{ rightLabel }}</p>
                    <p
                      class="mutashabihat-compare__arabic mutashabihat-compare__arabic--highlight"
                      dir="rtl"
                      lang="ar"
                      v-html="rightHtml"
                    ></p>
                    <p v-if="rightTranslation" class="mutashabihat-compare__translation">
                      {{ rightTranslation }}
                    </p>
                  </div>
                </article>
              </div>
            </div>

            <footer class="post-session-simple__footer mutashabihat-compare__footer">
              <button
                type="button"
                class="mutashabihat-compare__close"
                @click="requestClose"
              >
                {{ closeLabel }}
              </button>
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

export default {
  name: 'MutashabihatCompareModal',
  props: {
    open: { type: Boolean, default: false },
    theme: { type: String, default: 'light' },
    title: { type: String, default: 'Compare Similar Ayahs' },
    subtitle: { type: String, default: '' },
    focusCopy: { type: String, default: '' },
    leftLabel: { type: String, default: '' },
    rightLabel: { type: String, default: '' },
    leftHtml: { type: String, default: '' },
    rightHtml: { type: String, default: '' },
    leftTranslation: { type: String, default: '' },
    rightTranslation: { type: String, default: '' },
    leftVerseKey: { type: String, default: '' },
    rightVerseKey: { type: String, default: '' },
    quranFontFamily: { type: String, default: '' },
    closeLabel: { type: String, default: 'Close' },
    playLeftLabel: { type: String, default: 'Play audio' },
    playRightLabel: { type: String, default: 'Play audio' },
    pauseLabel: { type: String, default: 'Pause' },
    stopLabel: { type: String, default: 'Stop' },
    audioVerseKey: { type: String, default: '' },
    audioPlaying: { type: Boolean, default: false },
    audioPaused: { type: Boolean, default: false },
  },
  emits: ['close', 'audio-control'],
  data() {
    return {
      leftOpen: true,
      rightOpen: true,
      _returnFocusEl: null,
    }
  },
  watch: {
    open: {
      immediate: true,
      handler(value) {
        if (value) {
          this._returnFocusEl = captureReturnFocus()
          this.syncPanelDefaults()
          this.$nextTick(() => focusInitialElement(this.$refs.dialog, '#mutashabihatCompareTitle'))
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
    syncPanelDefaults() {
      this.leftOpen = true
      this.rightOpen = true
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
    isSideActive(verseKey) {
      const key = String(verseKey || '').trim()
      return !!key && key === String(this.audioVerseKey || '').trim()
    },
    sidePlaying(verseKey) {
      return this.isSideActive(verseKey) && this.audioPlaying
    },
    sidePaused(verseKey) {
      return this.isSideActive(verseKey) && this.audioPaused && !this.audioPlaying
    },
    emitAudioControl(verseKey, action) {
      const key = String(verseKey || '').trim()
      if (!key) return
      this.$emit('audio-control', { verseKey: key, action })
    },
  },
}
</script>

<style src="./MutashabihatCompareModal.css"></style>
