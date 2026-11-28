<template>
  <header class="teacher-mushaf-review__chrome">
    <div class="teacher-mushaf-review__row">
      <div class="teacher-segmented teacher-segmented--compact" role="group" :aria-label="t('teacher.mushaf_surface_group')">
        <button
          type="button"
          class="teacher-segmented__btn"
          :class="{ 'is-active': surface === 'lines' }"
          :aria-pressed="surface === 'lines'"
          @click="$emit('update:surface', 'lines')"
        >{{ t('teacher.mushaf_surface_lines_short') }}</button>
        <button
          type="button"
          class="teacher-segmented__btn"
          :class="{ 'is-active': surface === 'page' }"
          :aria-pressed="surface === 'page'"
          @click="$emit('update:surface', 'page')"
        >{{ t('teacher.mushaf_surface_page_short') }}</button>
      </div>
      <div
        v-if="surface === 'page'"
        class="teacher-segmented teacher-segmented--compact"
        role="group"
        :aria-label="t('teacher.mushaf_interaction_group')"
      >
        <button
          type="button"
          class="teacher-segmented__btn"
          :class="{ 'is-active': interactionMode === 'reading' }"
          :aria-pressed="interactionMode === 'reading'"
          :title="t('teacher.mushaf_mode_reading_help_short')"
          @click="$emit('update:interactionMode', 'reading')"
        >{{ t('teacher.mushaf_mode_reading_short') }}</button>
        <button
          type="button"
          class="teacher-segmented__btn"
          :class="{ 'is-active': interactionMode === 'marking' }"
          :aria-pressed="interactionMode === 'marking'"
          :title="t('teacher.mushaf_mode_marking_help_short')"
          @click="$emit('update:interactionMode', 'marking')"
        >{{ t('teacher.mushaf_mode_marking_short') }}</button>
      </div>
    </div>
  </header>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'

export default {
  name: 'TeacherMushafReviewChrome',
  mixins: [i18nMixin],
  props: {
    surface: { type: String, default: 'page' },
    interactionMode: { type: String, default: 'reading' },
  },
  emits: ['update:surface', 'update:interactionMode'],
}
</script>