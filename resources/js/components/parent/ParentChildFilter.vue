<template>
  <div v-if="children.length" class="parent-pills" role="group" :aria-label="t('parent.child_filter')">
    <button
      v-if="allowAll"
      type="button"
      :class="{ 'is-active': !selectedId }"
      :aria-pressed="!selectedId ? 'true' : 'false'"
      @click="$emit('select', null)"
    >
      <i class="bi bi-people" aria-hidden="true"></i>
      {{ t('parent.child_all') }}
    </button>
    <button
      v-for="child in children"
      :key="child.id"
      type="button"
      :class="{ 'is-active': selectedId === child.id }"
      :aria-pressed="selectedId === child.id ? 'true' : 'false'"
      @click="$emit('select', child.id)"
    >
      <i class="bi bi-person" aria-hidden="true"></i>
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
    allowAll: { type: Boolean, default: true },
  },
  emits: ['select'],
}
</script>
