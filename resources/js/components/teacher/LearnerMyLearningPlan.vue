<template>
  <section class="learner-my-plan" :aria-label="t('teacher.learner_my_plan')">
    <header class="learner-my-plan__head">
      <div>
        <p class="learner-my-plan__eyebrow">{{ t('teacher.learner_my_plan') }}</p>
        <h3 class="learner-my-plan__title">{{ plan?.title || t('teacher.learner_my_plan_empty_title') }}</h3>
      </div>
      <span v-if="plan" class="learner-my-plan__status" :class="`is-${plan.status}`">{{ statusLabel(plan.status) }}</span>
    </header>
    <p v-if="!plan" class="learner-my-plan__empty">{{ t('teacher.learner_my_plan_empty') }}</p>
    <template v-if="plan">
    <dl class="learner-my-plan__facts">
      <div v-if="plan.student_goal">
        <dt><i class="bi bi-bullseye" aria-hidden="true"></i>{{ t('teacher.learner_plan_goal') }}</dt>
        <dd>{{ plan.student_goal }}</dd>
      </div>
      <div v-if="plan.teacher_name">
        <dt><i class="bi bi-person" aria-hidden="true"></i>{{ t('teacher.teacher') }}</dt>
        <dd>{{ plan.teacher_name }}</dd>
      </div>
      <div>
        <dt><i class="bi bi-check2-circle" aria-hidden="true"></i>{{ t('teacher.learner_plan_progress') }}</dt>
        <dd>{{ progressLabel }}</dd>
      </div>
    </dl>

    <div
      class="learner-my-plan__meter"
      role="progressbar"
      :aria-valuemin="0"
      :aria-valuemax="100"
      :aria-valuenow="progressPercent"
      :aria-label="progressLabel"
    >
      <span class="learner-my-plan__meter-fill" :style="{ width: `${progressPercent}%` }"></span>
    </div>

    <p v-if="plan.status === 'paused'" class="learner-my-plan__note">{{ t('teacher.plan_paused_student') }}</p>
    <div v-else-if="nextAction" class="learner-my-plan__next">
      <div class="learner-my-plan__next-copy">
        <p class="learner-my-plan__next-kicker">{{ t('teacher.learner_continue_learning') }}</p>
        <p class="learner-my-plan__next-label">{{ nextAction.label }}</p>
        <p v-if="nextAction.due_on" class="learner-my-plan__next-due">{{ t('teacher.due') }} · {{ nextAction.due_on }}</p>
      </div>
      <button
        v-if="showContinue && nextRecipient"
        type="button"
        class="btn btn-primary btn-sm"
        @click="$emit('continue', nextRecipient)"
      >
        {{ t('teacher.learner_continue_learning') }}
      </button>
    </div>

    <ul class="learner-my-plan__week list-unstyled mb-0">
      <li
        v-for="item in weekItems"
        :key="item.id"
        class="learner-my-plan__week-item"
        :class="[`is-${item.display_status}`]"
      >
        <span class="learner-my-plan__week-label">{{ item.label }}</span>
        <span class="learner-my-plan__week-status">{{ displayStatusLabel(item.display_status) }}</span>
      </li>
    </ul>
    </template>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'

export default {
  name: 'LearnerMyLearningPlan',
  mixins: [i18nMixin],
  props: {
    plan: { type: Object, default: null },
    assignments: { type: Array, default: () => [] },
    showContinue: { type: Boolean, default: true },
  },
  emits: ['continue'],
  computed: {
    progressPercent() {
      return Number(this.plan?.progress?.percent || 0)
    },
    progressLabel() {
      return this.t('teacher.plan_progress', {
        done: this.plan?.progress?.completed || 0,
        total: this.plan?.progress?.total || 0,
      })
    },
    nextAction() {
      return this.plan?.next_action || null
    },
    nextRecipient() {
      const recipientId = this.nextAction?.recipient_id
      if (!recipientId) return null
      return this.assignments.find((row) => Number(row.id) === Number(recipientId)) || null
    },
    weekItems() {
      const items = Array.isArray(this.plan?.items) ? this.plan.items : []
      return items.slice(0, 8)
    },
  },
  methods: {
    statusLabel(value) {
      const key = {
        active: 'teacher.plan_status_active',
        paused: 'teacher.plan_status_paused',
        completed: 'teacher.plan_status_completed',
      }[value]
      return key ? this.t(key) : value
    },
    displayStatusLabel(value) {
      const key = {
        overdue: 'teacher.overdue',
        upcoming: 'teacher.plan_status_upcoming',
        completed: 'teacher.task_filter_completed',
        paused: 'teacher.plan_status_paused',
        planned: 'teacher.plan_status_planned',
        in_progress: 'teacher.task_filter_progress',
        submitted: 'teacher.plan_status_submitted',
      }[value]
      return key ? this.t(key) : value
    },
  },
}
</script>
