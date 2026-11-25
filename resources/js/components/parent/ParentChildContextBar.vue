<template>
  <div v-if="children.length" class="parent-child-context" :class="{ 'parent-child-context--solo': children.length === 1 }">
    <ParentChildFilter
      v-if="children.length > 1"
      :children="children"
      :selected-id="selectedId"
      :allow-all="allowAll"
      @select="$emit('select', $event)"
    />
    <p v-else class="parent-child-context__solo" role="status">
      <i class="bi bi-person" aria-hidden="true"></i>
      <span>{{ t('parent.showing_child_named', { name: children[0].name }) }}</span>
    </p>
  </div>
</template>

<script>
import ParentChildFilter from './ParentChildFilter.vue'
import { i18nMixin } from '../../mixins/i18nMixin'

export default {
  name: 'ParentChildContextBar',
  components: { ParentChildFilter },
  mixins: [i18nMixin],
  props: {
    children: { type: Array, default: () => [] },
    selectedId: { type: Number, default: null },
    allowAll: { type: Boolean, default: true },
  },
  emits: ['select'],
}
</script>