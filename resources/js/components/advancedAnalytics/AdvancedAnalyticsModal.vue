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
        class="aa-modal"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
        @keydown="onKeydown"
      >
        <header class="aa-header">
          <div class="aa-header__row">
            <h2 :id="titleId" class="aa-header__title" tabindex="-1">
              {{ t('dashboard.advanced_analytics.title') }}
            </h2>
            <div class="aa-header__actions">
              <button
                type="button"
                class="aa-btn aa-btn--pdf"
                :disabled="exporting || loading || !view || view.isEmpty"
                :aria-label="exporting ? t('dashboard.advanced_analytics.exporting') : t('dashboard.advanced_analytics.export_pdf')"
                :title="exporting ? t('dashboard.advanced_analytics.exporting') : t('dashboard.advanced_analytics.export_pdf')"
                @click="exportPdf"
              >
                <i class="bi bi-filetype-pdf" aria-hidden="true"></i>
                <span>{{ exporting ? t('dashboard.advanced_analytics.exporting') : t('dashboard.advanced_analytics.export_pdf') }}</span>
              </button>
              <button
                ref="closeButton"
                type="button"
                class="aa-icon-btn"
                :aria-label="t('common.close')"
                :title="t('common.close')"
                @click="close"
              >
                <i class="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </div>
          </div>

          <div class="aa-header__toolbar">
            <div class="aa-range" role="group" :aria-label="t('dashboard.advanced_analytics.range_label')">
              <button
                v-for="preset in presets"
                :key="preset.key"
                type="button"
                class="aa-range__btn"
                :class="{ 'is-active': range === preset.key }"
                :aria-pressed="range === preset.key"
                @click="setRange(preset.key)"
              >
                {{ t(`dashboard.advanced_analytics.range_${preset.key}`) }}
              </button>
            </div>

            <form v-if="range === 'custom'" class="aa-custom-range" @submit.prevent="applyCustomRange">
              <label>
                {{ t('dashboard.advanced_analytics.custom_from') }}
                <input v-model="customFrom" type="date" required :max="customTo && customTo < today ? customTo : today">
              </label>
              <label>
                {{ t('dashboard.advanced_analytics.custom_to') }}
                <input v-model="customTo" type="date" required :min="customFrom || undefined" :max="today">
              </label>
              <button type="submit" class="aa-btn" :disabled="!customRangeValid || loading">
                {{ t('dashboard.advanced_analytics.apply_range') }}
              </button>
            </form>
          </div>
        </header>

        <div class="aa-body" :aria-busy="loading">
          <p v-if="loading && view" class="aa-refresh-status" role="status">
            <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
            {{ t('dashboard.advanced_analytics.loading') }}
          </p>
          <div v-if="pdfStatus" class="aa-pdf-status" :class="`is-${pdfStatus.kind}`" role="status">
            {{ pdfStatus.message }}
          </div>

          <template v-if="loading && !view">
            <div class="aa-skel-grid" aria-hidden="true">
              <div v-for="n in 6" :key="`kpi-${n}`" class="aa-skel"></div>
            </div>
            <div class="aa-skel aa-skel--chart" aria-hidden="true"></div>
            <div class="aa-skel aa-skel--chart" aria-hidden="true"></div>
            <span class="visually-hidden">{{ t('dashboard.advanced_analytics.loading') }}</span>
          </template>

          <div v-else-if="error" class="aa-error" role="alert">
            <p>{{ error }}</p>
            <button type="button" class="aa-btn" @click="reload">{{ t('dashboard.retry') }}</button>
          </div>

          <template v-else-if="view">
            <span v-if="view.periodLabel" class="aa-period-chip">{{ view.periodLabel }}</span>

            <div v-if="view.isEmpty" class="aa-empty">
              <strong>{{ t('dashboard.advanced_analytics.empty_title') }}</strong>
              <p>{{ t('dashboard.advanced_analytics.empty_message') }}</p>
            </div>

            <template v-else>
              <section class="aa-section aa-section--overview" :aria-label="t('dashboard.advanced_analytics.overview_label')">
                <div class="aa-kpi-grid">
                  <article v-for="card in view.cards" :key="card.key" class="aa-kpi" :title="card.description">
                    <div class="aa-kpi__top">
                      <span class="aa-kpi__icon" aria-hidden="true"><i :class="card.icon"></i></span>
                      <span v-if="card.delta" class="aa-kpi__delta" :class="card.deltaTone ? `is-${card.deltaTone}` : undefined">{{ card.delta }}</span>
                    </div>
                    <p class="aa-kpi__title">{{ card.title }}</p>
                    <p class="aa-kpi__value">{{ card.value }}</p>
                    <p class="visually-hidden">{{ card.description }}</p>
                  </article>
                </div>
              </section>

              <div v-if="!view.hasPractice || !view.hasAi" class="aa-data-notes">
                <p v-if="!view.hasPractice">{{ t('dashboard.advanced_analytics.chart_practice_empty') }}</p>
                <p v-if="!view.hasAi">{{ t('dashboard.advanced_analytics.chart_ai_empty') }}</p>
              </div>

              <div v-if="view.practiceChart || view.sessionMixChart || view.aiChart || view.breakdownChart" class="aa-charts-grid">
              <section v-if="view.practiceChart" class="aa-section aa-section--chart">
                <div class="aa-section__head">
                  <div>
                    <h3>{{ t('dashboard.advanced_analytics.chart_practice_title') }}</h3>
                    <p>{{ t('dashboard.advanced_analytics.chart_practice_hint') }}</p>
                  </div>
                </div>
                <AnalyticsChart :config="view.practiceChart" :label="t('dashboard.advanced_analytics.chart_practice_title')" />
              </section>

              <section v-if="view.sessionMixChart" class="aa-section aa-section--chart">
                <div class="aa-section__head">
                  <div>
                    <h3>{{ t('dashboard.advanced_analytics.chart_mix_title') }}</h3>
                    <p>{{ t('dashboard.advanced_analytics.chart_mix_hint') }}</p>
                  </div>
                </div>
                <AnalyticsChart type="bar" :config="view.sessionMixChart" :label="t('dashboard.advanced_analytics.chart_mix_title')" />
              </section>

              <section v-if="view.aiChart" class="aa-section aa-section--chart">
                <div class="aa-section__head">
                  <div>
                    <h3>{{ t('dashboard.advanced_analytics.chart_ai_title') }}</h3>
                    <p>{{ t('dashboard.advanced_analytics.chart_ai_hint') }}</p>
                  </div>
                </div>
                <AnalyticsChart :config="view.aiChart" :label="t('dashboard.advanced_analytics.chart_ai_title')" />
              </section>

              <section v-if="view.breakdownChart" class="aa-section aa-section--chart">
                <div class="aa-section__head">
                  <div>
                    <h3>{{ t('dashboard.advanced_analytics.chart_breakdown_title') }}</h3>
                    <p>{{ t('dashboard.advanced_analytics.chart_breakdown_hint') }}</p>
                  </div>
                </div>
                <AnalyticsChart type="doughnut" :config="view.breakdownChart" :label="t('dashboard.advanced_analytics.chart_breakdown_title')" />
              </section>
              </div>

              <section v-if="view.surahProgress.length" class="aa-section">
                <div class="aa-section__head">
                  <div>
                    <h3>{{ t('dashboard.advanced_analytics.surah_title') }}</h3>
                    <p>{{ t('dashboard.advanced_analytics.surah_hint') }}</p>
                  </div>
                  <div class="aa-sort" role="group" :aria-label="t('dashboard.advanced_analytics.surah_sort_label')">
                    <button type="button" :class="{ 'is-active': surahSort === 'recent' }" :aria-pressed="surahSort === 'recent'" @click="surahSort = 'recent'">
                      {{ t('dashboard.advanced_analytics.surah_sort_recent') }}
                    </button>
                    <button type="button" :class="{ 'is-active': surahSort === 'progress' }" :aria-pressed="surahSort === 'progress'" @click="surahSort = 'progress'">
                      {{ t('dashboard.advanced_analytics.surah_sort_progress') }}
                    </button>
                  </div>
                </div>
                <ul class="aa-surah-list">
                  <li v-for="row in view.surahProgress" :key="row.surah_number" class="aa-surah">
                    <div class="aa-surah__top">
                      <div class="aa-surah__names">
                        <strong>{{ row.surah_name }}</strong>
                        <span v-if="row.surah_name_ar" class="aa-surah__ar" lang="ar" dir="rtl">{{ row.surah_name_ar }}</span>
                      </div>
                      <span class="aa-surah__meta">{{ row.memorised_percent }}%</span>
                    </div>
                    <div class="aa-progress" role="progressbar" :aria-label="row.surah_name" :aria-valuenow="row.memorised_percent" aria-valuemin="0" aria-valuemax="100">
                      <span :style="{ width: `${row.memorised_percent}%` }"></span>
                    </div>
                    <div class="aa-surah__meta">
                      {{ t('dashboard.advanced_analytics.surah_meta', {
                        practised: row.ayahs_practised || 0,
                        memorised: row.ayahs_memorised || 0,
                        revised: row.revision_coverage || 0,
                        last: row.last_label || '—',
                      }) }}
                    </div>
                  </li>
                </ul>
              </section>

              <section v-if="view.insights.length" class="aa-section aa-insights">
                <div class="aa-section__head">
                  <div>
                    <h3>{{ t('dashboard.advanced_analytics.insights_title') }}</h3>
                    <p>{{ t('dashboard.advanced_analytics.insights_hint') }}</p>
                  </div>
                </div>
                <ul class="aa-insight-list">
                  <li
                    v-for="insight in view.insights"
                    :key="insight.key + insight.text"
                    class="aa-insight"
                    :class="`is-${insight.tone}`"
                  >
                    <span class="aa-insight__tone" aria-hidden="true"></span>
                    <p>{{ insight.text }}</p>
                  </li>
                </ul>
              </section>

              <section v-if="view.attention.length" class="aa-section">
                <div class="aa-section__head">
                  <div>
                    <h3>{{ t('dashboard.advanced_analytics.attention_title') }}</h3>
                    <p>{{ t('dashboard.advanced_analytics.attention_hint') }}</p>
                  </div>
                </div>
                <ul class="aa-attention-list">
                  <li v-for="item in view.attention" :key="item.key" class="aa-attention">
                    <div class="aa-attention__main">
                      <div class="aa-attention__title-row">
                        <strong>{{ item.label }}</strong>
                        <span class="aa-attention__score" :class="`is-${item.tone}`">{{ item.accuracy_label }}</span>
                      </div>
                      <span class="aa-attention__meta">
                        {{ [item.attempts_label, item.classifications_label, item.last_label].filter(Boolean).join(' · ') }}
                      </span>
                    </div>
                    <a
                      v-if="item.practise_href"
                      class="aa-btn aa-btn--compact"
                      :href="item.practise_href"
                    >
                      {{ t('dashboard.advanced_analytics.practise_again') }}
                    </a>
                  </li>
                </ul>
              </section>
            </template>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import AnalyticsChart from './AnalyticsChart.vue'
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'
import { buildAdvancedAnalyticsView } from '../../scripts/advancedAnalytics/buildReportView'
import { defaultRangeParams, todayIso, toQueryParams } from '../../scripts/advancedAnalytics/dateRange'
import { captureReturnFocus, handleModalKeydown, restoreReturnFocus } from '../../utils/modalFocus'
import { setModalScrollLock } from '../../utils/modalScrollLock'
import './AdvancedAnalyticsModal.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
)

export default {
  name: 'AdvancedAnalyticsModal',
  components: { AnalyticsChart },
  mixins: [i18nMixin],
  props: {
    open: { type: Boolean, default: false },
  },
  emits: ['close'],
  data() {
    const defaults = defaultRangeParams()
    return {
      titleId: `aa-title-${Math.random().toString(36).slice(2, 9)}`,
      range: defaults.range,
      customFrom: '',
      customTo: '',
      today: todayIso(),
      loading: false,
      exporting: false,
      error: '',
      report: null,
      requestId: 0,
      returnFocusEl: null,
      surahSort: 'recent',
      pdfStatus: null,
      pdfStatusTimer: null,
      themeObserver: null,
      themeRevision: 0,
      presets: [
        { key: '7' },
        { key: '30' },
        { key: '90' },
        { key: 'all' },
        { key: 'custom' },
      ],
    }
  },
  computed: {
    view() {
      if (!this.report) return null
      // Theme changes are outside Vue state; refresh canvas colours when they change.
      return buildAdvancedAnalyticsView(this.report, this.t, { surahSort: this.surahSort, themeRevision: this.themeRevision })
    },
    customRangeValid() {
      return Boolean(this.customFrom && this.customTo && this.customFrom <= this.customTo && this.customTo <= this.today)
    },
  },
  watch: {
    open: {
      immediate: true,
      handler(value) {
        setModalScrollLock(this, value)
        if (value) {
          this.returnFocusEl = captureReturnFocus()
          this.pdfStatus = null
          this.reload()
          this.$nextTick(() => this.$refs.dialogRoot?.focus?.({ preventScroll: true }))
        } else {
          this.requestId++
          this.loading = false
          if (this.returnFocusEl) {
            const target = this.returnFocusEl
            this.returnFocusEl = null
            this.$nextTick(() => restoreReturnFocus(target))
          }
        }
      },
    },
    range() {
      if (this.open && this.range !== 'custom') this.reload()
    },
  },
  mounted() {
    if (typeof MutationObserver === 'undefined') return
    this.themeObserver = new MutationObserver(() => { this.themeRevision++ })
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  },
  beforeUnmount() {
    this.requestId++
    setModalScrollLock(this, false)
    restoreReturnFocus(this.returnFocusEl)
    this.themeObserver?.disconnect()
    if (this.pdfStatusTimer) clearTimeout(this.pdfStatusTimer)
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
    setRange(next) {
      this.range = next
      if (next !== 'custom') {
        this.customFrom = ''
        this.customTo = ''
      }
    },
    applyCustomRange() {
      if (!this.customRangeValid || this.loading) return
      this.range = 'custom'
      this.reload()
    },
    async reload() {
      if (!this.open || (this.range === 'custom' && !this.customRangeValid)) return
      const requestId = ++this.requestId
      this.loading = true
      this.error = ''
      try {
        const params = toQueryParams({
          range: this.range,
          from: this.customFrom,
          to: this.customTo,
        })
        if (params.range === 'custom' && (!params.from || !params.to)) {
          this.loading = false
          return
        }
        const report = await learningApi.getAdvancedAnalytics(params)
        if (requestId !== this.requestId) return
        this.report = report
      } catch (error) {
        if (requestId !== this.requestId) return
        const status = error?.response?.status
        if (status === 403) {
          this.error = this.t('dashboard.advanced_analytics.error_forbidden')
        } else {
          this.error = error?.response?.data?.message || this.t('dashboard.advanced_analytics.error_load')
        }
        this.report = null
      } finally {
        if (requestId === this.requestId) this.loading = false
      }
    },
    setPdfStatus(kind, message) {
      this.pdfStatus = { kind, message }
      if (this.pdfStatusTimer) clearTimeout(this.pdfStatusTimer)
      this.pdfStatusTimer = setTimeout(() => {
        this.pdfStatus = null
      }, 4000)
    },
    async exportPdf() {
      if (!this.view || this.view.isEmpty || this.exporting || this.loading) return
      // PDF pages use a light palette independently of the on-screen theme.
      const view = buildAdvancedAnalyticsView(this.report, this.t, { surahSort: this.surahSort, forPrint: true })
      this.exporting = true
      this.pdfStatus = null
      try {
        const { exportAdvancedAnalyticsPdf } = await import(
          /* webpackChunkName: "advanced-analytics-pdf" */
          '../../scripts/advancedAnalytics/exportPdf.js'
        )
        await exportAdvancedAnalyticsPdf(view, this.t)
        if (this.open) this.setPdfStatus('success', this.t('dashboard.advanced_analytics.export_success'))
      } catch (_) {
        if (this.open) this.setPdfStatus('error', this.t('dashboard.advanced_analytics.export_error'))
      } finally {
        this.exporting = false
        this.$nextTick(() => {
          const dialog = this.$refs.dialogRoot
          if (this.open && dialog && !dialog.contains(document.activeElement)) {
            dialog.focus({ preventScroll: true })
          }
        })
      }
    },
  },
}
</script>
