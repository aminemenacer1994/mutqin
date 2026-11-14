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
          <div class="aa-header__top">
            <div class="aa-header__copy">
              <h2 :id="titleId" tabindex="-1">{{ t('dashboard.advanced_analytics.title') }}</h2>
              <p>{{ t('dashboard.advanced_analytics.subtitle') }}</p>
            </div>
            <div class="aa-header__actions">
              <button
                type="button"
                class="aa-btn aa-btn--primary"
                :disabled="exporting || loading || !view || view.isEmpty"
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
                @click="setRange(preset.key)"
              >
                {{ t(`dashboard.advanced_analytics.range_${preset.key}`) }}
              </button>
            </div>

            <div v-if="range === 'custom'" class="aa-custom-range">
              <label>
                {{ t('dashboard.advanced_analytics.custom_from') }}
                <input v-model="customFrom" type="date" :max="customTo || today" @change="applyCustomRange">
              </label>
              <label>
                {{ t('dashboard.advanced_analytics.custom_to') }}
                <input v-model="customTo" type="date" :min="customFrom || undefined" :max="today" @change="applyCustomRange">
              </label>
              <button type="button" class="aa-btn aa-btn--ghost" :disabled="!customFrom || !customTo" @click="applyCustomRange">
                {{ t('dashboard.advanced_analytics.apply_range') }}
              </button>
            </div>
          </div>
        </header>

        <div class="aa-body">
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
              <section class="aa-section" :aria-label="t('dashboard.advanced_analytics.overview_label')">
                <div class="aa-section__head">
                  <div>
                    <h3>{{ t('dashboard.advanced_analytics.overview_title') }}</h3>
                    <p>{{ t('dashboard.advanced_analytics.overview_hint') }}</p>
                  </div>
                </div>
                <div class="aa-kpi-grid">
                  <article v-for="card in view.cards" :key="card.key" class="aa-kpi">
                    <div class="aa-kpi__top">
                      <span class="aa-kpi__icon" aria-hidden="true"><i :class="card.icon"></i></span>
                      <span v-if="card.delta" class="aa-kpi__delta">{{ card.delta }}</span>
                    </div>
                    <p class="aa-kpi__title">{{ card.title }}</p>
                    <p class="aa-kpi__value">{{ card.value }}</p>
                    <p class="aa-kpi__hint">{{ card.description }}</p>
                  </article>
                </div>
              </section>

              <section v-if="view.practiceChart" class="aa-section">
                <div class="aa-section__head">
                  <div>
                    <h3>{{ t('dashboard.advanced_analytics.chart_practice_title') }}</h3>
                    <p>{{ t('dashboard.advanced_analytics.chart_practice_hint') }}</p>
                  </div>
                </div>
                <div class="aa-chart">
                  <Line :data="view.practiceChart.data" :options="view.practiceChart.options" />
                </div>
              </section>
              <div v-else-if="view.hasPractice === false" class="aa-empty">
                {{ t('dashboard.advanced_analytics.chart_practice_empty') }}
              </div>

              <section v-if="view.sessionMixChart" class="aa-section">
                <div class="aa-section__head">
                  <div>
                    <h3>{{ t('dashboard.advanced_analytics.chart_mix_title') }}</h3>
                    <p>{{ t('dashboard.advanced_analytics.chart_mix_hint') }}</p>
                  </div>
                </div>
                <div class="aa-chart">
                  <Bar :data="view.sessionMixChart.data" :options="view.sessionMixChart.options" />
                </div>
              </section>

              <section v-if="view.aiChart" class="aa-section">
                <div class="aa-section__head">
                  <div>
                    <h3>{{ t('dashboard.advanced_analytics.chart_ai_title') }}</h3>
                    <p>{{ t('dashboard.advanced_analytics.chart_ai_hint') }}</p>
                  </div>
                </div>
                <div class="aa-chart">
                  <Line :data="view.aiChart.data" :options="view.aiChart.options" />
                </div>
              </section>
              <div v-else-if="!view.hasAi" class="aa-empty">
                {{ t('dashboard.advanced_analytics.chart_ai_empty') }}
              </div>

              <section v-if="view.breakdownChart" class="aa-section">
                <div class="aa-section__head">
                  <div>
                    <h3>{{ t('dashboard.advanced_analytics.chart_breakdown_title') }}</h3>
                    <p>{{ t('dashboard.advanced_analytics.chart_breakdown_hint') }}</p>
                  </div>
                </div>
                <div class="aa-chart aa-chart--donut">
                  <Doughnut :data="view.breakdownChart.data" :options="view.breakdownChart.options" />
                </div>
              </section>

              <section v-if="view.surahProgress.length" class="aa-section">
                <div class="aa-section__head">
                  <div>
                    <h3>{{ t('dashboard.advanced_analytics.surah_title') }}</h3>
                    <p>{{ t('dashboard.advanced_analytics.surah_hint') }}</p>
                  </div>
                  <div class="aa-sort" role="group" :aria-label="t('dashboard.advanced_analytics.surah_sort_label')">
                    <button type="button" :class="{ 'is-active': surahSort === 'recent' }" @click="surahSort = 'recent'">
                      {{ t('dashboard.advanced_analytics.surah_sort_recent') }}
                    </button>
                    <button type="button" :class="{ 'is-active': surahSort === 'progress' }" @click="surahSort = 'progress'">
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
                    <div class="aa-progress" role="progressbar" :aria-valuenow="row.memorised_percent" aria-valuemin="0" aria-valuemax="100">
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
                      <strong>{{ item.label }}</strong>
                      <span class="aa-attention__score" :class="`is-${item.tone}`">{{ item.accuracy_label }}</span>
                      <span class="aa-attention__meta">
                        {{ [item.attempts_label, item.classifications_label, item.last_label].filter(Boolean).join(' · ') }}
                      </span>
                    </div>
                    <a
                      v-if="item.practise_href"
                      class="aa-btn"
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
import { Bar, Doughnut, Line } from 'vue-chartjs'
import { i18nMixin } from '../../mixins/i18nMixin'
import { learningApi } from '../../scripts/api/learning'
import { buildAdvancedAnalyticsView } from '../../scripts/advancedAnalytics/buildReportView'
import { defaultRangeParams, todayIso, toQueryParams } from '../../scripts/advancedAnalytics/dateRange'
import { captureReturnFocus, handleModalKeydown, restoreReturnFocus } from '../../utils/modalFocus'
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
  components: { Line, Bar, Doughnut },
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
      return buildAdvancedAnalyticsView(this.report, this.t, { surahSort: this.surahSort })
    },
    requestKey() {
      return `${this.open}:${this.range}:${this.customFrom}:${this.customTo}`
    },
  },
  watch: {
    open(value) {
      document.body.classList.toggle('modal-open', value)
      if (value) {
        this.returnFocusEl = captureReturnFocus()
        this.pdfStatus = null
        this.reload()
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
    requestKey() {
      if (this.open && this.range !== 'custom') this.reload()
    },
  },
  beforeUnmount() {
    document.body.classList.remove('modal-open')
    restoreReturnFocus(this.returnFocusEl)
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
      if (!this.customFrom || !this.customTo) return
      this.range = 'custom'
      this.reload()
    },
    async reload() {
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
      if (!this.view || this.view.isEmpty || this.exporting) return
      this.exporting = true
      this.pdfStatus = null
      try {
        const { exportAdvancedAnalyticsPdf } = await import(
          /* webpackChunkName: "advanced-analytics-pdf" */
          '../../scripts/advancedAnalytics/exportPdf.js'
        )
        await exportAdvancedAnalyticsPdf(this.view, this.t)
        this.setPdfStatus('success', this.t('dashboard.advanced_analytics.export_success'))
      } catch (_) {
        this.setPdfStatus('error', this.t('dashboard.advanced_analytics.export_error'))
      } finally {
        this.exporting = false
      }
    },
  },
}
</script>
