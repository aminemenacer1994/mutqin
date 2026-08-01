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
                <span
                  v-for="chip in retentionChips"
                  :key="chip.key"
                  class="dash-chip"
                  :class="chip.toneClass"
                >
                  <i v-if="chip.icon" :class="chip.icon" aria-hidden="true"></i>
                  {{ chip.label }}
                </span>
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

          <div class="dash-hero__actions">
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

            <a
              v-if="recommendedNext"
              class="dash-recommend"
              :href="recommendedNext.href"
            >
              <div class="dash-recommend__body">
                <span class="dash-recommend__label">{{ t('dashboard.recommended_next') }}</span>
                <span class="dash-recommend__title">{{ recommendedNext.surah_name }}</span>
                <div class="dash-pills">
                  <span v-if="ayahRangeLabel(recommendedNext)" class="dash-pill">
                    {{ t('dashboard.current_range') }}: {{ ayahRangeLabel(recommendedNext) }}
                  </span>
                  <span v-if="recommendedNext.technique_label" class="dash-pill">
                    {{ recommendedNext.technique_label }}
                  </span>
                  <span v-if="recommendedNext.speed_label" class="dash-pill">
                    {{ recommendedNext.speed_label }}
                  </span>
                </div>
              </div>
              <span class="dash-recommend__cta" :aria-label="t('dashboard.recommended_next_start')">
                <i class="bi bi-play-fill" aria-hidden="true"></i>
              </span>
            </a>
          </div>
        </header>

        <section class="dash-panel dash-reveal" aria-labelledby="dash-snapshot-heading" style="--dash-delay: 30ms">
          <div class="dash-panel__head">
            <div>
              <h2 id="dash-snapshot-heading">{{ t('dashboard.snapshot_title') }}</h2>
              <p class="dash-panel__hint">{{ t('dashboard.snapshot_subtitle') }}</p>
            </div>
          </div>
          <div class="dash-metrics">
            <component
              :is="metric.href ? 'a' : 'button'"
              v-for="metric in snapshotCards"
              :key="metric.key"
              :type="metric.href ? undefined : 'button'"
              :href="metric.href || undefined"
              class="dash-metric"
              :class="[`dash-metric--${metric.tone}`, { 'is-empty': metric.value === 0 }]"
              @click="onMetricActivate($event, metric)"
            >
              <p class="dash-metric__value">{{ metric.value }}</p>
              <p class="dash-metric__label">{{ metric.label }}</p>
            </component>
          </div>
        </section>

        <section class="dash-panel dash-reveal" aria-labelledby="dash-progress-heading" style="--dash-delay: 60ms">
          <div class="dash-panel__head">
            <div>
              <h2 id="dash-progress-heading">{{ t('dashboard.progress_title') }}</h2>
              <p class="dash-panel__hint">{{ t('dashboard.progress_subtitle') }}</p>
            </div>
          </div>

          <div class="dash-progress-grid">
            <div class="dash-position">
              <span class="dash-eyebrow">{{ t('dashboard.current_position') }}</span>
              <h3 class="dash-position__surah">
                {{ data.progress?.current_surah_name || t('dashboard.not_started') }}
              </h3>
              <div v-if="surahProgress" class="dash-surah-progress">
                <div
                  class="dash-progress-bar dash-progress-bar--inline"
                  role="progressbar"
                  :aria-valuenow="surahProgress.value"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  :aria-label="t('dashboard.surah_completion')"
                >
                  <span
                    :class="{ 'is-nonzero': surahProgress.value > 0 }"
                    :style="{ width: surahProgress.fillWidth }"
                  ></span>
                </div>
                <span class="dash-surah-progress__pct">{{ surahProgress.value }}%</span>
              </div>
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
                <div
                  v-for="stat in currentSurahStats"
                  :key="stat.key"
                  class="dash-stat"
                  :class="stat.emphasis"
                >
                  <strong>{{ stat.value }}</strong>
                  <span>{{ stat.label }}</span>
                </div>
              </div>

              <div v-if="secondaryCompletion != null" class="dash-completion">
                <div class="dash-completion__row">
                  <span>{{ secondaryCompletion.label }}</span>
                  <span>{{ secondaryCompletion.value }}%</span>
                </div>
                <div
                  class="dash-progress-bar"
                  role="progressbar"
                  :aria-valuenow="secondaryCompletion.value"
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  <span
                    :class="{ 'is-nonzero': secondaryCompletion.value > 0 }"
                    :style="{ width: secondaryCompletion.fillWidth }"
                  ></span>
                </div>
              </div>
            </div>

            <div class="dash-chart">
              <div class="dash-chart__head">
                <p class="dash-chart__label">{{ t('dashboard.activity_chart_title') }}</p>
                <div class="dash-range-toggle" role="group" :aria-label="t('dashboard.chart_range')">
                  <button
                    type="button"
                    class="dash-btn dash-btn--ghost dash-btn--sm"
                    :class="{ 'is-active': chartDays === 7 }"
                    :aria-pressed="chartDays === 7 ? 'true' : 'false'"
                    :disabled="loading"
                    @click="setChartDays(7)"
                  >
                    {{ t('dashboard.days_7') }}
                  </button>
                  <button
                    type="button"
                    class="dash-btn dash-btn--ghost dash-btn--sm"
                    :class="{ 'is-active': chartDays === 30 }"
                    :aria-pressed="chartDays === 30 ? 'true' : 'false'"
                    :disabled="loading"
                    @click="setChartDays(30)"
                  >
                    {{ t('dashboard.days_30') }}
                  </button>
                </div>
              </div>
              <div v-if="data.chart?.is_empty" class="dash-chart__empty">
                <span>{{ t('dashboard.chart_empty_message') }}</span>
              </div>
              <div v-else class="dash-chart__wrap" :class="{ 'is-loading': loading }">
                <Bar
                  v-if="chartReady"
                  :key="chartInstanceKey"
                  :data="chartData"
                  :options="chartOptions"
                  :aria-label="t('dashboard.chart_aria')"
                />
              </div>
              <p class="dash-chart__week">{{ weekSummaryText }}</p>
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
                {{ t('dashboard.view_all_reviews') }}
              </a>
            </div>

            <p v-if="!data.weaknesses?.items?.length" class="dash-empty" role="status">
              {{ t('dashboard.weak_empty_message') }}
            </p>

            <ul v-else class="dash-list">
              <li v-for="item in data.weaknesses.items" :key="item.key" class="dash-list__item">
                <div class="dash-list__row dash-list__row--static">
                  <a class="dash-list__main dash-list__main--link" :href="item.href || memorisationUrl">
                    <span class="dash-list__title-row">
                      <span class="dash-list__title">
                        {{ item.surah_name }} · {{ t('dashboard.ayah_n', { n: item.ayah_number }) }}
                      </span>
                      <span
                        v-if="item.strength"
                        class="dash-strength"
                        :class="`dash-strength--${item.strength}`"
                      >
                        {{ strengthLabel(item) }}
                      </span>
                    </span>
                    <span v-if="item.phrase" class="dash-list__phrase" lang="ar" dir="rtl">{{ item.phrase }}</span>
                  </a>
                  <div class="dash-list__actions">
                    <a
                      class="dash-btn dash-btn--ghost dash-btn--sm"
                      :href="reviewNowHref(item)"
                    >
                      {{ t('dashboard.review_now') }}
                    </a>
                    <a
                      class="dash-list__chevron"
                      :href="item.href || memorisationUrl"
                      :aria-label="t('dashboard.open')"
                    >
                      <i class="bi bi-chevron-right" aria-hidden="true"></i>
                    </a>
                  </div>
                </div>
              </li>
            </ul>
          </section>

          <section class="dash-panel" aria-labelledby="dash-activity-heading">
            <div class="dash-panel__head">
              <div>
                <h2 id="dash-activity-heading">{{ t('dashboard.activity_title') }}</h2>
                <p class="dash-panel__hint">{{ t('dashboard.activity_subtitle') }}</p>
              </div>
              <button
                type="button"
                class="dash-link"
                @click="openDrawer('activity')"
              >
                {{ t('dashboard.view_all_activity') }}
              </button>
            </div>

            <p v-if="!data.activity?.length" class="dash-empty" role="status">
              {{ t('dashboard.activity_empty_message') }}
            </p>

            <ul v-else class="dash-list">
              <li
                v-for="(item, index) in data.activity"
                :key="`${item.type}-${item.occurred_at}-${index}`"
              >
                <a class="dash-list__row" :href="item.href || memorisationUrl">
                  <span class="dash-list__main">
                    <span class="dash-list__title">{{ activityTitle(item) }}</span>
                    <span v-if="activityOutcome(item)" class="dash-list__meta">{{ activityOutcome(item) }}</span>
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

    <div
      v-if="drawerOpen"
      class="dash-drawer-root"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="drawerTitleId"
    >
      <button
        type="button"
        class="dash-drawer__backdrop"
        :aria-label="t('dashboard.drawer_close')"
        @click="closeDrawer"
      ></button>
      <aside class="dash-drawer" tabindex="-1">
        <header class="dash-drawer__head">
          <h2 :id="drawerTitleId" class="dash-drawer__title">{{ drawerTitle }}</h2>
          <button
            type="button"
            class="dash-icon-btn"
            :aria-label="t('dashboard.drawer_close')"
            @click="closeDrawer"
          >
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </header>

        <div class="dash-drawer__body">
          <div
            v-if="drawerMode === 'activity' && !drawerLoading && !drawerError"
            class="dash-drawer__filters"
            role="tablist"
            :aria-label="t('dashboard.drawer_activity_title')"
          >
            <button
              v-for="filter in activityFilters"
              :key="filter.key"
              type="button"
              role="tab"
              class="dash-drawer__filter"
              :class="{ 'is-active': activityFilter === filter.key }"
              :aria-selected="activityFilter === filter.key ? 'true' : 'false'"
              @click="activityFilter = filter.key"
            >
              {{ filter.label }}
            </button>
          </div>

          <p v-if="drawerLoading" class="dash-drawer__status">{{ t('dashboard.drawer_loading') }}</p>
          <p v-else-if="drawerError" class="dash-drawer__status" role="alert">
            {{ t('dashboard.drawer_load_error') }}
          </p>
          <p v-else-if="!visibleDrawerItems.length" class="dash-drawer__status">
            {{ drawerEmptyMessage }}
          </p>

          <ul v-else-if="drawerMode === 'activity'" class="dash-drawer__list">
            <li
              v-for="item in visibleDrawerItems"
              :key="item.id || `${item.type}-${item.occurred_at}`"
            >
              <a
                class="dash-drawer__row dash-drawer__row--link"
                :href="item.href || memorisationUrl"
              >
                <div class="dash-drawer__row-main">
                  <span class="dash-drawer__row-title">
                    <span class="dash-drawer__type">{{ activityTypeLabel(item.type) }}</span>
                    {{ activityTitle(item) }}
                  </span>
                  <span v-if="activityOutcome(item)" class="dash-drawer__row-meta">{{ activityOutcome(item) }}</span>
                </div>
                <time class="dash-drawer__row-time" :datetime="item.occurred_at">
                  {{ formatActivityDate(item.occurred_at) }}
                </time>
              </a>
            </li>
          </ul>

          <ul v-else-if="drawerMode === 'sessions'" class="dash-drawer__list">
            <li v-for="item in visibleDrawerItems" :key="`session-${item.id}`" class="dash-drawer__row">
              <div class="dash-drawer__row-main">
                <span class="dash-drawer__row-title">
                  {{ item.surah_name || t('dashboard.not_started') }}
                  <template v-if="formatItemRange(item)"> · {{ formatItemRange(item) }}</template>
                </span>
                <span class="dash-drawer__row-meta">{{ sessionStatusLabel(item.status) }}</span>
              </div>
              <time class="dash-drawer__row-time" :datetime="item.occurred_at">
                {{ formatActivityDate(item.occurred_at) }}
              </time>
            </li>
          </ul>

          <ul v-else-if="drawerMode === 'ai_checks'" class="dash-drawer__list">
            <li v-for="item in visibleDrawerItems" :key="`ai-${item.id}`" class="dash-drawer__row">
              <div class="dash-drawer__row-main">
                <span class="dash-drawer__row-title">
                  {{ item.surah_name || t('dashboard.not_started') }}
                  <template v-if="formatItemRange(item)"> · {{ formatItemRange(item) }}</template>
                </span>
                <span class="dash-drawer__row-meta">{{ aiResultLabel(item) }}</span>
              </div>
              <time class="dash-drawer__row-time" :datetime="item.occurred_at">
                {{ formatActivityDate(item.occurred_at) }}
              </time>
            </li>
          </ul>

          <ul v-else-if="drawerMode === 'notes'" class="dash-drawer__list">
            <li v-for="item in visibleDrawerItems" :key="`note-${item.id}`" class="dash-drawer__row">
              <div class="dash-drawer__row-main">
                <span class="dash-drawer__row-title">
                  {{ noteHeading(item) }}
                </span>
                <span v-if="noteSnippet(item)" class="dash-drawer__row-meta">{{ noteSnippet(item) }}</span>
              </div>
              <time class="dash-drawer__row-time" :datetime="item.updated_at || item.created_at">
                {{ formatActivityDate(item.updated_at || item.created_at) }}
              </time>
            </li>
          </ul>

          <ul v-else-if="drawerMode === 'hifz'" class="dash-drawer__list">
            <li v-for="group in visibleDrawerItems" :key="`hifz-${group.surah_number}`" class="dash-drawer__group">
              <div class="dash-drawer__group-head">
                <span class="dash-drawer__row-title">{{ group.surah_name }}</span>
                <span class="dash-drawer__row-meta">
                  {{ t('dashboard.drawer_hifz_memorised', { n: group.memorised_count }) }}
                  · {{ t('dashboard.drawer_hifz_in_progress', { n: group.learning_count }) }}
                </span>
              </div>
              <p v-if="group.memorised_ayahs.length" class="dash-drawer__ayahs">
                {{ group.memorised_ayahs.map((n) => t('dashboard.ayah_n', { n })).join(' · ') }}
              </p>
            </li>
          </ul>
        </div>
      </aside>
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
  { key: 'completed_sessions', tone: 'success', labelKey: 'metric_completed', drawer: 'sessions' },
  { key: 'saved_sessions', tone: 'accent', labelKey: 'metric_saved', hrefPanel: 'saved' },
  { key: 'memorised_ayahs', tone: 'success', labelKey: 'metric_memorised', drawer: 'hifz' },
  { key: 'ai_recite_attempts', tone: 'info', labelKey: 'metric_ai_recite', drawer: 'ai_checks' },
  { key: 'notes', tone: 'neutral', labelKey: 'metric_notes', drawer: 'notes' },
]

const DRAWER_TITLES = {
  activity: 'drawer_activity_title',
  sessions: 'drawer_sessions_title',
  ai_checks: 'drawer_ai_title',
  notes: 'drawer_notes_title',
  hifz: 'drawer_hifz_title',
}

const DRAWER_EMPTY = {
  activity: 'drawer_activity_empty',
  sessions: 'drawer_sessions_empty',
  ai_checks: 'drawer_ai_empty',
  notes: 'drawer_notes_empty',
  hifz: 'drawer_hifz_empty',
}

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
      escapeHandler: null,
      drawerMode: null,
      drawerItems: [],
      drawerLoading: false,
      drawerError: false,
      drawerRequestId: 0,
      dashboardRequestId: 0,
      activityFilter: 'all',
      darkTheme: false,
      themeObserver: null,
    }
  },
  computed: {
    memorisationUrl() {
      return this.auth?.memorisation_url || '/memorisation'
    },
    savedSessionsHref() {
      const base = this.memorisationUrl.split('?')[0]
      return `${base}?panel=saved`
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
    recommendedNext() {
      const next = this.data?.recommended_next
      if (!next || !next.surah_number || !next.ayah_start || !next.href) return null
      return next
    },
    snapshotCards() {
      const snap = this.data?.snapshot || {}
      return METRIC_META.map((meta) => {
        const row = snap[meta.key] || {}
        const value = Number(row.value ?? 0)
        let labelKey = meta.labelKey
        if (meta.key === 'memorised_ayahs' && value === 0) {
          labelKey = 'metric_completed_ayahs'
        }
        return {
          key: meta.key,
          tone: meta.tone,
          label: this.t(`dashboard.${labelKey}`),
          value,
          drawer: meta.drawer || null,
          href: meta.hrefPanel === 'saved' ? this.savedSessionsHref : null,
        }
      })
    },
    currentSurahStats() {
      const memorised = Number(this.data?.progress?.memorised_ayah_count ?? 0)
      const learning = Number(this.data?.progress?.learning_ayah_count ?? 0)
      const promoteLearning = memorised === 0 && learning > 0

      const memorisedStat = {
        key: 'memorised',
        value: memorised,
        label: memorised === 0
          ? this.t('dashboard.completed_count')
          : this.t('dashboard.memorised_count'),
        emphasis: promoteLearning ? 'dash-stat--secondary' : 'dash-stat--primary',
      }
      const learningStat = {
        key: 'learning',
        value: learning,
        label: this.t('dashboard.in_progress_count'),
        emphasis: promoteLearning ? 'dash-stat--primary' : 'dash-stat--secondary',
      }

      return promoteLearning ? [learningStat, memorisedStat] : [memorisedStat, learningStat]
    },
    surahProgress() {
      const progress = this.data?.progress
      if (!progress?.current_surah_number) return null
      const total = Number(progress.surah_ayah_count || 0)
      if (total <= 0) return null
      const practised = Number(
        progress.surah_practised_ayah_count
        ?? ((progress.memorised_ayah_count || 0) + (progress.learning_ayah_count || 0))
      )
      const raw = (Math.max(0, practised) / total) * 100
      // Keep 1–5% fills readable: never round a non-zero practised count down to 0%.
      const value = practised <= 0 ? 0 : Math.max(1, Math.min(100, Math.round(raw)))
      const fill = practised <= 0 ? 0 : Math.max(value, 2)
      return {
        value,
        practised,
        total,
        fillWidth: fill > 0 ? `${fill}%` : '0%',
      }
    },
    secondaryCompletion() {
      // Range/plan bars stay below; surah progress lives under the surah name.
      const progress = this.data?.progress
      if (!progress) return null
      if (progress.range_completion_percent != null) {
        return this.completionBar(this.t('dashboard.range_completion'), progress.range_completion_percent)
      }
      if (progress.active_plan_completion_percent != null) {
        return this.completionBar(this.t('dashboard.plan_completion'), progress.active_plan_completion_percent)
      }
      return null
    },
    retentionChips() {
      const retention = this.data?.retention
      if (!retention) return []
      const chips = []
      const streakDays = Number(retention.streak_days || 0)
      if (streakDays > 0) {
        const label = streakDays === 1
          ? this.t('dashboard.streak_keep_going')
          : this.t('dashboard.streak', { n: streakDays })
        chips.push({
          key: 'streak',
          label,
          icon: 'bi bi-fire',
          toneClass: streakDays >= 7 ? 'dash-chip--streak-strong' : 'dash-chip--streak',
        })
      } else if (retention.streak_broken || retention.streak_has_history) {
        chips.push({
          key: 'streak_restart',
          label: this.t('dashboard.streak_restart'),
          icon: null,
          toneClass: 'dash-chip--streak-soft',
        })
      }
      if (retention.incomplete_session) {
        chips.push({
          key: 'incomplete',
          label: this.t('dashboard.incomplete_reminder'),
          icon: null,
          toneClass: '',
        })
      }
      return chips.slice(0, 2)
    },
    chartPalette() {
      // Warm terracotta (ayahs) + muted green (sessions); brighter in dark mode for legend contrast.
      if (this.darkTheme) {
        return {
          ayahs: '#D48462',
          ayahsHover: '#E09878',
          sessions: '#7AAB86',
          sessionsHover: '#8FBC99',
          muted: '#c9b8a8',
          ink: '#f0e7dc',
          tooltipBg: '#221e1a',
          tooltipBorder: 'rgba(240, 231, 220, 0.16)',
          grid: 'rgba(240, 231, 220, 0.08)',
        }
      }
      return {
        ayahs: '#C46B4A',
        ayahsHover: '#B25A3A',
        sessions: '#5F8F6B',
        sessionsHover: '#4E7A59',
        muted: '#6d6258',
        ink: '#3c3530',
        tooltipBg: '#f7f1ea',
        tooltipBorder: '#e8ded1',
        grid: 'rgba(60, 53, 48, 0.06)',
      }
    },
    chartInstanceKey() {
      const points = this.data?.chart?.points || []
      const first = points[0]?.date || 'none'
      const last = points[points.length - 1]?.date || 'none'
      return `chart-${this.chartDays}-${points.length}-${first}-${last}`
    },
    chartData() {
      const points = this.data?.chart?.points || []
      const palette = this.chartPalette
      return {
        labels: points.map((point) => this.shortDate(point.date)),
        datasets: [
          {
            label: this.t('dashboard.chart_ayahs'),
            data: points.map((point) => Number(point.primary || point.ayahs_memorised || 0)),
            backgroundColor: palette.ayahs,
            hoverBackgroundColor: palette.ayahsHover,
            borderRadius: 4,
            maxBarThickness: 12,
          },
          {
            label: this.t('dashboard.chart_sessions'),
            data: points.map((point) => Number(point.secondary || point.sessions_completed || 0)),
            backgroundColor: palette.sessions,
            hoverBackgroundColor: palette.sessionsHover,
            borderRadius: 4,
            maxBarThickness: 12,
          },
        ],
      }
    },
    chartOptions() {
      const points = this.data?.chart?.points || []
      const palette = this.chartPalette
      return {
        responsive: true,
        maintainAspectRatio: false,
        animation: this.reduceMotion ? false : { duration: 220, easing: 'easeOutQuart' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              color: palette.ink,
              font: { size: 11, weight: '500' },
              padding: 10,
              usePointStyle: true,
              pointStyle: 'rectRounded',
            },
          },
          tooltip: {
            backgroundColor: palette.tooltipBg,
            titleColor: palette.ink,
            bodyColor: palette.ink,
            borderColor: palette.tooltipBorder,
            borderWidth: 1,
            padding: 10,
            cornerRadius: 10,
            displayColors: false,
            titleFont: { weight: '500', size: 12 },
            filter: (item) => item.datasetIndex === 0,
            callbacks: {
              title: (items) => {
                const index = items?.[0]?.dataIndex ?? 0
                const point = points[index] || {}
                const ayahs = Number(point.primary ?? point.ayahs_memorised ?? 0)
                const sessions = Number(point.secondary ?? point.sessions_completed ?? 0)
                return this.t('dashboard.chart_tooltip', {
                  date: this.tooltipDate(point.date),
                  ayahs,
                  sessions,
                })
              },
              label: () => null,
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
              color: palette.muted,
              font: { size: 10, weight: '400' },
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              color: palette.muted,
              font: { size: 10, weight: '400' },
            },
            grid: { color: palette.grid },
          },
        },
      }
    },
    drawerOpen() {
      return !!this.drawerMode
    },
    drawerTitleId() {
      return 'dash-drawer-title'
    },
    drawerTitle() {
      const key = DRAWER_TITLES[this.drawerMode]
      return key ? this.t(`dashboard.${key}`) : ''
    },
    drawerEmptyMessage() {
      if (
        this.drawerMode === 'activity'
        && this.activityFilter !== 'all'
        && this.drawerItems.length
        && !this.visibleDrawerItems.length
      ) {
        return this.t('dashboard.activity_filter_empty')
      }
      const key = DRAWER_EMPTY[this.drawerMode]
      return key ? this.t(`dashboard.${key}`) : ''
    },
    activityFilters() {
      return [
        { key: 'all', label: this.t('dashboard.activity_filter_all') },
        { key: 'session', label: this.t('dashboard.activity_filter_sessions') },
        { key: 'ai_check', label: this.t('dashboard.activity_filter_ai') },
        { key: 'note', label: this.t('dashboard.activity_filter_notes') },
      ]
    },
    visibleDrawerItems() {
      if (this.drawerMode !== 'activity' || this.activityFilter === 'all') {
        return this.drawerItems
      }
      return this.drawerItems.filter((item) => {
        const type = String(item?.type || '').toLowerCase()
        if (this.activityFilter === 'session') {
          return type === 'session' || type.startsWith('session_')
        }
        if (this.activityFilter === 'ai_check') {
          return type === 'ai_check' || type === 'ai_recite'
        }
        if (this.activityFilter === 'note') return type === 'note'
        return true
      })
    },
    weekSummaryText() {
      const week = this.data?.week_summary
      if (!week || week.is_empty) {
        return this.t('dashboard.week_summary_empty')
      }
      return this.t('dashboard.week_summary', {
        sessions: Number(week.sessions || 0),
        ai_checks: Number(week.ai_checks || 0),
        ayahs: Number(week.ayahs_practised || 0),
      })
    },
  },
  mounted() {
    this.reduceMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    this.syncTheme()
    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
      this.themeObserver = new MutationObserver(() => {
        this.syncTheme()
        this.chartReady = false
        this.$nextTick(() => { this.chartReady = true })
      })
      this.themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'class'],
      })
    }

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
    this.escapeHandler = (event) => {
      if (event.key === 'Escape' && this.drawerOpen) this.closeDrawer()
    }
    document.addEventListener('visibilitychange', this.visibilityHandler)
    window.addEventListener('focus', this.focusHandler)
    document.addEventListener('keydown', this.escapeHandler)
  },
  beforeUnmount() {
    if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler)
    if (this.focusHandler) window.removeEventListener('focus', this.focusHandler)
    if (this.escapeHandler) document.removeEventListener('keydown', this.escapeHandler)
    if (this.themeObserver) this.themeObserver.disconnect()
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
    activityTitle(item) {
      if (!item) return ''
      const type = String(item.type || '').toLowerCase()
      const name = item.surah_name
        || (type.startsWith('session') ? this.t('dashboard.activity_type_session') : '')
        || (type === 'ai_check' || type === 'ai_recite' ? this.t('dashboard.activity_type_ai_check') : '')
        || (type === 'note' ? this.t('dashboard.activity_type_note') : '')
        || (type === 'assessment' ? this.t('dashboard.activity_type_assessment') : '')
        || (type === 'recommendation' ? this.t('dashboard.activity_type_recommendation') : '')
        || (type === 'ayah_memorised' ? this.t('dashboard.activity_type_memorised') : '')
      const range = this.formatItemRange(item)
      if (name && range) return `${name} · ${range}`
      if (name) return name
      if (range) return range
      return item.title || item.context || ''
    },
    activityOutcome(item) {
      if (!item) return ''
      const key = String(item.outcome_key || '').toLowerCase()
      const params = item.outcome_params && typeof item.outcome_params === 'object'
        ? item.outcome_params
        : {}

      if (key === 'session_completed') return this.t('dashboard.drawer_status_completed')
      if (key === 'session_ended_early') return this.t('dashboard.drawer_status_ended_early')
      if (key === 'session_saved') return this.t('dashboard.activity_outcome_saved')
      if (key === 'session_resumed') return this.t('dashboard.activity_outcome_resumed')
      if (key === 'ai_result') {
        const band = String(params.band || '').toLowerCase()
        let bandLabel = ''
        if (band === 'strong') bandLabel = this.t('dashboard.drawer_result_strong')
        else if (band === 'mixed') bandLabel = this.t('dashboard.drawer_result_mixed')
        else if (band === 'weak') bandLabel = this.t('dashboard.drawer_result_weak')
        const parts = []
        if (bandLabel) parts.push(bandLabel)
        if (params.accuracy != null && params.accuracy !== '') {
          parts.push(this.t('dashboard.drawer_accuracy', { n: Number(params.accuracy) }))
        }
        return parts.join(' · ') || this.t('dashboard.activity_type_ai_check')
      }
      if (key === 'ai_check') return this.t('dashboard.activity_type_ai_check')
      if (key === 'note_body') return String(params.body || item.outcome || '')
      if (key === 'note_saved') return this.t('dashboard.activity_note_saved')
      if (key === 'assessment_completed') return this.t('dashboard.activity_outcome_assessment')
      if (key === 'recommendation_ready') return this.t('dashboard.activity_outcome_recommendation')
      if (key === 'ayah_memorised') return this.t('dashboard.activity_outcome_memorised')
      return item.outcome || ''
    },
    activityTypeLabel(type) {
      const key = String(type || '').toLowerCase()
      if (key === 'session' || key.startsWith('session_')) return this.t('dashboard.activity_type_session')
      if (key === 'ai_check' || key === 'ai_recite') return this.t('dashboard.activity_type_ai_check')
      if (key === 'note') return this.t('dashboard.activity_type_note')
      if (key === 'assessment') return this.t('dashboard.activity_type_assessment')
      if (key === 'recommendation') return this.t('dashboard.activity_type_recommendation')
      if (key === 'ayah_memorised') return this.t('dashboard.activity_type_memorised')
      return ''
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
    formatItemRange(item) {
      return this.ayahRangeLabel({
        ayah_start: item?.ayah_start,
        ayah_end: item?.ayah_end,
      })
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
      return this.formatAbsoluteDate(date)
    },
    formatAbsoluteDate(value) {
      const date = value instanceof Date ? value : new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      const locale = this.$i18n?.locale?.value || this.$i18n?.locale || undefined
      const sameYear = date.getFullYear() === new Date().getFullYear()
      return date.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        ...(sameYear ? {} : { year: 'numeric' }),
      })
    },
    formatActivityDate(value) {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      const days = Math.round((Date.now() - date.getTime()) / 86400000)
      if (days < 8) return this.formatRelative(value)
      return this.formatAbsoluteDate(date)
    },
    shortDate(value) {
      if (!value) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return String(value)
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    },
    tooltipDate(value) {
      if (!value) return ''
      const date = new Date(`${value}T12:00:00`)
      if (Number.isNaN(date.getTime())) return this.shortDate(value)
      return date.toLocaleDateString([], { day: 'numeric', month: 'short' })
    },
    syncTheme() {
      if (typeof document === 'undefined') {
        this.darkTheme = false
        return
      }
      this.darkTheme = document.documentElement.getAttribute('data-theme') === 'dark'
    },
    reviewNowHref(item) {
      const surah = Number(item?.surah_number || 0)
      const ayah = Number(item?.ayah_number || 0)
      const base = this.memorisationUrl.split('?')[0]
      if (!(surah > 0 && ayah > 0)) return item?.href || base
      const params = new URLSearchParams({
        ai_check: '1',
        surah: String(surah),
        ayah: String(ayah),
        from: String(ayah),
        to: String(ayah),
        return: 'dashboard',
      })
      return `${base}?${params.toString()}`
    },
    strengthLabel(item) {
      const key = String(item?.strength || '').toLowerCase()
      if (key === 'fragile') return this.t('dashboard.strength_fragile')
      if (key === 'building') return this.t('dashboard.strength_building')
      if (key === 'strong') return this.t('dashboard.strength_strong')
      return item?.strength_label || ''
    },
    completionBar(label, value) {
      const pct = Math.max(0, Math.min(100, Number(value) || 0))
      const fill = pct > 0 ? Math.max(pct, 2) : 0
      return {
        label,
        value: pct,
        fillWidth: fill > 0 ? `${fill}%` : '0%',
      }
    },
    sessionStatusLabel(status) {
      if (status === 'ended_early') return this.t('dashboard.drawer_status_ended_early')
      return this.t('dashboard.drawer_status_completed')
    },
    aiResultLabel(item) {
      const band = String(item?.band || '').toLowerCase()
      let bandLabel = ''
      if (band === 'strong') bandLabel = this.t('dashboard.drawer_result_strong')
      else if (band === 'mixed') bandLabel = this.t('dashboard.drawer_result_mixed')
      else if (band === 'weak') bandLabel = this.t('dashboard.drawer_result_weak')
      else bandLabel = band ? band.charAt(0).toUpperCase() + band.slice(1) : ''

      const accuracy = Number(item?.accuracy_percent)
      if (Number.isFinite(accuracy) && accuracy >= 0) {
        const pct = this.t('dashboard.drawer_accuracy', { n: accuracy })
        return bandLabel ? `${bandLabel} · ${pct}` : pct
      }
      return bandLabel || '—'
    },
    noteHeading(item) {
      const surah = Number(item?.surah_number || 0)
      const ayah = Number(item?.ayah_number || 0)
      const ref = surah > 0 && ayah > 0 ? `${surah}:${ayah}` : ''
      const title = String(item?.title || '').trim()
      if (title && ref) return `${ref} · ${title}`
      if (title) return title
      return ref || this.t('dashboard.metric_notes')
    },
    noteSnippet(item) {
      const body = String(item?.body || '').replace(/\s+/g, ' ').trim()
      if (!body) return ''
      return body.length > 96 ? `${body.slice(0, 96)}…` : body
    },
    onMetricActivate(event, metric) {
      if (metric?.href) return
      event?.preventDefault?.()
      if (metric?.drawer) this.openDrawer(metric.drawer)
    },
    async openDrawer(mode) {
      if (!mode) return
      this.drawerMode = mode
      this.drawerItems = []
      this.drawerError = false
      this.drawerLoading = true
      this.activityFilter = 'all'
      const requestId = ++this.drawerRequestId
      try {
        let items = []
        if (mode === 'activity') {
          items = await learningApi.getActivityLog()
        } else if (mode === 'sessions') {
          items = await learningApi.getSessionHistory()
        } else if (mode === 'ai_checks') {
          items = await learningApi.getAiReciteAttempts()
        } else if (mode === 'notes') {
          items = await learningApi.getAyahNotes()
        } else if (mode === 'hifz') {
          const progress = await learningApi.getProgress()
          items = this.groupHifzProgress(progress)
        }
        if (requestId !== this.drawerRequestId) return
        this.drawerItems = Array.isArray(items) ? items : []
      } catch (error) {
        console.error('Dashboard drawer fetch failed', error)
        if (requestId !== this.drawerRequestId) return
        this.drawerError = true
        this.drawerItems = []
      } finally {
        if (requestId === this.drawerRequestId) this.drawerLoading = false
      }
    },
    closeDrawer() {
      this.drawerRequestId += 1
      this.drawerMode = null
      this.drawerItems = []
      this.drawerLoading = false
      this.drawerError = false
      this.activityFilter = 'all'
    },
    groupHifzProgress(rows) {
      const list = Array.isArray(rows) ? rows : []
      const groups = new Map()
      list.forEach((row) => {
        const surah = Number(row?.surah_number || 0)
        const ayah = Number(row?.ayah_number || 0)
        if (surah <= 0 || ayah <= 0) return
        const status = String(row?.status || '').toLowerCase()
        if (!groups.has(surah)) {
          groups.set(surah, {
            surah_number: surah,
            surah_name: row?.surah_name || `Surah ${surah}`,
            memorised_count: 0,
            learning_count: 0,
            memorised_ayahs: [],
          })
        }
        const group = groups.get(surah)
        if (status === 'memorised' || status === 'mastered') {
          group.memorised_count += 1
          group.memorised_ayahs.push(ayah)
        } else if (status === 'learning' || status === 'reviewing') {
          group.learning_count += 1
        }
      })

      return Array.from(groups.values())
        .map((group) => ({
          ...group,
          memorised_ayahs: group.memorised_ayahs.sort((a, b) => a - b),
        }))
        .sort((a, b) => a.surah_number - b.surah_number)
    },
    reload(force = false) {
      this.fetchDashboard(this.chartDays, { force })
    },
    setChartDays(days) {
      const next = days === 7 ? 7 : 30
      if (next === this.chartDays && this.data?.chart?.days === next && !this.loading) return
      this.chartDays = next
      this.chartReady = false
      this.fetchDashboard(next)
    },
    async fetchDashboard(days = this.chartDays, options = {}) {
      const { quiet = false, initial = false, force = false } = options
      const safeDays = days === 7 ? 7 : 30
      const requestId = ++this.dashboardRequestId
      if (!quiet) {
        this.loading = true
        this.syncState = 'loading'
      }
      try {
        const payload = await learningApi.getDashboard(safeDays)
        if (requestId !== this.dashboardRequestId) return
        const sanitized = this.sanitizePayload(payload)
        if (!sanitized) throw new Error('Dashboard payload owner mismatch')
        this.data = sanitized
        this.error = false
        this.lastSyncedAt = sanitized?.meta?.generated_at || new Date().toISOString()
        this.syncState = 'ready'
        if (sanitized?.chart?.days === 7 || sanitized?.chart?.days === 30) {
          this.chartDays = sanitized.chart.days
        } else {
          this.chartDays = safeDays
        }
        // Remount Chart.js so labels/datasets fully refresh for the new range.
        this.chartReady = false
        await this.$nextTick()
        if (requestId === this.dashboardRequestId) {
          this.chartReady = true
        }
      } catch (error) {
        console.error('Dashboard fetch failed', error)
        if (requestId !== this.dashboardRequestId) return
        if (initial || force || !this.data) {
          this.error = true
          this.data = null
        }
        this.syncState = 'error'
        this.chartReady = true
      } finally {
        if (requestId === this.dashboardRequestId) {
          this.loading = false
        }
      }
    },
  },
}
</script>
