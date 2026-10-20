<template>
  <div>
    <ul v-if="profile.payload.items?.length" class="teacher-list teacher-list--bordered">
      <li v-for="item in profile.payload.items" :key="item.id">
        <span>{{ item.surah_name }} {{ item.ayah_number }} · {{ item.spot_type }}</span>
        <span>{{ t('teacher.times', { n: item.affected_attempt_count }) }} · {{ formatWhen(item.last_identified_at) }}</span>
      </li>
    </ul>
    <TeacherEmpty v-else :message="t('teacher.weak_empty')" />
  </div>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import TeacherEmpty from '../TeacherEmpty.vue'

export default {
  name: 'TeacherStudentProfileWeak',
  components: { TeacherEmpty },
  mixins: [i18nMixin],
  props: {
    profile: { type: Object, required: true },
    formatWhen: { type: Function, required: true },
  },
}
</script>
