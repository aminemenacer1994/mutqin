<template>
  <section class="waiting-analytics" aria-labelledby="waiting-analytics-title">
    <header class="waiting-analytics__head">
      <div>
        <h2 id="waiting-analytics-title">Waiting List Analytics</h2>
        <p>Calendar days in UTC. Sources and campaigns are based on visitor-supplied data.</p>
      </div>
      <button type="button" class="admin-btn admin-btn--ghost admin-btn--sm" :disabled="loading" @click="load">Refresh</button>
    </header>
    <p v-if="loading && !report" role="status">Loading analytics…</p>
    <p v-else-if="error" role="alert">Could not load analytics. Please try again.</p>
    <template v-if="report">
      <div class="waiting-analytics__summary">
        <div v-for="metric in metrics" :key="metric.label" class="waiting-analytics__card">
          <span>{{ metric.label }}</span><strong>{{ metric.value }}</strong>
        </div>
      </div>
      <div class="waiting-analytics__grid">
        <div v-for="section in sections" :key="section.title" class="waiting-analytics__card">
          <h3>{{ section.title }}</h3>
          <p v-if="!section.rows.length">No registrations yet.</p>
          <dl v-else class="waiting-analytics__list">
            <div v-for="row in section.rows" :key="row.label"><dt>{{ label(row.label, section.campaign) }}</dt><dd>{{ row.total }}</dd></div>
          </dl>
        </div>
        <div class="waiting-analytics__card waiting-analytics__trend">
          <h3>Daily registrations · last 30 days</h3>
          <div class="waiting-analytics__days" aria-label="Daily registration counts">
            <div v-for="day in report.daily" :key="day.day" class="waiting-analytics__day">
              <span>{{ day.day }}</span>
              <span class="waiting-analytics__bar" aria-hidden="true"><i :style="{ width: `${day.total / maxDaily * 100}%` }"></i></span>
              <strong>{{ day.total }}</strong>
            </div>
          </div>
        </div>
      </div>
      <p class="waiting-analytics__note">Unknown includes registrations without attribution, including historical entries. Campaigns show the last touch. Counts may differ from Meta because consent and browser delivery affect Pixel events.</p>
    </template>
  </section>
</template>

<script>
import { adminApi } from '../scripts/api/admin'

export default {
  data: () => ({ report: null, loading: false, error: false }),
  computed: {
    metrics() {
      const s = this.report.summary
      return [
        { label: 'Total registrations', value: s.total }, { label: 'Today', value: s.today },
        { label: 'Last 7 days', value: s.last_7_days }, { label: 'Last 30 days', value: s.last_30_days },
      ]
    },
    sections() {
      return [
        { title: 'First-touch sources', rows: this.report.first_sources },
        { title: 'Last-touch sources', rows: this.report.last_sources },
        { title: 'Last-touch campaigns', rows: this.report.campaigns, campaign: true },
      ]
    },
    maxDaily() { return Math.max(1, ...this.report.daily.map((day) => day.total)) },
  },
  mounted() { this.load() },
  methods: {
    label(value, campaign) {
      if (value === 'unknown') return campaign ? 'No campaign' : 'Unknown / unattributed'
      return campaign ? value : ({ meta_ads: 'Meta Ads', google: 'Google', instagram: 'Instagram', facebook: 'Facebook', direct: 'Direct', referral: 'Referrals' }[value] || value)
    },
    async load() {
      this.loading = true
      this.error = false
      try { this.report = await adminApi.getWaitingListAnalytics() } catch { this.error = true } finally { this.loading = false }
    },
  },
}
</script>
