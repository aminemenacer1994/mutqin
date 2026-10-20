<template>
  <ul class="teacher-records">
    <li v-for="(row, index) in rows" :key="row.key ?? index" class="teacher-records__item">
      <span class="teacher-records__icon" :class="row.iconTone ? `teacher-records__icon--${row.iconTone}` : ''" aria-hidden="true">
        <i :class="row.icon || 'bi bi-dot'"></i>
      </span>
      <div class="teacher-records__copy">
        <span class="teacher-records__title" :class="{ 'teacher-quran': row.quran }">{{ row.title }}</span>
        <span v-if="row.hint" class="teacher-records__hint">{{ row.hint }}</span>
      </div>
      <div class="teacher-records__aside">
        <span
          v-if="row.badge"
          class="teacher-badge"
          :class="row.badgeTone ? `teacher-badge--${row.badgeTone}` : 'teacher-badge--muted'"
        >{{ row.badge }}</span>
        <button
          v-if="row.actionLabel"
          type="button"
          class="dash-btn dash-btn--ghost dash-btn--sm"
          @click="$emit('action', row.actionPayload)"
        >
          {{ row.actionLabel }}
        </button>
      </div>
    </li>
  </ul>
</template>

<script>
export default {
  name: 'TeacherRecordList',
  props: {
    rows: { type: Array, default: () => [] },
  },
  emits: ['action'],
}
</script>
