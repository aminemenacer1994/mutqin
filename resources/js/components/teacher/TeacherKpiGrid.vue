<template>
  <div class="teacher-kpis" :class="{ 'teacher-kpis--compact': compact }">
    <button
      v-for="(card, index) in cards"
      :key="card.key"
      type="button"
      class="teacher-stat-card"
      :class="`teacher-stat-card--${card.key}`"
      :style="stagger ? { '--dash-delay': `${index * 45}ms` } : undefined"
      :disabled="!selectable"
      @click="selectable && $emit('select', card.key)"
    >
      <span class="teacher-stat-card__icon" aria-hidden="true"><i :class="card.icon"></i></span>
      <span class="teacher-stat-card__value dash-num">{{ card.value }}</span>
      <span class="teacher-stat-card__label">{{ card.label }}</span>
      <span v-if="selectable" class="teacher-stat-card__action">
        {{ card.action || t('teacher.open') }}
        <i class="bi bi-arrow-right-short" aria-hidden="true"></i>
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
