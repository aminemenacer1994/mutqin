<template>
  <div class="parent-filter-groups">
    <div class="parent-pills" role="group" :aria-label="t('parent.filter_label')">
      <button
        type="button"
        :class="{ 'is-active': !activity }"
        :aria-pressed="!activity ? 'true' : 'false'"
        @click="$emit('activity', null)"
      >
        {{ t('parent.filter_all_activities') }}
      </button>
      <button
        v-for="item in activities"
        :key="item"
        type="button"
        :class="{ 'is-active': activity === item }"
        :aria-pressed="activity === item ? 'true' : 'false'"
        @click="$emit('activity', item)"
      >
        {{ activityName(t, item) }}
      </button>
    </div>
    <div class="parent-pills" role="group" :aria-label="t('parent.filter_status')">
      <button
        v-for="item in statuses"
        :key="item"
        type="button"
        :class="{ 'is-active': status === item }"
        :aria-pressed="status === item ? 'true' : 'false'"
        @click="$emit('status', item)"
      >
        {{ statusLabel(item) }}
      </button>
    </div>
    <button type="button" class="parent-dates-open" :class="{ 'is-set': from || to }" @click="openDates">
      <i class="bi bi-calendar3" aria-hidden="true"></i>
      {{ dateLabel }}
    </button>
    <DashModalRoot
      :open="datesOpen"
      labelled-by="parent-dates-title"
      root-class="parent-modal-root"
      panel-class="parent-modal parent-modal--dates"
      @close="datesOpen = false"
    >
      <header class="parent-modal__head">
        <div>
          <h2 id="parent-dates-title">{{ t('parent.filter_dates') }}</h2>
          <p>{{ t('parent.filter_dates_hint') }}</p>
        </div>
        <button type="button" class="parent-modal__close" :aria-label="t('parent.modal_close')" @click="datesOpen = false">
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      </header>
      <form class="parent-modal__body" @submit.prevent="applyDates">
        <label class="parent-modal__field">
          <span>{{ t('parent.filter_from') }}</span>
          <input v-model="draftFrom" type="date" />
        </label>
        <label class="parent-modal__field">
          <span>{{ t('parent.filter_to') }}</span>
          <input v-model="draftTo" type="date" />
        </label>
        <div class="parent-modal__actions">
          <button type="button" class="parent-modal__ghost" @click="clearDates">{{ t('parent.filter_clear_dates') }}</button>
          <button type="submit" class="parent-modal__primary">{{ t('parent.filter_apply') }}</button>
        </div>
      </form>
    </DashModalRoot>
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { activityName, formatWhen } from '../../scripts/parent/dashboard'
import DashModalRoot from '../dashboard/DashModalRoot.vue'

export default {
  name: 'ParentChildLearningFilters',
  components: { DashModalRoot },
  mixins: [i18nMixin],
  props: {
    activity: { type: String, default: null },
    status: { type: String, default: 'all' },
    from: { type: String, default: '' },
    to: { type: String, default: '' },
  },
  emits: ['activity', 'status', 'from', 'to'],
  data() {
    return {
      activities: ['nazra', 'hifz', 'tajweed', 'revision'],
      statuses: ['all', 'active', 'overdue', 'completed'],
      datesOpen: false,
      draftFrom: '',
      draftTo: '',
    }
  },
  computed: {
    dateLabel() {
      const from = this.pretty(this.from)
      const to = this.pretty(this.to)
      if (from && to) return `${from} – ${to}`
      if (from) return this.t('parent.filter_from_set', { when: from })
      if (to) return this.t('parent.filter_to_set', { when: to })
      return this.t('parent.filter_dates')
    },
  },
  methods: {
    activityName,
    pretty(value) {
      return value ? formatWhen(`${value}T12:00:00`) : ''
    },
    statusLabel(item) {
      if (item === 'all') return this.t('parent.filter_all_statuses')
      if (item === 'active') return this.t('parent.filter_status_active')
      const key = `parent.homework_${item}`
      const label = this.t(key)
      return label && label !== key ? label : item
    },
    openDates() {
      this.draftFrom = this.from || ''
      this.draftTo = this.to || ''
      this.datesOpen = true
    },
    applyDates() {
      this.$emit('from', this.draftFrom)
      this.$emit('to', this.draftTo)
      this.datesOpen = false
    },
    clearDates() {
      this.draftFrom = ''
      this.draftTo = ''
      this.$emit('from', '')
      this.$emit('to', '')
      this.datesOpen = false
    },
  },
}
</script>
