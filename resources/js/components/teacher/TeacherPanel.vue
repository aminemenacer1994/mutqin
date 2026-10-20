<template>
  <section class="dash-section dash-section--flat teacher-panel" :class="{ 'teacher-panel--compact': compact }">
    <div v-if="title || icon || $slots.head" class="dash-section__head">
      <slot name="head">
        <div class="dash-section__title">
          <span v-if="icon" class="dash-section__icon" :class="iconTone" aria-hidden="true">
            <i :class="icon"></i>
          </span>
          <div class="dash-section__title-copy">
            <h2>{{ title }}</h2>
            <p v-if="hint" class="dash-section__hint">{{ hint }}</p>
          </div>
        </div>
      </slot>
      <slot name="actions" />
    </div>
    <div class="dash-section__body dash-section__body--spacious" :class="bodyClass">
      <slot />
    </div>
  </section>
</template>

<script>
export default {
  name: 'TeacherPanel',
  props: {
    title: { type: String, default: '' },
    hint: { type: String, default: '' },
    icon: { type: String, default: '' },
    iconTone: { type: String, default: '' },
    compact: { type: Boolean, default: false },
    bodyClass: { type: [String, Array, Object], default: '' },
  },
}
</script>
