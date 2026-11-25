<template>
  <section class="learner-my-plan" :aria-label="t('teacher.learner_my_plan')">
    <header class="learner-my-plan__head">
      <span class="learner-my-plan__mark" aria-hidden="true"><i class="bi bi-map"></i></span>
      <div class="learner-my-plan__heading-copy">
        <p class="learner-my-plan__eyebrow">{{ t('teacher.learner_my_plan') }}</p>
        <h3 class="learner-my-plan__title">{{ plan?.title || t('teacher.learner_my_plan_empty_title') }}</h3>
        <p v-if="plan?.teacher_name" class="learner-my-plan__teacher">{{ t('teacher.teacher') }} · {{ plan.teacher_name }}</p>
      </div>
      <span v-if="plan" class="learner-my-plan__status" :class="`is-${plan.status}`">{{ statusLabel(plan.status) }}</span>
    </header>
    <p v-if="!plan" class="learner-my-plan__empty">{{ t('teacher.learner_my_plan_empty') }}</p>
    <template v-if="plan">
    <div v-if="plan.student_goal" class="learner-my-plan__goal">
      <i class="bi bi-bullseye" aria-hidden="true"></i>
      <div><span>{{ t('teacher.learner_plan_goal') }}</span><strong>{{ plan.student_goal }}</strong></div>
    </div>

    <dl class="learner-my-plan__facts">
      <div><dt>{{ t('teacher.learner_plan_progress') }}</dt><dd>{{ plan.progress?.completed || 0 }}<small>/ {{ plan.progress?.total || 0 }}</small></dd></div>
      <div><dt>{{ t('teacher.learner_plan_validated') }}</dt><dd>{{ plan.progress?.validated_memorised_ayahs || 0 }}</dd></div>
      <div><dt>{{ t('teacher.learner_plan_upcoming') }}</dt><dd>{{ plan.progress?.upcoming_lessons || 0 }}</dd></div>
      <div><dt>{{ t('teacher.learner_plan_revision_due') }}</dt><dd>{{ plan.progress?.revision_due || 0 }}</dd></div>
    </dl>

    <div
      class="learner-my-plan__meter"
      role="progressbar"
      :aria-valuemin="0"
      :aria-valuemax="100"
      :aria-valuenow="progressPercent"
      :aria-label="progressLabel"
    >
      <span class="learner-my-plan__meter-fill" :style="meterStyle"></span>
    </div>
    <p class="learner-my-plan__meter-label"><span>{{ progressLabel }}</span><strong>{{ progressPercent }}%</strong></p>

    <p v-if="plan.status === 'paused'" class="learner-my-plan__note">{{ t('teacher.plan_paused_student') }}</p>
    <div v-else-if="nextAction" class="learner-my-plan__next">
      <div class="learner-my-plan__next-copy">
        <p class="learner-my-plan__next-kicker"><i class="bi bi-flag" aria-hidden="true"></i>{{ t('teacher.plan_next_milestone') }}</p>
        <p class="learner-my-plan__next-label">{{ nextAction.label }}</p>
        <p class="learner-my-plan__next-due">{{ activityLabel(nextAction) }} · {{ stageLabel(nextAction) }}<template v-if="nextAction.due_on"> · {{ t('teacher.due') }} {{ nextAction.due_on }}</template></p>
      </div>
      <button
        v-if="showContinue && nextRecipient"
        type="button"
        class="dash-btn dash-btn--primary dash-btn--sm"
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
        <span class="learner-my-plan__week-copy">
          <span class="learner-my-plan__week-label">{{ item.label }}</span>
          <small>{{ activityLabel(item) }} · {{ stageLabel(item) }}<template v-if="item.due_on"> · {{ item.due_on }}</template></small>
        </span>
        <span class="learner-my-plan__week-status">{{ displayStatusLabel(item.display_status) }}</span>
      </li>
    </ul>
    </template>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import { activityProgressPercent, progressMeterStyle } from '../../scripts/teacher/activityProgress'

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
      return activityProgressPercent(this.plan?.progress?.completed, this.plan?.progress?.total)
    },
    meterStyle() {
      return progressMeterStyle(this.plan?.progress?.completed, this.plan?.progress?.total)
    },
    progressLabel() {
      return this.t('teacher.plan_progress', {
        done: this.plan?.progress?.completed || 0,
        total: this.plan?.progress?.total || 0,
      })
    },
    nextAction() {
      return this.plan?.next_milestone || this.plan?.next_action || null
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
    activityLabel(item) {
      const key = {
        hifz: 'teacher.plan_type_hifz',
        revision: 'teacher.plan_type_sabqi',
        sabqi: 'teacher.plan_type_sabqi',
        manzil: 'teacher.plan_type_manzil',
        nazra: 'teacher.plan_type_nazra',
        ai_recite: 'teacher.plan_type_ai',
        tajweed: 'teacher.assignment_activity_tajweed',
      }[item?.activity]
      return this.t(key || (item?.kind === 'ai_recite' ? 'teacher.plan_type_ai' : 'teacher.plan_kind_practice'))
    },
    stageLabel(item) {
      const key = {
        sabaq: 'teacher.hifz_sabaq',
        sabqi: 'teacher.hifz_sabqi',
        manzil: 'teacher.hifz_manzil',
      }[item?.hifz_category]
      return key ? this.t(key) : ''
    },
  },
}
</script>
