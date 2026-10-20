<template>
  <article class="teacher-student-card">
    <header class="teacher-student-card__head">
      <div>
        <button type="button" class="teacher-student-card__name" @click="$emit('open', student.id)">
          {{ student.name }}
        </button>
        <p class="teacher-student-card__meta">{{ groupLabel }}</p>
      </div>
    </header>
    <dl class="teacher-student-card__metrics">
      <div v-for="metric in metrics" :key="metric.key">
        <dt>{{ metric.label }}</dt>
        <dd>{{ metric.value }}</dd>
      </div>
    </dl>
  </article>
</template>

<script>
export default {
  name: 'TeacherStudentCard',
  props: {
    student: { type: Object, required: true },
    groupLabel: { type: String, required: true },
    metrics: { type: Array, default: () => [] },
  },
  emits: ['open'],
}
</script>
