<template>
  <ul class="teacher-list teacher-list--inset teacher-list--bordered">
    <li v-for="(row, index) in rows" :key="rowKey(row, index)">
      <button v-if="row.action" type="button" class="teacher-list__btn" @click="$emit('action', row.action || row)">
        {{ row.primary }}
      </button>
      <strong v-else-if="row.strong">{{ row.primary }}</strong>
      <span v-else>{{ row.primary }}</span>
      <span v-if="row.secondary">{{ row.secondary }}</span>
      <span v-if="row.tertiary" class="teacher-actions">
        <slot name="actions" :row="row" />
      </span>
    </li>
  </ul>
</template>

<script>
export default {
  name: 'TeacherBorderedList',
  props: {
    rows: { type: Array, default: () => [] },
    rowKeyField: { type: String, default: 'id' },
  },
  emits: ['action'],
  methods: {
    rowKey(row, index) {
      return row[this.rowKeyField] ?? index
    },
  },
}
</script>
