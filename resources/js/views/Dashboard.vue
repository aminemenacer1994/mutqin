<template>
  <main id="mainContent" class="user-dashboard" tabindex="-1">
    <div class="container user-dashboard__shell">
      <div v-if="loading && !data" class="user-dashboard__loading" role="status" aria-live="polite">
        <div class="dash-spinner" aria-hidden="true"></div>
        <span>{{ t('dashboard.loading') }}</span>
      </div>

      <NetworkFallback
        v-else-if="error && !data"
        class="user-dashboard__error"
        page
        :kind="failureKind"
        :auto-retry-on-reconnect="false"
        home-href="/"
        @retry="reload(true)"
      />

      <NetworkFallback
        v-else-if="!data"
        class="user-dashboard__error"
        page
        kind="failure"
        :title="t('common.status.emptyTitle')"
        :description="t('common.status.emptyDesc')"
        home-href="/"
        @retry="reload(true)"
      />

      <template v-else>
        <header class="dash-hero dash-section dash-reveal">
          <div class="dash-hero__top">
            <div class="dash-hero__greeting">
              <span class="dash-kicker">{{ t('dashboard.journey_kicker') }}</span>
              <h1 id="dash-welcome-heading">{{ greetingText }}</h1>
              <p v-if="showHeroHint" class="dash-hero__intro">{{ t('dashboard.hero_section_hint') }}</p>
              <div v-if="retentionChips.length" class="dash-hero__chips">
                <span
                  v-for="chip in retentionChips"
                  :key="chip.key"
                  class="dash-chip"
                  :class="chip.toneClass"
                >
                  <i v-if="chip.icon" :class="chip.icon" aria-hidden="true"></i>
                  {{ chip.label }}
                </span>
              </div>
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

          <div class="dash-hero__stack">
            <div
              v-if="liveReturnSession"
              class="dash-return-session"
              role="region"
              :aria-label="t('dashboard.return_session_aria')"
            >
              <div>
                <span class="dash-return-session__label">{{ t('dashboard.return_session_label') }}</span>
                <strong class="dash-return-session__title">
                  {{ liveReturnSession.surah_name || t('dashboard.start_session') }}
                </strong>
                <div class="dash-pills">
                  <span v-if="ayahRangeLabel(liveReturnSession)" class="dash-pill">
                    {{ ayahRangeLabel(liveReturnSession) }}
                  </span>
                  <span v-if="liveReturnSession.last_ayah" class="dash-pill">
                    {{ t('dashboard.last_ayah', { n: liveReturnSession.last_ayah }) }}
                  </span>
                </div>
              </div>
              <a class="dash-btn dash-btn--primary dash-return-session__go" :href="journeyContinueHref">
                <i class="bi bi-play-fill" aria-hidden="true"></i>
                {{ t('dashboard.return_session_now') }}
              </a>
            </div>

            <section
              v-else-if="showJourneyStart"
              class="dash-journey dash-journey--start"
              aria-labelledby="dash-journey-start-title"
            >
              <h2 id="dash-journey-start-title" class="dash-journey__title">
                {{ t('dashboard.journey_start_title') }}
              </h2>
              <p class="dash-journey__hint">{{ t('dashboard.journey_start_hint') }}</p>
              <div class="dash-journey__start-actions">
                <a class="dash-btn dash-btn--primary" :href="startBeginningHref">
                  {{ t('dashboard.journey_start_beginning') }}
                </a>
                <a class="dash-btn dash-btn--ghost" :href="chooseStartHref">
                  {{ t('dashboard.journey_choose_start') }}
                </a>
              </div>
            </section>

            <template v-else>
              <a
                v-if="primaryJourneyAction"
                class="dash-action-card dash-action-card--pulse"
                :href="primaryJourneyAction.href"
              >
                <div class="dash-action-card__main">
                  <span class="dash-action-card__label">{{ primaryJourneyAction.label }}</span>
                  <span class="dash-action-card__title">
                    {{ primaryJourneyAction.title }}
                  </span>
                  <p v-if="primaryJourneyAction.meta" class="dash-action-card__meta">{{ primaryJourneyAction.meta }}</p>
                </div>
                <span class="dash-action-card__cta">{{ primaryJourneyAction.cta }}</span>
              </a>

              <a
                v-if="secondaryJourneyAction"
                class="dash-action-card dash-action-card--secondary"
                :href="secondaryJourneyAction.href"
              >
                <div class="dash-action-card__main">
                  <span class="dash-action-card__label">{{ secondaryJourneyAction.label }}</span>
                  <span class="dash-action-card__title">
                    {{ secondaryJourneyAction.title }}
                  </span>
                  <p v-if="secondaryJourneyAction.meta" class="dash-action-card__meta">{{ secondaryJourneyAction.meta }}</p>
                </div>
                <span class="dash-action-card__cta">{{ secondaryJourneyAction.cta }}</span>
              </a>

              <section
                v-if="showJourneyOverall"
                class="dash-journey-overall"
                aria-labelledby="dash-overall-heading"
              >
                <div class="dash-journey-overall__head">
                  <span id="dash-overall-heading" class="dash-kicker">
                    {{ t('dashboard.journey_overall_label') }}
                  </span>
                  <strong>
                    <DashAnimatedNumber :value="journeyOverallPercent" :reduce-motion="reduceMotion" />%
                  </strong>
                </div>
                <div
                  class="dash-progress-bar"
                  role="progressbar"
                  :aria-valuenow="journeyOverallPercent"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  :aria-label="t('dashboard.journey_overall_label')"
                >
                  <span
                    :class="{ 'is-nonzero': journeyOverallPercent > 0 }"
                    :style="{ width: journeyOverallFill }"
                  ></span>
                </div>
                <p class="dash-journey-overall__meta">
                  {{ t('dashboard.journey_overall_ayahs', { n: journeyMemorisedCount }) }}
                </p>
              </section>
            </template>
          </div>
        </header>

        <section
          v-if="murajaahPreview.length || showMurajaahEmpty"
          class="dash-section dash-reveal"
          aria-labelledby="dash-murajaah-heading"
          style="--dash-delay: 10ms"
        >
          <div class="dash-murajaah-block">
            <div class="dash-murajaah-block__head">
              <div>
                <h2 id="dash-murajaah-heading" class="dash-murajaah-block__title">
                  {{ t('dashboard.strengthen_title') }}
                </h2>
                <p class="dash-murajaah-block__hint">
                  {{ murajaahSectionHint }}
                </p>
              </div>
              <button
                v-if="showMurajaahViewAll"
                type="button"
                class="dash-link"
                @click="openDrawer('murajaah')"
              >
                {{ t('dashboard.view_all_reviews') }}
              </button>
            </div>

            <div v-if="showMurajaahEmpty" class="dash-murajaah-block__empty">
              <p>{{ t('dashboard.weak_empty_message') }}</p>
            </div>

            <ul v-else class="dash-murajaah-list">
              <li v-for="(item, index) in murajaahPreview" :key="item.key">
                <div class="dash-murajaah-row dash-reveal" :style="{ '--dash-delay': `${index * 50}ms` }">
                  <a class="dash-murajaah-row__info" :href="item.href || memorisationUrl">
                    <span class="dash-murajaah-row__title">
                      {{ item.surah_name }} · {{ t('dashboard.ayah_n', { n: item.ayah_number }) }}
                      <span
                        v-if="item.strength"
                        class="dash-strength dash-strength--compact"
                        :class="`dash-strength--${item.strength}`"
                      >
                        {{ strengthLabel(item) }}
                      </span>
                    </span>
                  </a>
                  <span
                    v-if="item.phrase"
                    class="dash-murajaah-row__phrase"
                    lang="ar"
                    dir="rtl"
                  >{{ item.phrase }}</span>
                  <span v-else class="dash-murajaah-row__phrase" aria-hidden="true"></span>
                  <a class="dash-btn dash-btn--ghost dash-btn--sm" :href="reviewNowHref(item)">
                    {{ t('dashboard.review_now') }}
                  </a>
                </div>
              </li>
            </ul>
          </div>
        </section>

        <section class="dash-section dash-reveal" aria-labelledby="dash-data-heading" style="--dash-delay: 20ms">
          <div class="dash-section__head">
            <div>
              <h2 id="dash-data-heading">{{ t('dashboard.journey_data_title') }}</h2>
              <p class="dash-section__hint">{{ t('dashboard.journey_data_subtitle') }}</p>
            </div>
          </div>
          <div class="dash-section__body">
            <div class="dash-metrics">
              <component
                :is="metric.href ? 'a' : 'button'"
                v-for="(metric, index) in snapshotCards"
                :key="metric.key"
                :type="metric.href ? undefined : 'button'"
                :href="metric.href || undefined"
                class="dash-metric dash-reveal"
                :class="{ 'is-empty': metric.value === 0 }"
                :style="{ '--dash-delay': `${index * 55}ms` }"
                :aria-label="`${metric.value} ${metric.label}. ${metric.hint}`"
                @click="onMetricActivate($event, metric)"
              >
                <div class="dash-metric__row">
                  <p class="dash-metric__value">
                    <DashAnimatedNumber :value="metric.value" :reduce-motion="reduceMotion" />
                  </p>
                  <i class="dash-metric__icon" :class="metric.icon" aria-hidden="true"></i>
                </div>
                <p class="dash-metric__label">{{ metric.label }}</p>
                <p class="dash-metric__hint">{{ metric.hint }}</p>
                <p v-if="metric.deltaLabel" class="dash-metric__delta">{{ metric.deltaLabel }}</p>
                <span class="dash-metric__tap" aria-hidden="true">{{ t('dashboard.metric_tap') }}</span>
              </component>
            </div>
            <div class="dash-data-links">
              <button type="button" class="dash-link" @click="openDrawer('hifz')">
                <i class="bi bi-stars" aria-hidden="true"></i>
                {{ t('dashboard.view_memorised_ayahs') }}
              </button>
              <button type="button" class="dash-link" @click="openDrawer('activity')">
                <i class="bi bi-clock-history" aria-hidden="true"></i>
                {{ t('dashboard.view_all_activity') }}
              </button>
              <button
                v-if="murajaahTotal > 0"
                type="button"
                class="dash-link"
                @click="openDrawer('murajaah')"
              >
                <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
                {{ t('dashboard.view_all_reviews') }}
              </button>
              <a class="dash-link" :href="savedSessionsHref">
                <i class="bi bi-bookmark" aria-hidden="true"></i>
                {{ t('dashboard.view_saved_sessions') }}
              </a>
            </div>
          </div>
        </section>

        <section class="dash-section dash-reveal" aria-labelledby="dash-progress-heading" style="--dash-delay: 40ms">
          <div class="dash-section__head">
            <div>
              <h2 id="dash-progress-heading">{{ t('dashboard.progress_title') }}</h2>
              <p class="dash-section__hint">{{ progressSubtitle }}</p>
            </div>
          </div>
          <div class="dash-section__body">
            <div class="dash-analytics" role="list" :aria-label="t('dashboard.snapshot_title')">
              <button
                v-for="(item, index) in simpleAnalytics"
                :key="item.key"
                type="button"
                class="dash-analytic dash-reveal"
                :style="{ '--dash-delay': `${index * 60}ms` }"
                role="listitem"
                :aria-label="`${item.value} ${item.label}. ${item.hint}`"
                @click="onAnalyticActivate(item)"
              >
                <p class="dash-analytic__value">
                  <DashAnimatedNumber :value="item.value" :reduce-motion="reduceMotion" />
                </p>
                <p class="dash-analytic__label">{{ item.label }}</p>
                <p class="dash-analytic__hint">{{ item.hint }}</p>
              </button>
            </div>

            <div class="dash-progress-grid">
              <div class="dash-position">
                <span class="dash-kicker">{{ t('dashboard.current_position') }}</span>
                <h3 class="dash-position__surah">
                  {{ data.progress?.current_surah_name || t('dashboard.not_started') }}
                </h3>
                <p v-if="positionDetailText" class="dash-position__detail">{{ positionDetailText }}</p>
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
                  <span class="dash-surah-progress__pct">
                    <DashAnimatedNumber :value="surahProgress.value" :reduce-motion="reduceMotion" />%
                  </span>
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
                  <i class="bi bi-bar-chart" aria-hidden="true"></i>
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
                <p v-if="chartSummaryText" class="dash-chart__summary">{{ chartSummaryText }}</p>
              </div>
            </div>
          </div>
        </section>

      </template>
    </div>

    <Teleport to="body">
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
            <div class="dash-drawer__head-copy">
              <h2 :id="drawerTitleId" class="dash-drawer__title">{{ drawerTitle }}</h2>
              <p class="dash-drawer__subtitle">{{ drawerSubtitle }}</p>
              <p v-if="drawerCountLabel" class="dash-drawer__count">{{ drawerCountLabel }}</p>
            </div>
            <button
              type="button"
              class="dash-icon-btn dash-drawer__close"
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

            <div v-if="drawerLoading" class="dash-drawer__status dash-drawer__status--loading" role="status">
              <div class="dash-spinner" aria-hidden="true"></div>
              <span>{{ t('dashboard.drawer_loading') }}</span>
            </div>
            <p v-else-if="drawerError" class="dash-drawer__status" role="alert">
              {{ t('dashboard.drawer_load_error') }}
            </p>
            <div v-else-if="!visibleDrawerItems.length" class="dash-drawer__status dash-drawer__status--empty">
              <i class="bi bi-inbox" aria-hidden="true"></i>
              <p>{{ drawerEmptyMessage }}</p>
            </div>

            <ul v-else-if="drawerMode === 'activity'" class="dash-drawer__list">
              <li
                v-for="(item, index) in visibleDrawerItems"
                :key="item.id || `${item.type}-${item.occurred_at}`"
              >
                <a
                  class="dash-drawer__row dash-drawer__row--link dash-reveal"
                  :style="{ '--dash-delay': `${Math.min(index, 12) * 40}ms` }"
                  :href="item.href || memorisationUrl"
                >
                  <div class="dash-drawer__row-main">
                    <span class="dash-drawer__type">{{ activityTypeLabel(item.type) }}</span>
                    <span class="dash-drawer__row-title">{{ activityTitle(item) }}</span>
                    <span v-if="activityOutcome(item)" class="dash-drawer__row-meta">{{ activityOutcome(item) }}</span>
                  </div>
                  <time class="dash-drawer__row-time" :datetime="item.occurred_at">
                    {{ formatActivityDate(item.occurred_at) }}
                  </time>
                </a>
              </li>
            </ul>

            <ul v-else-if="drawerMode === 'sessions'" class="dash-drawer__list">
              <li
                v-for="(item, index) in visibleDrawerItems"
                :key="`session-${item.id}`"
              >
                <div
                  class="dash-drawer__row dash-reveal"
                  :style="{ '--dash-delay': `${Math.min(index, 12) * 40}ms` }"
                >
                  <div class="dash-drawer__row-main">
                    <span class="dash-drawer__type">{{ t('dashboard.activity_type_session') }}</span>
                    <span class="dash-drawer__row-title">
                      {{ item.surah_name || t('dashboard.not_started') }}
                      <template v-if="formatItemRange(item)"> · {{ formatItemRange(item) }}</template>
                    </span>
                    <span class="dash-drawer__row-meta">{{ sessionStatusLabel(item.status) }}</span>
                  </div>
                  <time class="dash-drawer__row-time" :datetime="item.occurred_at">
                    {{ formatActivityDate(item.occurred_at) }}
                  </time>
                </div>
              </li>
            </ul>

            <ul v-else-if="drawerMode === 'ai_checks'" class="dash-drawer__list">
              <li v-for="(item, index) in visibleDrawerItems" :key="`ai-${item.id}`">
                <div
                  class="dash-drawer__row dash-reveal"
                  :style="{ '--dash-delay': `${Math.min(index, 12) * 40}ms` }"
                >
                  <div class="dash-drawer__row-main">
                    <span class="dash-drawer__type">{{ t('dashboard.activity_type_ai_check') }}</span>
                    <span class="dash-drawer__row-title">
                      {{ item.surah_name || t('dashboard.not_started') }}
                      <template v-if="formatItemRange(item)"> · {{ formatItemRange(item) }}</template>
                    </span>
                    <span class="dash-drawer__row-meta">{{ aiResultLabel(item) }}</span>
                  </div>
                  <time class="dash-drawer__row-time" :datetime="item.occurred_at">
                    {{ formatActivityDate(item.occurred_at) }}
                  </time>
                </div>
              </li>
            </ul>

            <ul v-else-if="drawerMode === 'notes'" class="dash-drawer__list">
              <li v-for="(item, index) in visibleDrawerItems" :key="`note-${item.id}`">
                <div
                  class="dash-drawer__row dash-reveal"
                  :style="{ '--dash-delay': `${Math.min(index, 12) * 40}ms` }"
                >
                  <div class="dash-drawer__row-main">
                    <span class="dash-drawer__type">{{ t('dashboard.activity_type_note') }}</span>
                    <span class="dash-drawer__row-title">{{ noteHeading(item) }}</span>
                    <span v-if="noteSnippet(item)" class="dash-drawer__row-meta">{{ noteSnippet(item) }}</span>
                  </div>
                  <time class="dash-drawer__row-time" :datetime="item.updated_at || item.created_at">
                    {{ formatActivityDate(item.updated_at || item.created_at) }}
                  </time>
                </div>
              </li>
            </ul>

            <ul v-else-if="drawerMode === 'murajaah'" class="dash-drawer__list dash-drawer__list--murajaah">
              <li v-for="(item, index) in visibleDrawerItems" :key="`murajaah-${item.key}`">
                <div
                  class="dash-drawer__row dash-drawer__row--murajaah dash-reveal"
                  :style="{ '--dash-delay': `${Math.min(index, 12) * 40}ms` }"
                >
                  <div class="dash-drawer__row-main">
                    <span class="dash-drawer__type">{{ t('dashboard.strengthen_title') }}</span>
                    <span class="dash-drawer__row-title">
                      {{ item.surah_name }} · {{ t('dashboard.ayah_n', { n: item.ayah_number }) }}
                      <span
                        v-if="item.strength"
                        class="dash-strength dash-strength--compact"
                        :class="`dash-strength--${item.strength}`"
                      >
                        {{ strengthLabel(item) }}
                      </span>
                    </span>
                    <span v-if="item.phrase" class="dash-drawer__row-meta dash-drawer__row-meta--arabic" lang="ar" dir="rtl">
                      {{ item.phrase }}
                    </span>
                    <span v-else-if="item.explanation_key" class="dash-drawer__row-meta">
                      {{ t(`dashboard.${item.explanation_key}`) }}
                    </span>
                  </div>
                  <a class="dash-btn dash-btn--ghost dash-btn--sm" :href="reviewNowHref(item)">
                    {{ t('dashboard.review_now') }}
                  </a>
                </div>
              </li>
            </ul>

            <ul v-else-if="drawerMode === 'hifz'" class="dash-drawer__list">
              <li v-for="(group, index) in visibleDrawerItems" :key="`hifz-${group.surah_number}`">
                <div
                  class="dash-drawer__group dash-reveal"
                  :style="{ '--dash-delay': `${Math.min(index, 12) * 40}ms` }"
                >
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
                </div>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </Teleport>
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
import NetworkFallback from '../components/NetworkFallback.vue'
import DashAnimatedNumber from '../components/DashAnimatedNumber.vue'
import { classifyRequestFailure, subscribeNetworkStatus } from '../utils/networkStatus'
import { activeSessionSnapshotKey } from '../utils/mutqinStorageKeys'
import './Dashboard.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const METRIC_META = [
  { key: 'completed_sessions', tone: 'success', labelKey: 'metric_completed', hintKey: 'metric_completed_hint', drawer: 'sessions', icon: 'bi bi-journal-check' },
  { key: 'saved_sessions', tone: 'accent', labelKey: 'metric_saved', hintKey: 'metric_saved_hint', hrefPanel: 'saved', icon: 'bi bi-bookmark-heart' },
  { key: 'memorised_ayahs', tone: 'info', labelKey: 'metric_memorised', hintKey: 'metric_memorised_hint', altHintKey: 'metric_completed_ayahs_hint', drawer: 'hifz', icon: 'bi bi-stars' },
  { key: 'notes', tone: 'neutral', labelKey: 'metric_notes', hintKey: 'metric_notes_hint', drawer: 'notes', icon: 'bi bi-journal-text' },
]

const DRAWER_TITLES = {
  activity: 'drawer_activity_title',
  sessions: 'drawer_sessions_title',
  ai_checks: 'drawer_ai_title',
  notes: 'drawer_notes_title',
  hifz: 'drawer_hifz_title',
  murajaah: 'drawer_murajaah_title',
}

const DRAWER_SUBTITLES = {
  activity: 'drawer_activity_subtitle',
  sessions: 'drawer_sessions_subtitle',
  ai_checks: 'drawer_ai_subtitle',
  notes: 'drawer_notes_subtitle',
  hifz: 'drawer_hifz_subtitle',
  murajaah: 'drawer_murajaah_subtitle',
}

const DRAWER_EMPTY = {
  activity: 'drawer_activity_empty',
  sessions: 'drawer_sessions_empty',
  ai_checks: 'drawer_ai_empty',
  notes: 'drawer_notes_empty',
  hifz: 'drawer_hifz_empty',
  murajaah: 'drawer_murajaah_empty',
}

export default {
  name: 'UserDashboard',
  components: { Bar, NetworkFallback, DashAnimatedNumber },
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
      failureKind: 'failure',
      chartDays: initial?.chart?.days === 7 ? 7 : 30,
      chartReady: true,
      reduceMotion: false,
      lastSyncedAt: initial?.meta?.generated_at || null,
      syncState: initial ? 'ready' : 'loading',
      lastDashboardFetchedAt: initial ? Date.now() : 0,
      lastChartFingerprint: '',
      dashboardQuietTtlMs: 45000,
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
      activeSessionSnapshot: null,
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
    journey() {
      return this.data?.journey && typeof this.data.journey === 'object'
        ? this.data.journey
        : null
    },
    journeyHasStarted() {
      return !!this.journey?.has_started
    },
    showJourneyStart() {
      if (this.liveReturnSession) return false
      if (this.journeyHasStarted && this.journeyContinue) return false
      if (this.hasMemorisationHistory) return false
      return true
    },
    hasMemorisationHistory() {
      if (this.journeyMemorisedCount > 0) return true
      if (Number(this.data?.snapshot?.completed_sessions?.value ?? 0) > 0) return true
      if (Number(this.data?.snapshot?.memorised_ayahs?.value ?? 0) > 0) return true
      if (this.data?.progress?.current_surah_number) return true
      const row = this.data?.continue
      return !!(row?.surah_number || row?.surah_name)
    },
    journeyContinue() {
      if (this.journey?.continue) return this.journey.continue
      if (this.hasMemorisationHistory && this.data?.continue) return this.data.continue
      return null
    },
    journeyContinueHref() {
      const href = String(this.journeyContinue?.href || this.continueHref || '').trim()
      return href || this.memorisationUrl
    },
    journeyContinueLabel() {
      if (this.isLiveContinueAction) return this.t('dashboard.return_session_label')
      return this.t('dashboard.journey_continue_label')
    },
    journeyContinueCta() {
      if (this.isLiveContinueAction) return this.t('dashboard.return_session_now')
      const key = this.journeyContinue?.cta_key
      if (key) {
        const translated = this.t(`dashboard.${key}`)
        if (translated && translated !== `dashboard.${key}`) return translated
      }
      return this.t('dashboard.journey_continue_cta')
    },
    journeyMemorisedCount() {
      const fromJourney = Number(this.journey?.overall?.memorised_ayah_count ?? 0)
      if (fromJourney > 0) return fromJourney
      return Number(this.data?.progress?.memorised_ayah_count ?? this.data?.snapshot?.memorised_ayahs?.value ?? 0)
    },
    journeyOverallPercent() {
      const fromJourney = Number(this.journey?.overall?.percent ?? 0)
      if (fromJourney > 0 || this.journey?.has_started) return fromJourney
      const memorised = this.journeyMemorisedCount
      const total = Number(this.journey?.overall?.quran_ayah_count ?? 6236)
      if (memorised <= 0 || total <= 0) return 0
      return Math.max(1, Math.min(100, Math.round((memorised / total) * 100)))
    },
    journeyOverallFill() {
      const pct = this.journeyOverallPercent
      if (pct <= 0) return '0%'
      return `${Math.max(pct, 2)}%`
    },
    showJourneyOverall() {
      return this.journeyMemorisedCount > 0 || this.journeyOverallPercent > 0
    },
    journeyReview() {
      const review = this.journey?.review
      if (!review || !review.surah_name || !review.href) return null
      return review
    },
    journeyMurajaahPrimary() {
      if (this.journeyReview) {
        return {
          kind: 'murajaah',
          href: this.journeyReview.href,
          title: this.journeyReview.surah_name,
          meta: this.murajaahPrimaryMeta(this.journeyReview),
          label: this.t('dashboard.journey_review_label'),
          cta: this.t('dashboard.journey_review_cta'),
        }
      }
      const item = this.murajaahPreview[0]
      if (!item?.href) return null
      return {
        kind: 'murajaah',
        href: item.href,
        title: item.surah_name || this.t('dashboard.start_session'),
        meta: item.phrase || this.murajaahPrimaryMeta(item),
        label: this.t('dashboard.journey_review_label'),
        cta: this.t('dashboard.journey_review_cta'),
      }
    },
    journeyMemorisationAction() {
      if (!this.journeyContinue) return null
      return {
        kind: 'memorisation',
        href: this.journeyContinueHref,
        title: this.journeyContinue.surah_name || this.t('dashboard.start_session'),
        meta: this.continueMetaText,
        label: this.journeyContinueLabel,
        cta: this.journeyContinueCta,
      }
    },
    primaryJourneyAction() {
      if (this.liveReturnSession) return null
      if (this.journeyMurajaahPrimary) return this.journeyMurajaahPrimary
      return this.journeyMemorisationAction
    },
    secondaryJourneyAction() {
      if (this.liveReturnSession) return null
      if (this.journeyMurajaahPrimary && this.journeyMemorisationAction) {
        return this.journeyMemorisationAction
      }
      return null
    },
    murajaahAllItems() {
      const all = this.data?.weaknesses?.all_items
      if (Array.isArray(all) && all.length) return all
      const items = this.data?.weaknesses?.items
      return Array.isArray(items) ? items : []
    },
    murajaahPreview() {
      return this.murajaahAllItems.slice(0, 2)
    },
    murajaahTotal() {
      const total = Number(this.data?.weaknesses?.total ?? 0)
      return total > 0 ? total : this.murajaahAllItems.length
    },
    showMurajaahViewAll() {
      return this.murajaahTotal > this.murajaahPreview.length
    },
    showMurajaahEmpty() {
      if (this.murajaahPreview.length) return false
      return this.journeyHasStarted || this.hasMemorisationHistory
    },
    startBeginningHref() {
      return String(this.journey?.start_beginning_href || '').trim()
        || `${this.memorisationUrl.split('?')[0]}?surah=1&from=1&to=7&journey=main`
    },
    chooseStartHref() {
      return String(this.journey?.choose_start_href || '').trim()
        || `${this.memorisationUrl.split('?')[0]}?setup=1&journey=choose`
    },
    isLiveContinueAction() {
      const type = String(this.data?.continue?.action_type || '')
      return type === 'resume_session' || type === 'continue_session'
    },
    liveReturnSession() {
      if (!this.isLiveContinueAction || !this.data?.continue) return null
      const snap = this.activeSessionSnapshot
      const base = this.data.continue
      const fromKey = String(snap?.activeVerseKey || snap?.activeKey || '')
      const snapAyah = Number(fromKey.split(':')[1] || 0)
      const lastAyah = Number(base.last_ayah || snapAyah || 0) || null
      return {
        ...base,
        surah_name: base.surah_name || null,
        last_ayah: lastAyah,
        last_activity_at: base.last_activity_at
          || (snap?.savedAt ? new Date(Number(snap.savedAt)).toISOString() : null),
      }
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
        let hintKey = meta.hintKey
        if (meta.key === 'memorised_ayahs' && value === 0) {
          labelKey = 'metric_completed_ayahs'
          hintKey = meta.altHintKey || meta.hintKey
        }
        const change = row.change_7d != null ? Number(row.change_7d) : null
        let deltaLabel = null
        if (change != null && change > 0) {
          deltaLabel = this.t('dashboard.change_7d', { n: change })
        }
        return {
          key: meta.key,
          tone: meta.tone,
          icon: meta.icon,
          label: this.t(`dashboard.${labelKey}`),
          hint: this.t(`dashboard.${hintKey}`),
          value,
          deltaLabel,
          drawer: meta.drawer || null,
          href: meta.hrefPanel === 'saved' ? this.savedSessionsHref : null,
        }
      })
    },
    showHeroHint() {
      return !this.showJourneyStart && (this.primaryJourneyAction || this.liveReturnSession)
    },
    murajaahSectionHint() {
      if (this.murajaahTotal > 1) {
        return this.t('dashboard.journey_murajaah_hint', { count: this.murajaahTotal })
      }
      return this.t('dashboard.murajaah_section_hint')
    },
    continueMetaText() {
      const progress = this.data?.progress
      if (!progress) return ''
      const parts = []
      const memorised = Number(progress.memorised_ayah_count ?? 0)
      const learning = Number(progress.learning_ayah_count ?? 0)
      if (memorised > 0) {
        parts.push(`${memorised} ${this.t('dashboard.legend_memorised').toLowerCase()}`)
      }
      if (learning > 0) {
        parts.push(`${learning} ${this.t('dashboard.legend_learning').toLowerCase()}`)
      }
      const start = Number(progress.ayah_start || 0)
      const end = Number(progress.ayah_end || 0)
      if (start > 0 && end >= start) {
        parts.push(this.t('dashboard.ayah_range', { start, end }))
      }
      return parts.join(' · ')
    },
    positionDetailText() {
      const progress = this.data?.progress
      if (!progress?.current_surah_number) return ''
      const parts = []
      const memorised = Number(progress.memorised_ayah_count ?? 0)
      const learning = Number(progress.learning_ayah_count ?? 0)
      const total = Number(progress.surah_ayah_count ?? 0)
      if (memorised > 0 || learning > 0) {
        parts.push(`${memorised} ${this.t('dashboard.legend_memorised').toLowerCase()} · ${learning} ${this.t('dashboard.legend_learning').toLowerCase()}`)
      }
      if (total > 0 && this.surahProgress) {
        parts.push(`${this.surahProgress.practised} / ${total} ${this.t('dashboard.surah_completion').toLowerCase()}`)
      }
      const start = Number(progress.ayah_start || 0)
      const end = Number(progress.ayah_end || 0)
      if (start > 0 && end >= start) {
        parts.push(this.t('dashboard.ayah_range', { start, end }))
      }
      return parts.join(' · ')
    },
    progressSubtitle() {
      const custom = this.t('dashboard.progress_subtitle')
      if (custom && custom !== 'dashboard.progress_subtitle') return custom
      return this.weekSummaryText
    },
    simpleAnalytics() {
      const week = this.data?.week_summary || {}
      const chart = this.data?.chart?.summary_params || {}
      return [
        {
          key: 'week_sessions',
          label: this.t('dashboard.analytics_week_sessions'),
          hint: this.t('dashboard.analytics_week_sessions_hint'),
          value: Number(week.sessions ?? 0),
          drawer: 'activity',
          filter: 'session',
        },
        {
          key: 'week_ayahs',
          label: this.t('dashboard.analytics_week_ayahs'),
          hint: this.t('dashboard.analytics_week_ayahs_hint'),
          value: Number(week.ayahs_practised ?? 0),
          drawer: 'hifz',
        },
        {
          key: 'active_days',
          label: this.t('dashboard.analytics_active_days'),
          hint: this.t('dashboard.analytics_active_days_hint', { days: this.chartDays }),
          value: Number(chart.active_days ?? 0),
          drawer: 'activity',
        },
      ]
    },
    chartSummaryText() {
      if (this.data?.chart?.is_empty) return ''
      const params = this.data?.chart?.summary_params
      if (!params) return this.data?.chart?.summary || ''
      const translated = this.t('dashboard.chart_summary', {
        days: Number(params.days || this.chartDays),
        ayahs: Number(params.ayahs || 0),
        sessions: Number(params.sessions || 0),
        active_days: Number(params.active_days || 0),
      })
      if (translated && translated !== 'dashboard.chart_summary') return translated
      return this.data?.chart?.summary || ''
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
      if (this.darkTheme) {
        return {
          ayahs: '#3f9a72',
          ayahsHover: '#52ad84',
          sessions: '#c49a6c',
          sessionsHover: '#d4aa7c',
          muted: '#c9bbac',
          ink: '#f4ede4',
          tooltipBg: '#181614',
          tooltipBorder: 'rgba(230, 207, 181, 0.14)',
          grid: 'rgba(230, 207, 181, 0.08)',
        }
      }
      return {
        ayahs: '#146c46',
        ayahsHover: '#1f7b50',
        sessions: '#a0784c',
        sessionsHover: '#8b653b',
        muted: '#6b7f76',
        ink: '#1a2e24',
        tooltipBg: '#ffffff',
        tooltipBorder: 'rgba(160, 120, 76, 0.12)',
        grid: 'rgba(160, 120, 76, 0.08)',
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
        animation: this.reduceMotion ? false : { duration: 480, easing: 'easeOutQuart' },
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
    drawerSubtitle() {
      const key = DRAWER_SUBTITLES[this.drawerMode]
      return key ? this.t(`dashboard.${key}`) : ''
    },
    drawerCountLabel() {
      if (this.drawerLoading || this.drawerError) return ''
      const count = this.visibleDrawerItems.length
      if (count <= 0) return ''
      return this.t('dashboard.drawer_count', { n: count })
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

    this.refreshActiveSessionSnapshot()
    if (!this.data) {
      this.fetchDashboard(this.chartDays, { initial: true })
    }
    // When SSR/initial payload exists, skip an immediate quiet refetch —
    // visibility/focus handlers cover staleness with a TTL.

    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        this.refreshActiveSessionSnapshot()
        this.fetchDashboard(this.chartDays, { quiet: true })
      }
    }
    // Focus often fires with visibilitychange; TTL inside fetchDashboard
    // dedupes the double-hit without dropping intentional refreshes.
    this.focusHandler = () => {
      if (document.visibilityState === 'visible') {
        this.fetchDashboard(this.chartDays, { quiet: true })
      }
    }
    this.escapeHandler = (event) => {
      if (event.key === 'Escape' && this.drawerOpen) this.closeDrawer()
    }
    document.addEventListener('visibilitychange', this.visibilityHandler)
    window.addEventListener('focus', this.focusHandler)
    document.addEventListener('keydown', this.escapeHandler)
    this.unsubscribeNetwork = subscribeNetworkStatus((online) => {
      if (online && this.error && !this.data) this.reload(true)
    })
  },
  beforeUnmount() {
    try { this._dashboardAbort?.abort?.() } catch (_) { /* ignore */ }
    if (typeof this.unsubscribeNetwork === 'function') this.unsubscribeNetwork()
    if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler)
    if (this.focusHandler) window.removeEventListener('focus', this.focusHandler)
    if (this.escapeHandler) document.removeEventListener('keydown', this.escapeHandler)
    if (this.themeObserver) this.themeObserver.disconnect()
    this.syncDrawerBodyLock(false)
  },
  methods: {
    t(key, params) {
      if (typeof this.$t === 'function') return this.$t(key, params)
      return key
    },
    murajaahPrimaryMeta(source = {}) {
      const start = Number(source.ayah_start || source.ayah_number || 0)
      const end = Number(source.ayah_end || start || 0)
      if (start > 0 && end >= start) {
        return this.t('dashboard.ayah_range', { start, end })
      }
      if (start > 0) {
        return this.t('dashboard.last_ayah', { n: start })
      }
      return ''
    },
    activeSessionSnapshotKey() {
      return activeSessionSnapshotKey(this.ownerId > 0 ? this.ownerId : null)
    },
    refreshActiveSessionSnapshot() {
      if (typeof sessionStorage === 'undefined') {
        this.activeSessionSnapshot = null
        return
      }
      try {
        const raw = sessionStorage.getItem(this.activeSessionSnapshotKey())
        this.activeSessionSnapshot = raw ? JSON.parse(raw) : null
      } catch {
        this.activeSessionSnapshot = null
      }
    },
    goToLiveSession() {
      const href = this.continueHref
      if (!href) return
      window.location.assign(href)
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
      const href = String(item?.href || '').trim()
      if (href) return href
      const surah = Number(item?.surah_number || 0)
      const ayah = Number(item?.ayah_number || 0)
      const base = this.memorisationUrl.split('?')[0]
      if (!(surah > 0 && ayah > 0)) return base
      const params = new URLSearchParams({
        surah: String(surah),
        from: String(ayah),
        to: String(ayah),
        review: '1',
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
    onAnalyticActivate(item) {
      if (!item?.drawer) return
      this.openDrawer(item.drawer)
      if (item.filter) {
        this.activityFilter = item.filter
      }
    },
    async openDrawer(mode) {
      if (!mode) return
      this.drawerMode = mode
      this.drawerItems = []
      this.drawerError = false
      this.activityFilter = 'all'
      this.syncDrawerBodyLock(true)

      if (mode === 'murajaah') {
        this.drawerItems = this.murajaahAllItems
        this.drawerLoading = false
        this.drawerError = false
        return
      }

      this.drawerLoading = true
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
      this.syncDrawerBodyLock(false)
    },
    syncDrawerBodyLock(open) {
      if (typeof document === 'undefined') return
      document.documentElement.classList.toggle('dash-drawer-open', open)
      document.body.classList.toggle('dash-drawer-open', open)
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
      if (
        quiet
        && !force
        && this.data
        && this.lastDashboardFetchedAt
        && (Date.now() - this.lastDashboardFetchedAt) < this.dashboardQuietTtlMs
      ) {
        return
      }
      const requestId = ++this.dashboardRequestId
      try { this._dashboardAbort?.abort?.() } catch (_) { /* ignore */ }
      this._dashboardAbort = typeof AbortController !== 'undefined'
        ? new AbortController()
        : null
      if (!quiet) {
        this.loading = true
        this.syncState = 'loading'
      }
      try {
        const payload = await learningApi.getDashboard(safeDays, {
          signal: this._dashboardAbort?.signal,
        })
        if (requestId !== this.dashboardRequestId) return
        const sanitized = this.sanitizePayload(payload)
        if (!sanitized) throw new Error('Dashboard payload owner mismatch')
        const chartFingerprint = JSON.stringify({
          days: sanitized?.chart?.days,
          points: sanitized?.chart?.points,
          summary: sanitized?.chart?.summary,
        })
        const chartChanged = chartFingerprint !== this.lastChartFingerprint
        this.data = sanitized
        this.error = false
        this.failureKind = 'failure'
        this.lastSyncedAt = sanitized?.meta?.generated_at || new Date().toISOString()
        this.lastDashboardFetchedAt = Date.now()
        this.syncState = 'ready'
        if (sanitized?.chart?.days === 7 || sanitized?.chart?.days === 30) {
          this.chartDays = sanitized.chart.days
        } else {
          this.chartDays = safeDays
        }
        // Remount Chart.js only when the series actually changed.
        if (chartChanged || !quiet) {
          this.lastChartFingerprint = chartFingerprint
          this.chartReady = false
          await this.$nextTick()
        }
        if (requestId === this.dashboardRequestId) {
          this.chartReady = true
          this.refreshActiveSessionSnapshot()
        }
      } catch (error) {
        if (
          error?.code === 'ERR_CANCELED'
          || error?.name === 'CanceledError'
          || error?.name === 'AbortError'
        ) {
          return
        }
        console.error('Dashboard fetch failed', error)
        if (requestId !== this.dashboardRequestId) return
        if (initial || force || !this.data) {
          this.failureKind = classifyRequestFailure(error)
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
