<template>
  <article class="card parent-child-card">
    <button type="button" class="parent-child-card__main" @click="$emit('open-profile', child.id)">
      <span class="parent-avatar" aria-hidden="true">{{ initial(child.name) }}</span>
      <span class="parent-child-card__copy">
        <span class="parent-child-card__title-row">
          <strong>{{ child.name }}</strong>
          <span v-if="child.group_name" class="parent-status is-wait parent-child-card__badge">{{ child.group_name }}</span>
        </span>
        <small>{{ teacherLine }}</small>
        <small v-if="learningLine" class="parent-child-card__area">{{ learningLine }}</small>
        <span class="parent-status" :class="`is-${pill.tone}`">
          <i v-if="pill.icon" :class="pill.icon" aria-hidden="true"></i>
          {{ pill.text }}
        </span>
      </span>
      <i class="bi bi-chevron-right parent-child-card__go" aria-hidden="true"></i>
    </button>
    <div class="parent-child-card__actions parent-hub-actions">
      <button v-if="child.permissions?.assignments" type="button" @click="$emit('open-learning', child.id)">
        <i class="bi bi-journal-check" aria-hidden="true"></i>{{ t('parent.home_homework') }}
      </button>
      <button v-if="child.permissions?.progress" type="button" @click="$emit('open-progress', child.id)">
        <i class="bi bi-graph-up-arrow" aria-hidden="true"></i>{{ t('parent.home_progress') }}
      </button>
    </div>
  </article>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { initial, learningLabel } from '../../scripts/parent/dashboard'
import { childHomeworkPill } from '../../scripts/parent/homeDashboard'

export default {
  name: 'ParentHomeChildCard',
  mixins: [i18nMixin],
  props: {
    child: { type: Object, required: true },
    homework: { type: Array, default: () => [] },
  },
  emits: ['open-learning', 'open-progress', 'open-profile'],
  computed: {
    teacherLine() {
      const name = this.child.teachers?.[0]?.name
      return name ? this.t('parent.home_teacher_line', { name }) : this.t('parent.teachers_empty')
    },
    learningLine() {
      if (!this.child.permissions?.progress) return ''
      return learningLabel(this.t, this.child.learning) || ''
    },
    pill() {
      return childHomeworkPill(this.t, this.child, this.homework)
    },
  },
  methods: { initial },
}
</script>