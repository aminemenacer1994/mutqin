<template>
  <div
    class="parent-homework-toolbar__filters student-activity__filter-fields"
    :class="{ 'is-expanded': expanded }"
  >
    <label class="parent-report-field">
      <span class="parent-report-field__label">{{ t('dashboard.activity_filter_area') }}</span>
      <select
        class="parent-report-select"
        :value="area"
        :aria-label="t('dashboard.activity_filter_area')"
        @change="onAreaChange"
      >
        <option v-for="option in areaOptions" :key="option.key" :value="option.key">{{ option.label }}</option>
      </select>
    </label>
    <label class="parent-report-field">
      <span class="parent-report-field__label">{{ t('dashboard.activity_filter_status') }}</span>
      <select
        class="parent-report-select"
        :value="status"
        :aria-label="t('dashboard.activity_filter_status')"
        @change="onStatusChange"
      >
        <option v-for="option in statusOptions" :key="option.key" :value="option.key">{{ option.label }}</option>
      </select>
    </label>
    <label class="parent-report-field parent-homework-date">
      <span class="parent-report-field__label">{{ t('dashboard.activity_from') }}</span>
      <span class="parent-date">
        <input
          type="date"
          :value="from"
          :aria-label="t('dashboard.activity_from')"
          @change="$emit('from', $event.target.value)"
        >
      </span>
    </label>
    <label class="parent-report-field parent-homework-date">
      <span class="parent-report-field__label">{{ t('dashboard.activity_to') }}</span>
      <span class="parent-date">
        <input
          type="date"
          :value="to"
          :aria-label="t('dashboard.activity_to')"
          @change="$emit('to', $event.target.value)"
        >
      </span>
    </label>
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'

export default {
  name: 'StudentActivityFilters',
  mixins: [i18nMixin],
  props: {
    area: { type: String, default: 'all' },
    status: { type: String, default: 'all' },
    from: { type: String, default: '' },
    to: { type: String, default: '' },
    expanded: { type: Boolean, default: false },
    areaOptions: { type: Array, default: () => [] },
    statusOptions: { type: Array, default: () => [] },
  },
  emits: ['area', 'status', 'from', 'to'],
  methods: {
    onAreaChange(event) {
      this.$emit('area', event.target.value || 'all')
    },
    onStatusChange(event) {
      this.$emit('status', event.target.value || 'all')
    },
  },
}
</script>