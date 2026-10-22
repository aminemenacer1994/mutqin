<template>
  <div class="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3 teacher-kpis" :class="{ 'teacher-kpis--compact': compact }">
    <button
      v-for="(card, index) in cards"
      :key="card.key"
      type="button"
      class="col card btn text-start teacher-stat-card h-100"
      :class="`teacher-stat-card--${card.key}`"
      :aria-label="`${card.label}: ${card.value}. ${card.action || t('teacher.open')}`"
      :style="stagger ? { '--dash-delay': `${index * 45}ms` } : undefined"
      :disabled="!selectable"
      @click="selectable && $emit('select', card.key)"
    >
      <span class="teacher-stat-card__icon" aria-hidden="true"><i :class="card.icon"></i></span>
      <span class="teacher-stat-card__value dash-num">{{ card.value }}</span>
      <span class="teacher-stat-card__label">{{ card.label }}</span>
      <span v-if="card.description" class="teacher-stat-card__description">{{ card.description }}</span>
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
