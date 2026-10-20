<template>
  <div class="teacher-kpis" :class="{ 'teacher-kpis--compact': compact }">
    <article
      v-for="(card, index) in cards"
      :key="card.key"
      class="dash-analytic"
      :style="stagger ? { '--dash-delay': `${index * 45}ms` } : undefined"
    >
      <span v-if="card.icon" class="dash-analytic__icon" :class="`dash-analytic__icon--${card.tone || 'accent'}`" aria-hidden="true">
        <i :class="card.icon"></i>
      </span>
      <p class="dash-analytic__value dash-num">{{ card.value }}</p>
      <p class="dash-analytic__label">{{ card.label }}</p>
    </article>
  </div>
</template>

<script>
export default {
  name: 'TeacherKpiGrid',
  props: {
    cards: { type: Array, default: () => [] },
    compact: { type: Boolean, default: false },
    stagger: { type: Boolean, default: false },
  },
}
</script>
