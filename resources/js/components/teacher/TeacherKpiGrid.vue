<template>
  <div
    class="teacher-metric-strip"
    :class="{ 'teacher-metric-strip--compact': compact, 'teacher-kpis': true }"
    role="list"
  >
    <button
      v-for="(card, index) in cards"
      :key="card.key"
      type="button"
      class="teacher-metric"
      :class="[
        `teacher-metric--${card.key}`,
        { 'teacher-metric--selectable': selectable },
      ]"
      :aria-label="`${card.label}: ${card.value}. ${card.action || t('teacher.open')}`"
      :title="card.hint || undefined"
      :style="stagger ? { '--dash-delay': `${index * 45}ms` } : undefined"
      :disabled="!selectable"
      @click="selectable && $emit('select', card.key)"
    >
      <span class="teacher-metric__icon" aria-hidden="true"><i :class="card.icon"></i></span>
      <span class="teacher-metric__copy">
        <span class="teacher-metric__value dash-num">{{ card.value }}</span>
        <span class="teacher-metric__label">{{ card.label }}</span>
      </span>
      <span v-if="selectable" class="teacher-metric__action" aria-hidden="true">
        <i class="bi bi-arrow-right-short"></i>
      </span>
    </button>
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'

export default {
  name: 'TeacherKpiGrid',
  mixins: [i18nMixin],
  props: {
    cards: { type: Array, default: () => [] },
    compact: { type: Boolean, default: false },
    stagger: { type: Boolean, default: false },
    selectable: { type: Boolean, default: false },
  },
  emits: ['select'],
}
</script>
