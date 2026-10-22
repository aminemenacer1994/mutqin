<template>
  <div v-if="remaining > 0 || shown > initial" class="teacher-more__actions">
  <button
    v-if="remaining > 0"
    type="button"
    class="dash-text-link teacher-more"
    :disabled="loading"
    @click="$emit('more')"
  >
    {{ loading ? t('teacher.loading') : t('teacher.load_more') }}
  </button>
  <button
    v-if="shown > initial"
    type="button"
    class="dash-text-link teacher-more teacher-more--less"
    :disabled="loading"
    @click="$emit('less')"
  >
    {{ t('teacher.show_less') }}
  </button>
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'

export default {
  name: 'TeacherMore',
  mixins: [i18nMixin],
  props: {
    remaining: { type: Number, default: 0 },
    loading: { type: Boolean, default: false },
    shown: { type: Number, default: 0 },
    initial: { type: Number, default: 5 },
  },
  emits: ['more', 'less'],
}
</script>
