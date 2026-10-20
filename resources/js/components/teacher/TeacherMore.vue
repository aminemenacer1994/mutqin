<template>
  <button
    v-if="remaining > 0"
    type="button"
    class="dash-text-link teacher-more"
    :disabled="loading"
    @click="$emit('more')"
  >
    {{ loading ? t('teacher.loading') : t('teacher.load_more') }}
  </button>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'

export default {
  name: 'TeacherMore',
  mixins: [i18nMixin],
  props: {
    remaining: { type: Number, default: 0 },
    loading: { type: Boolean, default: false },
  },
  emits: ['more'],
}
</script>
