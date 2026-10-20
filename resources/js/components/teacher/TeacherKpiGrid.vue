<template>
  <div class="teacher-kpis" :class="{ 'teacher-kpis--compact': compact }">
    <button
      v-for="(card, index) in cards"
      :key="card.key"
      type="button"
      class="dash-analytic is-action"
      :class="`dash-analytic--${card.tone || 'accent'}`"
      :style="stagger ? { '--dash-delay': `${index * 45}ms` } : undefined"
      :disabled="!selectable"
      @click="selectable && $emit('select', card.key)"
    >
      <span v-if="card.icon" class="dash-analytic__icon" :class="`dash-analytic__icon--${card.tone || 'accent'}`" aria-hidden="true">
        <i :class="card.icon"></i>
      </span>
      <p class="dash-analytic__value dash-num">{{ card.value }}</p>
      <p class="dash-analytic__label">{{ card.label }}</p>
      <span v-if="selectable" class="dash-analytic__action">
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
