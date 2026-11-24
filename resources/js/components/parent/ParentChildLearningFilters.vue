<template>
  <div class="parent-homework-toolbar__filters" :class="{ 'is-expanded': expanded }">
    <label class="parent-report-field">
      <span class="parent-report-field__label">{{ t('parent.filter_category') }}</span>
      <select
        class="parent-report-select"
        :value="activityValue"
        :aria-label="t('parent.filter_category')"
        @change="onActivityChange"
      >
        <option value="">{{ t('parent.filter_all_activities') }}</option>
        <option v-for="item in activities" :key="item" :value="item">{{ activityName(t, item) }}</option>
      </select>
    </label>
    <label class="parent-report-field">
      <span class="parent-report-field__label">{{ t('parent.filter_status') }}</span>
      <select
        class="parent-report-select"
        :value="status"
        :aria-label="t('parent.filter_status')"
        @change="onStatusChange"
      >
        <option v-for="item in statuses" :key="item" :value="item">{{ statusLabel(item) }}</option>
      </select>
    </label>
    <label class="parent-report-field parent-homework-date">
      <span class="parent-report-field__label">{{ t('parent.filter_from_date') }}</span>
      <span class="parent-date">
        <span class="visually-hidden">{{ t('parent.filter_from') }}</span>
        <input
          type="date"
          :value="from"
          :aria-label="t('parent.filter_from')"
          @change="$emit('from', $event.target.value)"
        >
      </span>
    </label>
    <label class="parent-report-field parent-homework-date">
      <span class="parent-report-field__label">{{ t('parent.filter_to_date') }}</span>
      <span class="parent-date">
        <span class="visually-hidden">{{ t('parent.filter_to') }}</span>
        <input
          type="date"
          :value="to"
          :aria-label="t('parent.filter_to')"
          @change="$emit('to', $event.target.value)"
        >
      </span>
    </label>
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { activityName } from '../../scripts/parent/dashboard'

export default {
  name: 'ParentChildLearningFilters',
  mixins: [i18nMixin],
  props: {
    activity: { type: String, default: null },
    status: { type: String, default: 'all' },
    from: { type: String, default: '' },
    to: { type: String, default: '' },
    expanded: { type: Boolean, default: true },
  },
  emits: ['activity', 'status', 'from', 'to'],
  data() {
    return {
      activities: ['nazra', 'hifz', 'tajweed', 'revision'],
      statuses: ['all', 'active', 'overdue', 'completed'],
    }
  },
  computed: {
    activityValue() {
      return this.activity || ''
    },
  },
  methods: {
    activityName,
    onActivityChange(event) {
      const value = event.target.value
      this.$emit('activity', value || null)
    },
    onStatusChange(event) {
      this.$emit('status', event.target.value || 'all')
    },
    statusLabel(item) {
      if (item === 'all') return this.t('parent.filter_all_statuses')
      if (item === 'active') return this.t('parent.filter_status_active')
      const key = `parent.homework_${item}`
      const label = this.t(key)
      return label && label !== key ? label : item
    },
  },
}
</script>