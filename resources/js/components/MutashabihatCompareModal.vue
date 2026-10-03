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
            class="post-session-simple__dialog post-session-simple__dialog--lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mutashabihatCompareTitle"
            tabindex="-1"
          >
            <header class="post-session-simple__header post-session-simple__header--calm">
              <div class="post-session-simple__header-copy">
                <h2 id="mutashabihatCompareTitle" class="post-session-simple__title">
                  {{ title }}
                </h2>
                <p v-if="subtitle" class="post-session-simple__subtitle">{{ subtitle }}</p>
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
                <article class="mutashabihat-compare__panel">
                  <header class="mutashabihat-compare__panel-head">
                    <span>{{ leftLabel }}</span>
                    <button
                      v-if="leftVerseKey"
                      type="button"
                      class="mutashabihat-compare__icon-btn"
                      :aria-label="playLeftLabel"
                      @click="$emit('play-ayah', leftVerseKey)"
                    >
                      <i class="bi bi-volume-up-fill" aria-hidden="true"></i>
                    </button>
                  </header>
                  <p
                    class="mutashabihat-compare__arabic"
                    dir="rtl"
                    lang="ar"
                    :style="arabicTextStyle"
                    v-html="leftHtml"
                  ></p>
                </article>
                <article class="mutashabihat-compare__panel">
                  <header class="mutashabihat-compare__panel-head">
                    <span>{{ rightLabel }}</span>
                    <button
                      v-if="rightVerseKey"
                      type="button"
                      class="mutashabihat-compare__icon-btn"
                      :aria-label="playRightLabel"
                      @click="$emit('play-ayah', rightVerseKey)"
                    >
                      <i class="bi bi-volume-up-fill" aria-hidden="true"></i>
                    </button>
                  </header>
                  <p
                    class="mutashabihat-compare__arabic"
                    dir="rtl"
                    lang="ar"
                    :style="arabicTextStyle"
                    v-html="rightHtml"
                  ></p>
                </article>
              </div>
            </div>

            <footer class="post-session-simple__footer">
              <div class="post-session-simple__actions post-session-simple__actions--3">
                <button
                  type="button"
                  class="post-session-simple__btn post-session-simple__btn--secondary"
                  @click="requestClose"
                >
                  {{ closeLabel }}
                </button>
                <button
                  type="button"
                  class="post-session-simple__btn post-session-simple__btn--secondary"
                  @click="$emit('open-ayah', leftVerseKey)"
                >
                  {{ openLeftLabel }}
                </button>
                <button
                  type="button"
                  class="post-session-simple__btn post-session-simple__btn--primary"
                  @click="$emit('practice')"
                >
                  {{ practiceLabel }}
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
export default {
  name: 'MutashabihatCompareModal',
  props: {
    open: { type: Boolean, default: false },
    theme: { type: String, default: 'light' },
    title: { type: String, default: 'Compare similar ayahs' },
    subtitle: { type: String, default: '' },
    leftLabel: { type: String, default: '' },
    rightLabel: { type: String, default: '' },
    leftHtml: { type: String, default: '' },
    rightHtml: { type: String, default: '' },
    leftVerseKey: { type: String, default: '' },
    rightVerseKey: { type: String, default: '' },
    quranFontFamily: { type: String, default: '' },
    closeLabel: { type: String, default: 'Close' },
    practiceLabel: { type: String, default: 'Practice' },
    openLeftLabel: { type: String, default: 'Open ayah' },
    playLeftLabel: { type: String, default: 'Play audio' },
    playRightLabel: { type: String, default: 'Play audio' },
  },
  emits: ['close', 'practice', 'open-ayah', 'play-ayah'],
  computed: {
    arabicTextStyle() {
      const family = String(this.quranFontFamily || '').trim()
        || '"KFGQPC Uthmanic Script HAFS", "UthmanicHafs", "Amiri Quran", "Amiri", "Noto Naskh Arabic", serif'
      return { fontFamily: family }
    },
  },
  watch: {
    open(value) {
      if (!value) return
      this.$nextTick(() => this.$refs.dialog?.focus?.())
    },
  },
  methods: {
    requestClose() {
      this.$emit('close')
    },
  },
}
</script>

<style src="./MutashabihatCompareModal.css"></style>
