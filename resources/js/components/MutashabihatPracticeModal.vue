<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="memory-check-overlay mutashabihat-practice"
      :data-theme="theme"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mutashabihatPracticeTitle"
      data-testid="mutashabihat-practice"
    >
      <div
        class="memory-check-card"
        :class="{ 'memory-check-card--result': step?.kind === 'result' }"
        :data-feedback="feedback || undefined"
      >
        <header class="memory-check-header">
          <div class="memory-check-header-copy">
            <h2 id="mutashabihatPracticeTitle" class="memory-check-title">
              {{ title }}
            </h2>
            <p v-if="progressLabel" class="memory-check-sub">{{ progressLabel }}</p>
          </div>
          <button
            type="button"
            class="memory-check-close"
            :aria-label="closeLabel"
            @click="requestClose"
          >
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </header>

        <div class="memory-check-body">
          <p v-if="step?.kind === 'study'" class="mutashabihat-practice__lead">
            {{ studyLead }}
          </p>

          <div
            v-if="step?.kind === 'study' || step?.kind === 'continue'"
            class="mutashabihat-practice__arabic-block"
            dir="rtl"
            lang="ar"
            :style="arabicTextStyle"
          >
            <p v-if="step.kind === 'study'" class="mutashabihat-practice__ref">{{ anchorRef }}</p>
            <p v-if="step.kind === 'study'" class="mutashabihat-practice__ayah">{{ step.anchorArabic }}</p>
            <p v-if="step.kind === 'study'" class="mutashabihat-practice__ref">{{ otherRef }}</p>
            <p v-if="step.kind === 'study'" class="mutashabihat-practice__ayah">{{ step.otherArabic }}</p>
            <template v-if="step.kind === 'continue'">
              <p class="mutashabihat-practice__ref">{{ anchorRef }}</p>
              <p class="mutashabihat-practice__ayah">{{ step.visibleArabic }} …</p>
            </template>
          </div>

          <div v-if="step?.kind === 'identify'" class="mutashabihat-practice__identify">
            <p class="mutashabihat-practice__ref">{{ anchorRef }}</p>
            <p class="mutashabihat-practice__ayah" dir="rtl" lang="ar" :style="arabicTextStyle">
              {{ step.contextArabic }}
            </p>
            <p class="mutashabihat-practice__prompt">{{ identifyPrompt }}</p>
            <ul class="mutashabihat-practice__options">
              <li v-for="option in step.options" :key="option.id">
                <button
                  type="button"
                  class="mutashabihat-practice__option"
                  :class="{ 'is-selected': selectedOption === option.id }"
                  dir="rtl"
                  lang="ar"
                  :style="arabicTextStyle"
                  @click="selectedOption = option.id"
                >
                  {{ option.text }}
                </button>
              </li>
            </ul>
          </div>

          <div v-if="step?.kind === 'recite'" class="mutashabihat-practice__recite">
            <p class="mutashabihat-practice__ref">{{ anchorRef }}</p>
            <p class="mutashabihat-practice__prompt">{{ recitePrompt }}</p>
          </div>

          <div v-if="step?.kind === 'result'" class="mutashabihat-practice__result">
            <p class="mutashabihat-practice__result-title">{{ resultTitle }}</p>
            <p class="mutashabihat-practice__result-copy">{{ resultCopy }}</p>
          </div>
        </div>

        <footer class="memory-check-footer">
          <button
            v-if="step?.kind === 'study'"
            type="button"
            class="memory-check-primary"
            @click="$emit('next')"
          >
            {{ hideLabel }}
          </button>
          <button
            v-else-if="step?.kind === 'continue' || step?.kind === 'recite'"
            type="button"
            class="memory-check-primary"
            @click="$emit('ai-recite')"
          >
            {{ aiReciteLabel }}
          </button>
          <button
            v-else-if="step?.kind === 'identify'"
            type="button"
            class="memory-check-primary"
            :disabled="!selectedOption"
            @click="submitIdentify"
          >
            {{ checkLabel }}
          </button>
          <div v-else-if="step?.kind === 'result'" class="mutashabihat-practice__result-actions">
            <button type="button" class="memory-check-secondary" @click="$emit('retry')">
              {{ retryLabel }}
            </button>
            <button type="button" class="memory-check-primary" @click="$emit('done')">
              {{ continueLabel }}
            </button>
          </div>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script>
export default {
  name: 'MutashabihatPracticeModal',
  props: {
    open: { type: Boolean, default: false },
    theme: { type: String, default: 'light' },
    title: { type: String, default: 'Mutashābihāt practice' },
    progressLabel: { type: String, default: '' },
    step: { type: Object, default: null },
    anchorRef: { type: String, default: '' },
    otherRef: { type: String, default: '' },
    quranFontFamily: { type: String, default: '' },
    studyLead: { type: String, default: '' },
    identifyPrompt: { type: String, default: '' },
    recitePrompt: { type: String, default: '' },
    hideLabel: { type: String, default: 'Continue' },
    aiReciteLabel: { type: String, default: 'Recite' },
    checkLabel: { type: String, default: 'Check' },
    closeLabel: { type: String, default: 'Close' },
    retryLabel: { type: String, default: 'Try again' },
    continueLabel: { type: String, default: 'Continue' },
    resultTitle: { type: String, default: '' },
    resultCopy: { type: String, default: '' },
    feedback: { type: String, default: '' },
  },
  emits: ['close', 'next', 'ai-recite', 'identify-submit', 'retry', 'done'],
  data() {
    return { selectedOption: '' }
  },
  computed: {
    arabicTextStyle() {
      const family = String(this.quranFontFamily || '').trim()
        || '"KFGQPC Uthmanic Script HAFS", "UthmanicHafs", "Amiri Quran", "Amiri", "Noto Naskh Arabic", serif'
      return { fontFamily: family }
    },
  },
  watch: {
    step() {
      this.selectedOption = ''
    },
    open(value) {
      if (!value) this.selectedOption = ''
    },
  },
  methods: {
    requestClose() {
      this.$emit('close')
    },
    submitIdentify() {
      if (!this.selectedOption) return
      this.$emit('identify-submit', this.selectedOption)
    },
  },
}
</script>

<style src="./MutashabihatPracticeModal.css"></style>
