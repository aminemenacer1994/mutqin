<template>
  <div v-if="children.length" class="dash-range-toggle" role="group" :aria-label="t('parent.child_filter')">
    <button
      type="button"
      class="dash-btn dash-btn--ghost dash-btn--sm"
      :class="{ 'is-active': !selectedId }"
      :aria-pressed="!selectedId ? 'true' : 'false'"
      @click="$emit('select', null)"
    >
      {{ t('parent.child_all') }}
    </button>
    <button
      v-for="child in children"
      :key="child.id"
      type="button"
      class="dash-btn dash-btn--ghost dash-btn--sm"
      :class="{ 'is-active': selectedId === child.id }"
      :aria-pressed="selectedId === child.id ? 'true' : 'false'"
      @click="$emit('select', child.id)"
    >
      {{ child.name }}
    </button>
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'

export default {
  name: 'ParentChildFilter',
  mixins: [i18nMixin],
  props: {
    children: { type: Array, default: () => [] },
    selectedId: { type: Number, default: null },
  },
  emits: ['select'],
}
</script>
