<template>
  <div class="growth" :aria-busy="loading ? 'true' : 'false'">
    <header class="growth__hero">
      <div class="growth__hero-main">
        <p class="growth__kicker">Super Admin</p>
        <h1>Growth</h1>
        <p class="growth__lede">Signups, practice, and return for your chosen dates.</p>
        <p v-if="report" class="growth__period">{{ periodLabel }}</p>
      </div>
      <div class="growth__controls">
        <div class="growth__presets" role="group" aria-label="Reporting period">
          <button type="button" :aria-pressed="activePreset === 7" @click="preset(7)">7 days</button>
          <button type="button" :aria-pressed="activePreset === 30" @click="preset(30)">30 days</button>
          <button type="button" :aria-pressed="activePreset === 90" @click="preset(90)">90 days</button>
        </div>
        <form class="growth__custom" @submit.prevent="applyCustom">
          <label>
            <span>From</span>
            <input v-model="from" type="date" name="from" required :max="to || today">
          </label>
          <label>
            <span>To</span>
            <input v-model="to" type="date" name="to" required :min="from" :max="today">
          </label>
          <button class="growth__apply" type="submit" :disabled="loading">Apply</button>
        </form>
        <button class="growth__refresh" type="button" :disabled="loading" @click="load({ refresh: true })">
          {{ refreshing ? 'Refreshing' : 'Refresh' }}
        </button>
      </div>
    </header>

    <p v-if="statusView" class="growth__status" :data-tone="statusView.tone" role="status">
      <span>{{ statusView.label }}</span>
      <span v-if="statusView.detail" class="growth__status-meta">{{ statusView.detail }}</span>
    </p>

    <div v-if="error" class="growth__callout" data-tone="warn" role="alert">
      <p>{{ error }}</p>
      <button type="button" @click="load({ refresh: true })">Retry</button>
    </div>
    <div v-else-if="integrationMessage" class="growth__callout" data-tone="warn" role="status">
      <p>{{ integrationMessage }}</p>
      <button v-if="posthogFailed" type="button" @click="load({ refresh: true })">Retry</button>
    </div>

    <div v-if="loading && !report" class="growth__skeleton" aria-hidden="true">
      <div class="growth__kpis">
        <span v-for="index in 6" :key="index"></span>
      </div>
      <div class="growth__split">
        <span></span>
        <span></span>
      </div>
    </div>

    <div v-if="report" class="growth__body" :data-refreshing="refreshing ? 'true' : 'false'">
      <section class="growth__section" aria-labelledby="growth-overview">
        <header class="growth__section-head">
          <h2 id="growth-overview" class="growth__section-title">Overview</h2>
          <p class="growth__section-desc">Core counts for this period. Total users is all-time.</p>
        </header>
        <div class="growth__kpis">
          <article v-for="card in report.overview" :key="card.key" class="growth__kpi">
            <header>
              <h3>{{ card.title }}</h3>
              <button type="button" class="growth__info" :aria-label="`How ${card.title} is calculated`">
                i
                <span class="growth__tip" role="tooltip">{{ card.hint }}</span>
              </button>
            </header>
            <strong v-if="card.display">{{ card.display }}</strong>
            <strong v-else class="growth__quiet">{{ card.empty }}</strong>
            <p v-if="card.display && card.subtitle">{{ card.subtitle }}</p>
            <p v-if="card.comparison && card.comparison.kind === 'percent'" class="growth__delta" :data-dir="deltaDir(card.comparison.percent)">
              {{ formatDelta(card.comparison.percent) }}
              <span class="growth__delta-note">vs prior period</span>
            </p>
            <p v-else-if="card.comparison && card.comparison.kind === 'new'" class="growth__delta" data-dir="up">
              New
              <span class="growth__delta-note">vs prior period</span>
            </p>
          </article>
        </div>
      </section>

      <section class="growth__section" aria-labelledby="growth-acquisition">
        <header class="growth__section-head">
          <h2 id="growth-acquisition" class="growth__section-title">Acquisition</h2>
          <p class="growth__section-desc">New accounts and stored signup sources.</p>
        </header>
        <div class="growth__split">
          <article class="growth__panel">
            <header class="growth__panel-head">
              <h3>Registrations</h3>
              <p>{{ grainLabel(report.acquisition.registrations.grain) }} counts</p>
            </header>
            <p v-if="!hasRegistrations" class="growth__empty">No registrations in this period.</p>
            <template v-else>
              <GrowthChart
                :key="chartKey('registrations')"
                kind="bar"
                :labels="registrationLabels"
                :series="registrationSeries"
                aria-label="New registrations over the selected period"
                v-bind="chartColors"
              />
              <table class="growth__sr">
                <caption>New registrations</caption>
                <tbody>
                  <tr v-for="point in report.acquisition.registrations.points" :key="point.date">
                    <th scope="row">{{ formatDay(point.date) }}</th>
                    <td>{{ point.count }}</td>
                  </tr>
                </tbody>
              </table>
            </template>
          </article>

          <article class="growth__panel">
            <header class="growth__panel-head">
              <h3>Sources</h3>
              <p>UTM or referral saved at signup</p>
            </header>
            <p v-if="!report.acquisition.sources.length" class="growth__empty">No registrations in this period.</p>
            <ul v-else class="growth__sources">
              <li v-for="source in report.acquisition.sources" :key="source.key + source.label">
                <div class="growth__source-top">
                  <span>{{ source.label }}</span>
                  <strong>{{ source.count }} · {{ percent(source.share) }}</strong>
                </div>
                <div class="growth__meter" :aria-hidden="true">
                  <span :style="{ width: meter(source.share) }" :data-muted="source.verified ? 'false' : 'true'"></span>
                </div>
              </li>
            </ul>
            <p v-if="report.acquisition.referral.link_opens || report.acquisition.referral.signups || report.acquisition.referral.activations" class="growth__footnote">
              Referrals {{ report.acquisition.referral.signups }}
              <template v-if="report.acquisition.referral.link_opens"> · {{ report.acquisition.referral.link_opens }} link opens</template>
              <template v-if="report.acquisition.referral.activations"> · {{ report.acquisition.referral.activations }} activated</template>
            </p>
          </article>
        </div>
      </section>

      <section class="growth__section" aria-labelledby="growth-funnel">
        <header class="growth__section-head">
          <h2 id="growth-funnel" class="growth__section-title">Activation</h2>
          <p class="growth__section-desc">Unique new accounts at each step.</p>
        </header>
        <article class="growth__panel">
          <p v-if="report.funnel.biggest_dropoff" class="growth__callout growth__callout--note">
            Biggest drop-off: <strong>{{ funnelLabel(report.funnel.biggest_dropoff.label) }}</strong>
          </p>
          <ol class="growth__funnel">
            <li v-for="(stage, index) in report.funnel.stages" :key="stage.key">
              <h4>{{ funnelLabel(stage.label) }}</h4>
              <strong v-if="stage.status === 'immature'" class="growth__quiet">Waiting</strong>
              <strong v-else>{{ stage.users }}</strong>
              <div v-if="stage.status !== 'immature'" class="growth__meter" aria-hidden="true">
                <span :style="{ width: meter(stage.bar) }"></span>
              </div>
              <p v-if="stage.status !== 'immature' && index > 0 && stage.conversion != null" class="growth__stage-note">
                {{ percent(stage.conversion) }} from previous
              </p>
            </li>
          </ol>
        </article>
      </section>

      <section class="growth__section" aria-labelledby="growth-engagement">
        <header class="growth__section-head">
          <h2 id="growth-engagement" class="growth__section-title">Engagement</h2>
          <p class="growth__section-desc">Practice over time and feature use.</p>
        </header>
        <div class="growth__split">
          <article class="growth__panel">
            <header class="growth__panel-head">
              <h3>Active learners</h3>
              <p>Distinct accounts by {{ report.engagement.active_learners.grain }}</p>
            </header>
            <p v-if="!hasActiveLearners" class="growth__empty">No practice activity in this period.</p>
            <GrowthChart
              v-else
              :key="chartKey('active')"
              kind="line"
              :labels="activeLabels"
              :series="activeSeries"
              aria-label="Active learners over the selected period"
              v-bind="chartColors"
            />
          </article>
          <article class="growth__panel">
            <header class="growth__panel-head">
              <h3>Sessions</h3>
              <p>Started, completed, abandoned</p>
            </header>
            <p v-if="!hasPractice" class="growth__empty">No sessions started in this period.</p>
            <GrowthChart
              v-else
              :key="chartKey('practice')"
              kind="bar"
              :labels="practiceLabels"
              :series="practiceSeries"
              aria-label="Sessions started, completed, and abandoned"
              v-bind="chartColors"
            />
          </article>
        </div>

        <article class="growth__panel growth__panel--features">
          <header class="growth__panel-head">
            <h3>Features</h3>
            <p>Accounts and uses in this period</p>
          </header>
          <ul class="growth__features">
            <li v-for="feature in report.engagement.features" :key="feature.key">
              <div>
                <h4>{{ feature.label }}</h4>
                <p v-if="!feature.collected">No data yet</p>
                <p v-else-if="feature.uses === 0">None</p>
                <p v-else>{{ feature.users }} accounts · {{ feature.uses }} uses</p>
              </div>
              <p v-if="feature.comparison && feature.comparison.kind === 'percent'" class="growth__delta" :data-dir="deltaDir(feature.comparison.percent)">
                {{ formatDelta(feature.comparison.percent) }}
              </p>
              <p v-else-if="feature.comparison && feature.comparison.kind === 'new'" class="growth__delta" data-dir="up">New</p>
            </li>
          </ul>
        </article>

        <article v-if="achievementStats" class="growth__panel growth__panel--features">
          <header class="growth__panel-head">
            <h3>Achievements</h3>
            <p>Unlocks and engagement in this period</p>
          </header>
          <ul class="growth__features">
            <li>
              <div>
                <h4>Users earning</h4>
                <p v-if="!achievementStats.collected">No data yet</p>
                <p v-else>{{ achievementStats.users_earning }} accounts · {{ achievementStats.unlocks }} unlocks</p>
              </div>
            </li>
            <li>
              <div>
                <h4>Engagement</h4>
                <p v-if="!achievementStats.collected">No data yet</p>
                <p v-else>{{ achievementStats.engagement_users }} accounts · {{ achievementStats.engagement_views }} views</p>
              </div>
            </li>
            <li>
              <div>
                <h4>Practice after unlock</h4>
                <p v-if="!achievementStats.collected">No data yet</p>
                <p v-else>{{ achievementStats.practised_after_unlock }} accounts practised later</p>
              </div>
            </li>
          </ul>
          <ul v-if="achievementStats.most_common?.length" class="growth__features" style="margin-top: 10px">
            <li v-for="row in achievementStats.most_common" :key="row.achievement_id">
              <div>
                <h4>{{ achievementLabel(row.achievement_id) }}</h4>
                <p>{{ row.users }} accounts · {{ row.unlocks }} unlocks</p>
              </div>
            </li>
          </ul>
          <p v-if="achievementStats.disclaimer" class="growth__section-desc" style="margin-top: 8px">
            {{ achievementStats.disclaimer }}
          </p>
        </article>
      </section>

      <section class="growth__section" aria-labelledby="growth-retention">
        <header class="growth__section-head">
          <h2 id="growth-retention" class="growth__section-title">Retention</h2>
          <p class="growth__section-desc">Returned for practice on day 1, 7, or 30 after signup (London).</p>
        </header>
        <article class="growth__panel">
          <div class="growth__retention">
            <article v-for="card in retentionCards" :key="card.label">
              <h4>{{ card.label }}</h4>
              <strong v-if="card.status === 'ready'">{{ percent(card.rate) }}</strong>
              <strong v-else class="growth__quiet">Waiting</strong>
              <p v-if="card.status === 'ready'" class="growth__stage-note">{{ card.retained }} of {{ card.eligible }}</p>
            </article>
          </div>

          <div v-if="showCohorts" class="growth__table-wrap">
            <table>
              <caption>Waiting means that day has not arrived.</caption>
              <thead>
                <tr>
                  <th scope="col">Signup</th>
                  <th scope="col">Users</th>
                  <th scope="col">Day 1</th>
                  <th scope="col">Day 7</th>
                  <th scope="col">Day 30</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in report.retention.cohorts" :key="row.date">
                  <th scope="row">{{ formatDay(row.date) }}</th>
                  <td>{{ row.users }}</td>
                  <td>{{ cohortCell(row.day_1) }}</td>
                  <td>{{ cohortCell(row.day_7) }}</td>
                  <td>{{ cohortCell(row.day_30) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <div v-if="report.insights.length || report.consistency.notes.length" class="growth__split growth__notes">
        <section v-if="report.insights.length" class="growth__section" aria-labelledby="growth-insights">
          <header class="growth__section-head">
            <h2 id="growth-insights" class="growth__section-title">Insights</h2>
            <p class="growth__section-desc">From the numbers above.</p>
          </header>
          <article class="growth__panel">
            <ul class="growth__insights">
              <li v-for="line in report.insights" :key="line">{{ line }}</li>
            </ul>
          </article>
        </section>

        <section v-if="report.consistency.notes.length" class="growth__section" aria-labelledby="growth-consistency">
          <header class="growth__section-head">
            <h2 id="growth-consistency" class="growth__section-title">Data checks</h2>
            <p class="growth__section-desc">Database vs analytics mismatches.</p>
          </header>
          <article class="growth__panel">
            <ul class="growth__insights">
              <li v-for="note in report.consistency.notes" :key="note">{{ note }}</li>
            </ul>
          </article>
        </section>
      </div>
    </div>
  </div>
</template>

<script>
import GrowthChart from '../components/admin/GrowthChart.vue'

function londonToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function shiftDays(iso, days) {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export default {
  components: { GrowthChart },
  props: {
    auth: { type: Object, required: true },
  },
  data() {
    const today = londonToday()
    return {
      today,
      from: shiftDays(today, -29),
      to: today,
      report: null,
      loading: false,
      refreshing: false,
      error: '',
      requestSeq: 0,
      controller: null,
      themeObserver: null,
      theme: {
        text: '#1f1a17',
        muted: '#554c45',
        grid: 'rgba(78, 58, 38, 0.16)',
        surface: '#ffffff',
        border: 'rgba(78, 58, 38, 0.24)',
        accent: '#8b5e3c',
        success: '#2d6a4f',
        danger: '#b55041',
      },
    }
  },
  computed: {
    chartColors() {
      return {
        textColor: this.theme.text,
        mutedColor: this.theme.muted,
        gridColor: this.theme.grid,
        surfaceColor: this.theme.surface,
        borderColor: this.theme.border,
      }
    },
    periodLabel() {
      const period = this.report?.period
      if (!period) return ''
      return `${this.formatDay(period.from)} – ${this.formatDay(period.to)} · Europe/London`
    },
    activePreset() {
      const today = this.today
      if (this.to !== today) return 0
      for (const days of [7, 30, 90]) {
        if (this.from === shiftDays(today, -(days - 1))) return days
      }
      return 0
    },
    statusView() {
      const freshness = this.report?.freshness
      if (!freshness) return null
      const updated = `Last updated ${this.formatStamp(freshness.generated_at)}`
      const posthog = freshness.posthog
      if (posthog === 'unconfigured' || posthog === 'misconfigured') {
        return { tone: 'warn', label: 'PostHog is not connected', detail: updated }
      }
      if (posthog === 'error' || posthog === 'busy' || freshness.status === 'partial' || freshness.status === 'stale') {
        return { tone: 'partial', label: freshness.status === 'stale' ? `Updated ${this.ageLabel(freshness.age_seconds)}` : 'Partial data', detail: updated }
      }
      if (freshness.cached) {
        return { tone: 'cached', label: `Updated ${this.ageLabel(freshness.age_seconds)}`, detail: updated }
      }
      return { tone: 'live', label: 'Live data', detail: updated }
    },
    integrationMessage() {
      const posthog = this.report?.consistency?.posthog
      if (!posthog || posthog.status === 'ok' || posthog.status === 'unconfigured' || posthog.status === 'misconfigured') return ''
      return posthog.message || ''
    },
    posthogFailed() {
      const status = this.report?.consistency?.posthog?.status
      return status === 'error' || status === 'busy'
    },
    retentionCards() {
      const cards = this.report?.retention?.cards || {}
      return [cards.day_1, cards.day_7, cards.day_30].filter(Boolean)
    },
    showCohorts() {
      return (this.report?.retention?.cohorts || []).some((row) =>
        [row.day_1, row.day_7, row.day_30].some((cell) => cell?.status === 'ready'),
      )
    },
    hasRegistrations() {
      return (this.report?.acquisition?.registrations?.points || []).some((point) => point.count > 0)
    },
    hasActiveLearners() {
      return (this.report?.engagement?.active_learners?.points || []).some((point) => point.users > 0)
    },
    hasPractice() {
      return (this.report?.engagement?.practice?.points || []).some((point) => point.started > 0)
    },
    registrationLabels() {
      return (this.report?.acquisition?.registrations?.points || []).map((point) => this.formatDay(point.date))
    },
    registrationSeries() {
      const points = this.report?.acquisition?.registrations?.points || []
      return [{ label: 'Registrations', data: points.map((point) => point.count), color: this.theme.accent }]
    },
    activeLabels() {
      return (this.report?.engagement?.active_learners?.points || []).map((point) => this.formatDay(point.date))
    },
    activeSeries() {
      const points = this.report?.engagement?.active_learners?.points || []
      return [{ label: 'Active learners', data: points.map((point) => point.users), color: this.theme.accent }]
    },
    practiceLabels() {
      return (this.report?.engagement?.practice?.points || []).map((point) => this.formatDay(point.date))
    },
    practiceSeries() {
      const points = this.report?.engagement?.practice?.points || []
      return [
        { label: 'Started', data: points.map((point) => point.started), color: this.theme.accent },
        { label: 'Completed', data: points.map((point) => point.completed), color: this.theme.success },
        { label: 'Abandoned', data: points.map((point) => point.abandoned), color: this.theme.danger },
      ]
    },
    achievementStats() {
      return this.report?.engagement?.achievements || null
    },
  },
  mounted() {
    this.readTheme()
    this.themeObserver = new MutationObserver(() => this.readTheme())
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] })
    this.load()
  },
  beforeUnmount() {
    this.controller?.abort()
    this.themeObserver?.disconnect()
  },
  methods: {
    achievementLabel(id) {
      const labels = {
        first_steps: 'First Steps',
        consistent: 'Consistent',
        reviser: 'Reviser',
        dedicated: 'Dedicated',
        focused: 'Focused',
        growing: 'Growing',
        checker: 'Checker',
        memoriser: 'Memoriser',
        explorer: 'Explorer',
        steadfast: 'Steadfast',
      }
      return labels[id] || id
    },
    chartKey(name) {
      return `${name}-${this.from}-${this.to}-${this.theme.text}-${this.report?.generated_at || ''}`
    },
    preset(days) {
      this.today = londonToday()
      this.to = this.today
      this.from = shiftDays(this.today, -(days - 1))
      this.load()
    },
    applyCustom() {
      this.today = londonToday()
      if (this.from > this.to) {
        this.error = 'The start date must be on or before the end date.'
        return
      }
      if (this.to > this.today) {
        this.error = 'The end date cannot be after today.'
        return
      }
      const span = Math.round((Date.parse(`${this.to}T00:00:00Z`) - Date.parse(`${this.from}T00:00:00Z`)) / 86400000)
      if (span > 120) {
        this.error = 'Choose a range of 120 days or fewer.'
        return
      }
      this.load()
    },
    async load({ refresh = false } = {}) {
      this.requestSeq += 1
      const seq = this.requestSeq
      this.controller?.abort()
      const controller = new AbortController()
      this.controller = controller
      this.loading = true
      this.refreshing = refresh && !!this.report
      this.error = ''
      try {
        const url = new URL(this.auth.api_url || '/api/admin/growth', window.location.origin)
        url.searchParams.set('from', this.from)
        url.searchParams.set('to', this.to)
        if (refresh) url.searchParams.set('refresh', '1')
        const headers = { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
        if (this.auth.csrf_token) headers['X-CSRF-TOKEN'] = this.auth.csrf_token
        const response = await fetch(url, { headers, credentials: 'same-origin', signal: controller.signal })
        const body = await response.json().catch(() => ({}))
        if (seq !== this.requestSeq) return
        if (!response.ok) {
          this.error = body.message || 'Growth metrics could not be loaded.'
          return
        }
        this.report = body
      } catch (error) {
        if (error?.name === 'AbortError' || seq !== this.requestSeq) return
        this.error = 'Growth metrics could not be loaded.'
      } finally {
        if (seq === this.requestSeq) {
          this.loading = false
          this.refreshing = false
        }
      }
    },
    readTheme() {
      const probe = document.createElement('span')
      probe.style.position = 'absolute'
      probe.style.left = '-9999px'
      document.body.appendChild(probe)
      const color = (property, css, fallback) => {
        probe.style.color = css
        const value = getComputedStyle(probe).color
        return value && value !== 'rgba(0, 0, 0, 0)' ? value : fallback
      }
      probe.style.borderTop = '1px solid var(--border)'
      const border = getComputedStyle(probe).borderTopColor
      this.theme = {
        text: color('--text', 'var(--text)', '#1f1a17'),
        muted: color('--text-muted', 'var(--text-muted)', '#554c45'),
        surface: color('--surface-strong', 'var(--surface-strong)', '#ffffff'),
        accent: color('--accent', 'var(--accent)', '#8b5e3c'),
        success: color('--success', 'var(--success)', '#2d6a4f'),
        danger: color('--danger', 'var(--danger)', '#b55041'),
        border: border || 'rgba(78, 58, 38, 0.24)',
        grid: border || 'rgba(78, 58, 38, 0.16)',
      }
      probe.remove()
    },
    percent(rate) {
      if (rate == null || Number.isNaN(Number(rate))) return ''
      const pct = Math.round(Number(rate) * 1000) / 10
      return `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`
    },
    meter(share) {
      const value = Math.max(0, Math.min(1, Number(share) || 0))
      return `${Math.round(value * 1000) / 10}%`
    },
    formatDelta(percent) {
      const value = Number(percent)
      const rounded = Math.round(value * 10) / 10
      const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
      return value > 0 ? `+${text}%` : `${text}%`
    },
    deltaDir(percent) {
      const value = Number(percent)
      if (value > 0) return 'up'
      if (value < 0) return 'down'
      return 'flat'
    },
    formatDay(value) {
      const date = new Date(`${value}T00:00:00Z`)
      if (Number.isNaN(date.getTime())) return value
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London',
        day: 'numeric',
        month: 'short',
      }).format(date)
    },
    formatStamp(value) {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return value
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      }).format(date)
    },
    ageLabel(seconds) {
      const elapsed = Number(seconds) || 0
      if (elapsed < 45) return 'just now'
      const minutes = Math.max(1, Math.round(elapsed / 60))
      if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
      const hours = Math.round(minutes / 60)
      return `${hours} hour${hours === 1 ? '' : 's'} ago`
    },
    grainLabel(grain) {
      return grain === 'week' ? 'Weekly' : 'Daily'
    },
    funnelLabel(label) {
      const map = {
        Registered: 'Registered',
        'Started first session': 'Started',
        'Completed first session': 'Completed',
        'Returned for another session': 'Returned',
        'Started first session and Completed first session': 'Start → complete',
        'Completed first session and Returned for another session': 'Complete → return',
      }
      return map[label] || String(label).replace(/ first session/gi, '').replace(/ for another session/gi, '')
    },
    cohortCell(cell) {
      if (!cell || cell.status !== 'ready') return 'Waiting'
      return `${this.percent(cell.rate)} (${cell.retained}/${cell.eligible})`
    },
  },
}
</script>

<style scoped>
.growth {
  --growth-sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --growth-max: 920px;
  width: min(var(--growth-max), 100%);
  margin: 0 auto;
  padding: 16px clamp(12px, 3vw, 20px) 32px;
  color: var(--text);
  font-family: var(--growth-sans);
  font-size: 14px;
  line-height: 1.4;
  letter-spacing: -0.011em;
  font-variant-numeric: tabular-nums lining-nums;
}
.growth :where(button, .btn, [role="button"]) {
  min-width: 0;
  min-height: 32px;
}
.growth__hero {
  display: grid;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-strong);
}
@media (min-width: 720px) {
  .growth__hero {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: 16px;
  }
}
.growth__hero-main { min-width: 0; }
.growth__kicker {
  margin: 0 0 2px;
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--accent);
}
.growth h1 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 650;
  letter-spacing: -0.028em;
  line-height: 1.15;
}
.growth__lede,
.growth__kpi p,
.growth__footnote,
.growth__meta {
  margin: 2px 0 0;
  color: var(--text-muted);
  line-height: 1.35;
  font-size: 12.5px;
}
.growth__lede {
  max-width: 36rem;
  margin-top: 4px;
}
.growth__period {
  display: inline-flex;
  margin: 8px 0 0;
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--surface-soft);
  color: var(--text-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums lining-nums;
}
.growth__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}
.growth__presets,
.growth__custom {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.growth__presets {
  gap: 0;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}
.growth__custom label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}
.growth button,
.growth input {
  font: inherit;
  letter-spacing: -0.011em;
  color: var(--text);
}
.growth button {
  width: auto;
  min-width: 0;
}
.growth input[type="date"] {
  min-width: 0;
  color-scheme: inherit;
}
.growth__presets button,
.growth__apply,
.growth__refresh,
.growth__callout button {
  min-height: 32px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  transition: background var(--dur) var(--ease-out), color var(--dur) var(--ease-out);
}
.growth__apply,
.growth__refresh,
.growth__callout button {
  border-color: var(--border);
  background: var(--surface-strong);
}
.growth__presets button[aria-pressed="true"],
.growth__apply {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--surface-strong);
}
.growth button:hover:not(:disabled) {
  background: var(--surface-soft);
}
.growth__presets button[aria-pressed="true"]:hover:not(:disabled),
.growth__apply:hover:not(:disabled) {
  background: var(--accent);
}
.growth button:disabled {
  cursor: progress;
  opacity: 0.7;
}
.growth button:focus-visible,
.growth input:focus-visible {
  outline: none;
  box-shadow: var(--ring);
}
.growth input {
  height: 32px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface-strong);
  padding: 0 8px;
}
.growth__status,
.growth__callout {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  align-items: center;
  margin: 8px 0 0;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 12.5px;
}
.growth__callout p {
  margin: 0;
  color: inherit;
  font-size: inherit;
  line-height: 1.35;
}
.growth__status[data-tone="live"] { color: var(--success-strong, var(--success)); }
.growth__status-meta {
  color: var(--text-muted);
  font-size: 12px;
}
.growth__status-meta::before {
  content: "·";
  margin-inline: 6px;
  opacity: 0.6;
}
.growth__callout[data-tone="warn"] { background: var(--warning-soft, var(--surface-soft)); color: var(--text); }
.growth__callout--note {
  margin: 0 0 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--surface-soft);
  border: 0;
  color: var(--text);
  font-size: 12.5px;
}
.growth__callout--note strong { font-weight: 600; }
.growth__body {
  display: grid;
  gap: 20px;
  margin-top: 14px;
}
.growth__section { margin: 0; display: grid; gap: 10px; }
.growth__notes {
  align-items: start;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
}
.growth__section-head {
  display: grid;
  gap: 2px;
}
.growth__section-title {
  margin: 0;
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text);
}
.growth__section-desc {
  margin: 0;
  max-width: 42rem;
  color: var(--text-muted);
  font-size: 12.5px;
  line-height: 1.35;
}
.growth__panel-head {
  display: grid;
  gap: 2px;
  margin: 0 0 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}
.growth__panel-head p {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.35;
}
.growth__kpis,
.growth__split,
.growth__retention,
.growth__features {
  display: grid;
  gap: 8px;
}
.growth__kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); }
@media (min-width: 1040px) {
  .growth__kpis { grid-template-columns: repeat(6, minmax(0, 1fr)); }
}
.growth__split { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.growth__retention { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.growth__retention article + article {
  padding-left: 10px;
  border-left: 1px solid var(--border);
}
.growth__kpis > *,
.growth__split > *,
.growth__retention > *,
.growth__features > * { min-width: 0; }
.growth__kpi,
.growth__panel,
.growth__skeleton span {
  background: var(--surface-strong);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
}
.growth__panel { position: relative; min-width: 0; }
.growth__panel--features { margin-top: 10px; }
.growth__panel--features .growth__features { margin-top: 0; }
.growth__kpi header,
.growth__source-top,
.growth__features li {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: flex-start;
}
.growth h3,
.growth h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.25;
}
.growth h4 { font-size: 12.5px; font-weight: 600; color: var(--text); }
.growth__kpi strong,
.growth__funnel strong,
.growth__retention strong {
  display: block;
  margin-top: 4px;
  font-size: 1.45rem;
  font-weight: 640;
  letter-spacing: -0.035em;
  line-height: 1.05;
  font-variant-numeric: tabular-nums lining-nums;
}
.growth__quiet {
  font-size: 0.95rem !important;
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.3;
  color: var(--text);
}
.growth__delta {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}
.growth__delta[data-dir="up"] { color: var(--success-strong, var(--success)); }
.growth__delta[data-dir="down"] { color: var(--danger-strong, var(--danger)); }
.growth__delta-note,
.growth__stage-note {
  color: var(--text-muted);
  font-size: 11.5px;
  font-weight: 450;
}
.growth__delta-note { margin-left: 4px; }
.growth__stage-note { margin: 4px 0 0; }
.growth button.growth__info {
  position: relative;
  width: 22px;
  min-height: 22px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1;
  cursor: help;
  flex: 0 0 auto;
}
.growth__tip {
  display: none;
  position: absolute;
  z-index: 2;
  right: 0;
  top: calc(100% + 4px);
  width: min(240px, 70vw);
  padding: 6px 8px;
  border-radius: 8px;
  background: var(--surface-strong);
  border: 1px solid var(--border);
  color: var(--text);
  text-align: left;
  font-size: 12px;
  font-weight: 450;
  line-height: 1.35;
  letter-spacing: -0.011em;
  text-transform: none;
}
.growth__info:hover .growth__tip,
.growth__info:focus .growth__tip,
.growth__info:focus-visible .growth__tip { display: block; }
.growth__body[data-refreshing="true"] { opacity: 0.72; }
.growth__meter {
  height: 5px;
  margin-top: 6px;
  border-radius: 99px;
  background: var(--surface-soft);
  overflow: hidden;
}
.growth__meter span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
}
.growth__meter span[data-muted="true"] { background: var(--text-subtle); }
.growth__sources,
.growth__funnel,
.growth__features,
.growth__insights {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
}
.growth__sources li + li { margin-top: 8px; }
.growth__funnel {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.growth__funnel li {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 0;
  padding: 0 0 0 8px;
  border-left: 1px solid var(--border);
}
.growth__funnel p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.35;
}
.growth__funnel .growth__quiet,
.growth__retention .growth__quiet {
  margin-top: 4px;
  font-size: 12px !important;
}
.growth__funnel li:first-child { padding-left: 0; border-left: 0; }
.growth__funnel li + li { margin-top: 0; }
.growth__features {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0 16px;
  margin-top: 4px;
}
.growth__features li {
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}
.growth__features li:last-child { border-bottom: 0; }
.growth__features li > div p {
  margin: 2px 0 0;
  color: var(--text-muted);
  font-size: 12px;
}
.growth__insights li {
  position: relative;
  padding: 3px 0 3px 12px;
  line-height: 1.35;
}
.growth__insights li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
}
.growth__empty {
  margin: 4px 0 0;
  color: var(--text-muted);
}
.growth__table-wrap {
  margin-top: 10px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.growth table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.growth caption {
  caption-side: bottom;
  padding-top: 6px;
  text-align: left;
  color: var(--text-muted);
  font-size: 12px;
}
.growth th,
.growth td {
  text-align: left;
  padding: 5px 10px 5px 0;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
.growth table.growth__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.growth__skeleton { margin-top: 12px; }
.growth__skeleton span {
  min-height: 84px;
  background: linear-gradient(90deg, var(--surface-soft), var(--surface-strong), var(--surface-soft));
  background-size: 200% 100%;
  animation: growth-shimmer 1.1s ease-in-out infinite;
}
.growth__skeleton .growth__split span { min-height: 180px; }
@keyframes growth-shimmer {
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
}
@media (max-width: 860px) {
  .growth__kpis,
  .growth__features { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .growth__funnel { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .growth__funnel li:nth-child(3) { padding-left: 0; border-left: 0; }
}
@media (max-width: 720px) {
  .growth { padding: 10px 12px 24px; }
  .growth__split,
  .growth__retention,
  .growth__features { grid-template-columns: 1fr; }
  .growth__retention article + article {
    padding-left: 0;
    border-left: 0;
    padding-top: 8px;
    border-top: 1px solid var(--border);
  }
  .growth__kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .growth__funnel { grid-template-columns: 1fr 1fr; }
  .growth__custom,
  .growth__presets { width: 100%; }
  .growth__custom label { flex: 1; }
  .growth__custom input { width: 100%; min-width: 0; }
}
@media (max-width: 380px) {
  .growth__kpis,
  .growth__funnel { grid-template-columns: 1fr 1fr; }
  .growth__kpi,
  .growth__panel { padding: 8px 10px; }
}
</style>
