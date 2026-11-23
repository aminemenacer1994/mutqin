<template>
  <div class="student-page-heading">
    <nav :aria-label="crumbLabel">
      <ol class="student-crumb">
        <li v-for="(crumb, index) in crumbs" :key="crumb.id">
          <button v-if="index < crumbs.length - 1" type="button" @click="$emit('select', crumb.id)">{{ crumb.label }}</button>
          <span v-else aria-current="page">{{ crumb.label }}</span>
        </li>
      </ol>
    </nav>
    <TeacherPageHeader :title="title" :subtitle="subtitle" />
  </div>
</template>

<script>
import TeacherPageHeader from '../teacher/TeacherPageHeader.vue'

export default {
  name: 'StudentPageHeading',
  components: { TeacherPageHeader },
  props: {
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    crumbLabel: { type: String, default: 'Breadcrumb' },
    sectionId: { type: String, required: true },
    sectionLabel: { type: String, required: true },
    homeLabel: { type: String, required: true },
  },
  emits: ['select'],
  computed: {
    crumbs() {
      return [
        { id: 'home', label: this.homeLabel },
        { id: this.sectionId, label: this.sectionLabel },
      ]
    },
  },
}
</script>
