<template>
  <span class="learner-task-range">
    <span v-if="arabicName" class="learner-task-range__ar" dir="rtl" lang="ar">{{ arabicName }}</span>
    <span v-if="arabicName && englishName" class="learner-task-range__sep" aria-hidden="true"> · </span>
    <span v-if="englishName" class="learner-task-range__en">{{ englishName }}</span>
    <span v-if="ayahLabel" class="learner-task-range__sep" aria-hidden="true"> · </span>
    <span v-if="ayahLabel" class="learner-task-range__ayahs">{{ ayahLabel }}</span>
  </span>
</template>

<script>
import { formatAyahRangeLabel } from '../../scripts/formatting/ayahLabels'

export default {
  name: 'LearnerTaskRange',
  props: {
    assignment: { type: Object, default: null },
    arabicName: { type: String, default: '' },
    t: { type: Function, default: null },
  },
  computed: {
    englishName() {
      return String(this.assignment?.surah_name || '').trim()
    },
    ayahLabel() {
      const start = this.assignment?.ayah_start
      const end = this.assignment?.ayah_end ?? start
      if (start == null) return ''
      const range = formatAyahRangeLabel({ from: start, to: end }, this.t)
      if (range.startsWith('Ayah ') || range.startsWith('Ayahs ')) {
        return range.replace(/^Ayahs? /, '')
      }
      return range
    },
  },
}
</script>
