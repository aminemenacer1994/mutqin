<template>
  <ul class="teacher-list teacher-list--inset teacher-list--bordered">
    <li v-for="(row, index) in rows" :key="rowKey(row, index)">
      <span class="teacher-list__avatar" aria-hidden="true">{{ initial(row.primary) }}</span>
      <button v-if="row.action" type="button" class="teacher-list__btn" @click="$emit('action', row.action || row)">
        {{ row.primary }}
      </button>
      <strong v-else-if="row.strong" class="teacher-list__btn">{{ row.primary }}</strong>
      <span v-else>{{ row.primary }}</span>
      <span v-if="row.secondary" class="teacher-list__meta">{{ row.secondary }}</span>
      <span v-if="row.tertiary" class="teacher-actions">
        <slot name="actions" :row="row" />
      </span>
    </li>
  </ul>
</template>

<script>
import { studentInitial } from '../../scripts/teacher/formatters'

export default {
  name: 'TeacherBorderedList',
  props: {
    rows: { type: Array, default: () => [] },
    rowKeyField: { type: String, default: 'id' },
  },
  emits: ['action'],
  methods: {
    initial: studentInitial,
    rowKey(row, index) {
      return row[this.rowKeyField] ?? index
    },
  },
}
</script>
