<template>
  <main id="mainContent" class="user-dashboard" tabindex="-1">
    <div class="container user-dashboard__shell">
      <div v-if="loading && !data" class="user-dashboard__loading" role="status" aria-live="polite">
        <div class="dash-spinner" aria-hidden="true"></div>
        <span>{{ t('dashboard.loading') }}</span>
      </div>

      <div v-else-if="error && !data" class="user-dashboard__error" role="alert">
        <span>{{ t('dashboard.load_error') }}</span>
        <button type="button" class="dash-btn dash-btn--primary" @click="reload(true)">
          {{ t('dashboard.retry') }}
        </button>
      </div>

      <template v-else-if="data">
        <header class="dash-hero dash-reveal">
          <div class="dash-hero__row">
            <div class="dash-hero__copy">
              <span class="dash-eyebrow">{{ t('dashboard.next_step') }}</span>
              <h1 id="dash-welcome-heading">{{ greetingText }}</h1>
              <div class="dash-rule" aria-hidden="true"></div>
              <p v-if="retentionChips.length" class="dash-hero__meta">
                <span v-for="chip in retentionChips" :key="chip.key">{{ chip.label }}</span>
              </p>
            </div>

            <button
              type="button"
              class="dash-icon-btn"
              :disabled="loading"
              :aria-label="t('dashboard.refresh')"
              @click="reload(true)"
            >
              <i class="bi bi-arrow-clockwise" :class="{ 'is-spinning': loading }" aria-hidden="true"></i>
            </button>
          </div>

          <a v-if="data.continue" class="dash-continue" :href="continueHref">
            <div class="dash-continue__body">
              <span class="dash-continue__label">{{ continueCta }}</span>
              <span class="dash-continue__title">
                <template v-if="data.continue.surah_name">
                  {{ data.continue.surah_name }}
                </template>
                <template v-else>{{ t('dashboard.start_session') }}</template>
              </span>
              <div v-if="ayahRangeLabel(data.continue) || data.continue.last_ayah" class="dash-pills">
                <span v-if="ayahRangeLabel(data.continue)" class="dash-pill">
                  {{ t('dashboard.current_range') }}: {{ ayahRangeLabel(data.continue) }}
                </span>
                <span v-if="data.continue.last_ayah" class="dash-pill">
                  {{ t('dashboard.last_ayah', { n: data.continue.last_ayah }) }}
                </span>
              </div>
            </div>
            <span class="dash-continue__cta" aria-hidden="true">
              <i class="bi bi-play-fill"></i>
            </span>
          </a>
        </header>

        <section class="dash-panel dash-reveal" aria-labelledby="dash-snapshot-heading" style="--dash-delay: 30ms">
          <div class="dash-panel__head">
            <div>
              <h2 id="dash-snapshot-heading">{{ t('dashboard.snapshot_title') }}</h2>
              <p class="dash-panel__hint">{{ t('dashboard.snapshot_subtitle') }}</p>
            </div>
          </div>
          <div class="dash-metrics">
            <article
              v-for="metric in snapshotCards"
              :key="metric.key"
              class="dash-metric"
              :class="[`dash-metric--${metric.tone}`, { 'is-empty': metric.value === 0 }]"
            >
              <p class="dash-metric__value">{{ metric.value }}</p>
              <p class="dash-metric__label">{{ metric.label }}</p>
            </article>
          </div>
        </section>

        <section class="dash-panel dash-reveal" aria-labelledby="dash-progress-heading" style="--dash-delay: 60ms">
          <div class="dash-panel__head">
            <div>
              <h2 id="dash-progress-heading">{{ t('dashboard.progress_title') }}</h2>
              <p class="dash-panel__hint">{{ t('dashboard.progress_subtitle') }}</p>
            </div>
            <div class="dash-range-toggle" role="group" :aria-label="t('dashboard.chart_range')">
              <button
                type="button"
                class="dash-btn dash-btn--ghost dash-btn--sm"
                :class="{ 'is-active': chartDays === 7 }"
                :disabled="loading"
                @click="setChartDays(7)"
              >
                {{ t('dashboard.days_7') }}
              </button>
              <button
                type="button"
                class="dash-btn dash-btn--ghost dash-btn--sm"
                :class="{ 'is-active': chartDays === 30 }"
                :disabled="loading"
                @click="setChartDays(30)"
              >
                {{ t('dashboard.days_30') }}
              </button>
            </div>
          </div>

          <div class="dash-progress-grid">
            <div class="dash-position">
              <span class="dash-eyebrow">{{ t('dashboard.current_position') }}</span>
              <h3 class="dash-position__surah">
                {{ data.progress?.current_surah_name || t('dashboard.not_started') }}
              </h3>
              <div class="dash-rule" aria-hidden="true"></div>
              <div v-if="ayahRangeLabel(data.progress) || data.progress?.current_ayah" class="dash-pills">
                <span v-if="ayahRangeLabel(data.progress)" class="dash-pill">
                  {{ t('dashboard.current_range') }}: {{ ayahRangeLabel(data.progress) }}
                </span>
                <span v-if="data.progress?.current_ayah" class="dash-pill">
                  {{ t('dashboard.at_ayah', { n: data.progress.current_ayah }) }}
                </span>
              </div>

              <div class="dash-progress-counts">
                <div class="dash-stat">
                  <strong>{{ data.progress?.memorised_ayah_count ?? 0 }}</strong>
                  <span>{{ t('dashboard.memorised_count') }}</span>
                </div>
                <div class="dash-stat">
                  <strong>{{ data.progress?.learning_ayah_count ?? 0 }}</strong>
                  <span>{{ t('dashboard.learning_count') }}</span>
                </div>
              </div>

              <div v-if="primaryCompletion != null" class="dash-completion">
                <div class="dash-completion__row">
                  <span>{{ primaryCompletion.label }}</span>
                  <span>{{ primaryCompletion.value }}%</span>
                </div>
                <div
                  class="dash-progress-bar"
                  role="progressbar"
                  :aria-valuenow="primaryCompletion.value"
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  <span :style="{ width: primaryCompletion.value + '%' }"></span>
                </div>
              </div>
            </div>

            <div class="dash-chart">
              <p class="dash-chart__label">{{ t('dashboard.activity_chart_title') }}</p>
              <div v-if="data.chart?.is_empty" class="dash-chart__empty">
                <span>{{ t('dashboard.chart_empty_message') }}</span>
                <a class="dash-btn dash-btn--ghost dash-btn--sm" :href="memorisationUrl">
                  {{ t('dashboard.start_session') }}
                </a>
              </div>
              <div v-else class="dash-chart__wrap" :class="{ 'is-loading': loading }">
                <Bar
                  v-if="chartReady"
                  :data="chartData"
                  :options="chartOptions"
                  :aria-label="t('dashboard.chart_aria')"
                />
              </div>
            </div>
          </div>
        </section>

        <div class="dash-split dash-reveal" style="--dash-delay: 90ms">
          <section class="dash-panel" aria-labelledby="dash-weak-heading">
            <div class="dash-panel__head">
              <div>
                <h2 id="dash-weak-heading">{{ t('dashboard.strengthen_title') }}</h2>
                <p class="dash-panel__hint">{{ t('dashboard.strengthen_subtitle') }}</p>
              </div>
              <a
                v-if="data.weaknesses?.has_more && data.weaknesses?.view_all_href"
                class="dash-link"
                :href="data.weaknesses.view_all_href"
              >
                {{ t('dashboard.view_all') }}
              </a>
            </div>

            <p v-if="!data.weaknesses?.items?.length" class="dash-empty">
              {{ t('dashboard.weak_empty_message') }}
            </p>

            <ul v-else class="dash-list">
              <li v-for="item in data.weaknesses.items" :key="item.key">
                <a class="dash-list__row" :href="item.href || memorisationUrl">
                  <span class="dash-list__main">
                    <span class="dash-list__title">
                      {{ item.surah_name }} · {{ t('dashboard.ayah_n', { n: item.ayah_number }) }}
                    </span>
                    <span v-if="item.phrase" class="dash-list__phrase" lang="ar" dir="rtl">{{ item.phrase }}</span>
                  </span>
                  <i class="bi bi-chevron-right" aria-hidden="true"></i>
                </a>
              </li>
            </ul>
          </section>

          <section class="dash-panel" aria-labelledby="dash-activity-heading">
            <div class="dash-panel__head">
              <div>
                <h2 id="dash-activity-heading">{{ t('dashboard.activity_title') }}</h2>
                <p class="dash-panel__hint">{{ t('dashboard.activity_subtitle') }}</p>
              </div>
              <a class="dash-link" :href="memorisationUrl">{{ t('dashboard.go_to_workspace') }}</a>
            </div>

            <p v-if="!data.activity?.length" class="dash-empty">
              {{ t('dashboard.activity_empty_message') }}
            </p>

            <ul v-else class="dash-list">
              <li
                v-for="(item, index) in data.activity"
                :key="`${item.type}-${item.occurred_at}-${index}`"
              >
                <a class="dash-list__row" :href="item.href || memorisationUrl">
                  <span class="dash-list__main">
                    <span class="dash-list__title">{{ activityLabel(item) }}</span>
                  </span>
                  <time class="dash-list__time" :datetime="item.occurred_at">
                    {{ formatRelative(item.occurred_at) }}
                  </time>
                </a>
              </li>
            </ul>
          </section>
        </div>
      </template>
    </div>
  </main>
</template>

<script>
import { Bar } from 'vue-chartjs'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js'
import { learningApi } from '../scripts/api/learning'
import './Dashboard.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const METRIC_META = [
  { key: 'completed_sessions', tone: 'success', labelKey: 'metric_completed' },
  { key: 'saved_sessions', tone: 'accent', labelKey: 'metric_saved' },
  { key: 'memorised_ayahs', tone: 'success', labelKey: 'metric_memorised' },
  { key: 'ai_recite_attempts', tone: 'info', labelKey: 'metric_ai_recite' },
  { key: 'notes', tone: 'neutral', labelKey: 'metric_notes' },
]

export default {
  name: 'UserDashboard',
  components: { Bar },
  props: {
    auth: { type: Object, default: () => ({}) },
    initialData: { type: Object, default: null },
  },
  data() {
    const initial = this.sanitizePayload(this.initialData)
    return {
      data: initial,
      loading: !initial,
      error: false,
      chartDays: initial?.chart?.days === 7 ? 7 : 30,
      chartReady: true,
      reduceMotion: false,
      lastSyncedAt: initial?.meta?.generated_at || null,
      syncState: initial ? 'ready' : 'loading',
      visibilityHandler: null,
      focusHandler: null,
    }
  },
  computed: {
    memorisationUrl() {
      return this.auth?.memorisation_url || '/memorisation'
    },
    ownerId() {
      return Number(this.auth?.id || 0)
    },
    greetingText() {
      const name = this.data?.welcome?.first_name
        || this.auth?.first_name
        || String(this.auth?.name || '').split(/\s+/)[0]
        || this.t('dashboard.dear_friend')
      return this.t('dashboard.greeting', { name })
    },
    continueCta() {
      const key = this.data?.continue?.cta_key
      if (key) {
        const translated = this.t(`dashboard.${key}`)
        if (translated && translated !== `dashboard.${key}`) return translated
      }
      return this.data?.continue?.cta_label || this.t('dashboard.cta_start')
    },
    continueHref() {
      const href = String(this.data?.continue?.href || '').trim()
      return href || this.memorisationUrl
    },
    snapshotCards() {
      const snap = this.data?.snapshot || {}
      return METRIC_META.map((meta) => {
        const row = snap[meta.key] || {}
        return {
          key: meta.key,
          tone: meta.tone,
          label: this.t(`dashboard.${meta.labelKey}`),
          value: Number(row.value ?? 0),
        }
      })
    },
    primaryCompletion() {
      const progress = this.data?.progress
      if (!progress) return null
      if (progress.range_completion_percent != null) {
        return { label: this.t('dashboard.range_completion'), value: progress.range_completion_percent }
      }
      if (progress.active_plan_completion_percent != null) {
        return { label: this.t('dashboard.plan_completion'), value: progress.active_plan_completion_percent }
      }
      if (progress.surah_completion_percent != null) {
        return { label: this.t('dashboard.surah_completion'), value: progress.surah_completion_percent }
      }
      return null
    },
    retentionChips() {
      const retention = this.data?.retention
      if (!retention) return []
      const chips = []
      if (retention.streak_days > 0) {
        chips.push({ key: 'streak', label: this.t('dashboard.streak', { n: retention.streak_days }) })
      }
      if (retention.incomplete_session) {
        chips.push({ key: 'incomplete', label: this.t('dashboard.incomplete_reminder') })
      }
      return chips.slice(0, 2)
    },
    chartData() {
      const points = this.data?.chart?.points || []
      return {
        labels: points.map((point) => this.shortDate(point.date)),
        datasets: [
          {
            label: this.t('dashboard.chart_ayahs'),
            data: points.map((point) => Number(point.primary || point.ayahs_memorised || 0)),
            backgroundColor: 'rgba(60, 53, 48, 0.55)',
            hoverBackgroundColor: 'rgba(60, 53, 48, 0.75)',
            borderRadius: 4,
            maxBarThickness: 12,
          },
          {
            label: this.t('dashboard.chart_sessions'),
            data: points.map((point) => Number(point.secondary || point.sessions_completed || 0)),
            backgroundColor: 'rgba(201, 184, 164, 0.85)',
            hoverBackgroundColor: 'rgba(201, 184, 164, 1)',
            borderRadius: 4,
            maxBarThickness: 12,
          },
        ],
      }
    },
    chartOptions() {
      const points = this.data?.chart?.points || []
      const muted = '#6d6258'
      const ink = '#3c3530'
      return {
        responsive: true,
        maintainAspectRatio: false,
        animation: this.reduceMotion ? false : { duration: 220, easing: 'easeOutQuart' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            labels: {
              boxWidth: 7,
              boxHeight: 7,
              color: muted,
              font: { size: 10, weight: '450' },
              padding: 8,
            },
          },
          tooltip: {
            backgroundColor: '#f7f1ea',
            titleColor: ink,
            bodyColor: muted,
            borderColor: '#e8ded1',
            borderWidth: 1,
            padding: 8,
            cornerRadius: 10,
            titleFont: { weight: '500' },
            callbacks: {
              title: (items) => points[items?.[0]?.dataIndex ?? 0]?.date || '',
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: this.chartDays === 7 ? 7 : 6,
              color: muted,
              font: { size: 10, weight: '400' },
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              color: muted,
              font: { size: 10, weight: '400' },
            },
            grid: { color: 'rgba(60, 53, 48, 0.06)' },
          },
        },
      }
    },
  },
  mounted() {
    this.reduceMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

    if (!this.data) {
      this.fetchDashboard(this.chartDays, { initial: true })
    } else {
      this.fetchDashboard(this.chartDays, { quiet: true })
    }

    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        this.fetchDashboard(this.chartDays, { quiet: true })
      }
    }
    this.focusHandler = () => this.fetchDashboard(this.chartDays, { quiet: true })
    document.addEventListener('visibilitychange', this.visibilityHandler)
    window.addEventListener('focus', this.focusHandler)
  },
  beforeUnmount() {
    if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler)
    if (this.focusHandler) window.removeEventListener('focus', this.focusHandler)
  },
  methods: {
    t(key, params) {
      if (typeof this.$t === 'function') return this.$t(key, params)
      return key
    },
    cssVar(name, fallback = '') {
      if (typeof window === 'undefined') return fallback
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
    },
    sanitizePayload(payload) {
      if (!payload || typeof payload !== 'object') return null
      const owner = Number(payload?.meta?.owner_id || 0)
      if (this.ownerId && owner && owner !== this.ownerId) return null
      return payload
    },
    activityLabel(item) {
      if (!item) return ''
      // Prefer short context (surah · range) over long sentence titles.
      if (item.context) return item.context
      return item.title || ''
    },
    ayahRangeLabel(row) {
      if (!row) return ''
      const start = Number(row.ayah_start || row.current_ayah_start || 0)
      const end = Number(row.ayah_end || row.current_ayah_end || 0)
      if (start > 0 && end > 0 && start !== end) {
        return this.t('dashboard.ayah_range', { start, end })
      }
      if (start > 0) return this.t('dashboard.ayah_n', { n: start })
      if (end > 0) return this.t('dashboard.ayah_n', { n: end })
      return ''
    },
    formatRelative(value) {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      const minutes = Math.round((Date.now() - date.getTime()) / 60000)
      if (minutes < 1) return this.t('dashboard.just_now')
      if (minutes < 60) return this.t('dashboard.minutes_ago', { n: minutes })
      const hours = Math.round(minutes / 60)
      if (hours < 24) return this.t('dashboard.hours_ago', { n: hours })
      const days = Math.round(hours / 24)
      if (days === 1) return this.t('dashboard.yesterday')
      if (days < 8) return this.t('dashboard.days_ago', { n: days })
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    },
    shortDate(value) {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return String(value)
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    },
    reload(force = false) {
      this.fetchDashboard(this.chartDays, { force })
    },
    setChartDays(days) {
      if (days === this.chartDays) return
      this.chartDays = days
      this.fetchDashboard(days)
    },
    async fetchDashboard(days = this.chartDays, options = {}) {
      const { quiet = false, initial = false, force = false } = options
      if (!quiet) {
        this.loading = true
        this.syncState = 'loading'
      }
      try {
        const payload = await learningApi.getDashboard(days)
        const sanitized = this.sanitizePayload(payload)
        if (!sanitized) throw new Error('Dashboard payload owner mismatch')
        this.data = sanitized
        this.error = false
        this.lastSyncedAt = sanitized?.meta?.generated_at || new Date().toISOString()
        this.syncState = 'ready'
        if (sanitized?.chart?.days === 7 || sanitized?.chart?.days === 30) {
          this.chartDays = sanitized.chart.days
        }
        this.chartReady = false
        this.$nextTick(() => { this.chartReady = true })
      } catch (error) {
        console.error('Dashboard fetch failed', error)
        if (initial || force || !this.data) {
          this.error = true
          this.data = null
        }
        this.syncState = 'error'
      } finally {
        this.loading = false
      }
    },
  },
}
</script>
