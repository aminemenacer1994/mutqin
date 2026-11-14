<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="aa-overlay"
      role="presentation"
      @click.self="close"
    >
      <div
        ref="dialogRoot"
        class="aa-modal aa-modal--basic"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
        @keydown="onKeydown"
      >
        <header class="aa-header">
          <div class="aa-header__row">
            <h2 :id="titleId" class="aa-header__title" tabindex="-1">
              {{ t('dashboard.basic_analytics.title') }}
            </h2>
            <div class="aa-header__actions">
              <button
                ref="closeButton"
                type="button"
                class="aa-icon-btn"
                :aria-label="t('common.close')"
                @click="close"
              >
                <i class="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </div>
          </div>
          <p v-if="periodLabel" class="aa-header__subtitle">{{ periodLabel }}</p>
        </header>

        <div class="aa-body">
          <section class="aa-section aa-section--overview" :aria-label="t('dashboard.basic_analytics.overview_label')">
            <div class="aa-kpi-grid">
              <article v-for="card in cards" :key="card.key" class="aa-kpi">
                <div class="aa-kpi__top">
                  <span class="aa-kpi__icon" aria-hidden="true">
                    <i class="bi" :class="card.icon"></i>
                  </span>
                </div>
                <p class="aa-kpi__title">{{ card.title }}</p>
                <p class="aa-kpi__value">{{ card.value }}</p>
                <p class="aa-kpi__hint">{{ card.description }}</p>
              </article>
            </div>
          </section>

          <section v-if="progressCards.length" class="aa-section">
            <div class="aa-section__head">
              <div>
                <h3>{{ t('dashboard.basic_analytics.progress_title') }}</h3>
                <p>{{ t('dashboard.basic_analytics.progress_hint') }}</p>
              </div>
            </div>
            <div class="aa-kpi-grid aa-kpi-grid--basic-progress">
              <article v-for="card in progressCards" :key="card.key" class="aa-kpi">
                <div class="aa-kpi__top">
                  <span class="aa-kpi__icon" aria-hidden="true">
                    <i :class="card.icon"></i>
                  </span>
                </div>
                <p class="aa-kpi__title">{{ card.title }}</p>
                <p class="aa-kpi__value">{{ card.value }}</p>
                <p class="aa-kpi__hint">{{ card.description }}</p>
              </article>
            </div>
          </section>

          <div v-if="!cards.length && !progressCards.length" class="aa-empty">
            <strong>{{ t('dashboard.basic_analytics.empty_title') }}</strong>
            <p>{{ t('dashboard.basic_analytics.empty_message') }}</p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { captureReturnFocus, handleModalKeydown, restoreReturnFocus } from '../../utils/modalFocus'
import '../advancedAnalytics/AdvancedAnalyticsModal.css'
import './BasicAnalyticsModal.css'

export default {
  name: 'BasicAnalyticsModal',
  mixins: [i18nMixin],
  props: {
    open: { type: Boolean, default: false },
    cards: { type: Array, default: () => [] },
    progressCards: { type: Array, default: () => [] },
    periodLabel: { type: String, default: '' },
  },
  emits: ['close'],
  data() {
    return {
      titleId: `ba-title-${Math.random().toString(36).slice(2, 9)}`,
      returnFocusEl: null,
    }
  },
  watch: {
    open(value) {
      document.body.classList.toggle('modal-open', value)
      if (value) {
        this.returnFocusEl = captureReturnFocus()
        this.$nextTick(() => {
          this.$refs.closeButton?.focus?.()
          this.$refs.dialogRoot?.focus?.()
        })
      } else if (this.returnFocusEl) {
        const target = this.returnFocusEl
        this.returnFocusEl = null
        this.$nextTick(() => restoreReturnFocus(target))
      }
    },
  },
  beforeUnmount() {
    document.body.classList.remove('modal-open')
    restoreReturnFocus(this.returnFocusEl)
  },
  methods: {
    close() {
      this.$emit('close')
    },
    onKeydown(event) {
      handleModalKeydown(event, {
        container: this.$refs.dialogRoot,
        onEscape: this.close,
      })
    },
  },
}
</script>
