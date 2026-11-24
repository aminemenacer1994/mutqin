<template>
  <section class="parent-home parent-home-dashboard" aria-labelledby="parent-overview-heading">
    <header class="dash-reveal parent-home-hero">
      <div class="parent-home-hero__row">
        <div class="parent-home-hero__identity">
          <span class="parent-page__icon" aria-hidden="true"><i class="bi bi-house-heart"></i></span>
          <div>
            <p class="parent-home-hero__eyebrow">{{ t('parent.workspace_label') }}</p>
            <h1 id="parent-overview-heading" class="parent-home-hero__title">{{ t('parent.greeting', { name: firstName }) }}</h1>
            <p class="parent-home-hero__subtitle" role="status">{{ statusSubtitle }}</p>
          </div>
        </div>
        <nav v-if="children.length" class="parent-hub-actions" :aria-label="t('parent.home_quick_actions')">
          <button type="button" @click="$emit('open-learning', null)">
            <i class="bi bi-journal-check" aria-hidden="true"></i>{{ t('parent.home_homework') }}
          </button>
          <button type="button" @click="$emit('open-progress', null)">
            <i class="bi bi-graph-up-arrow" aria-hidden="true"></i>{{ t('parent.home_progress') }}
          </button>
          <button type="button" @click="$emit('open-messages', null)">
            <i class="bi bi-chat-heart" aria-hidden="true"></i>{{ t('parent.home_message') }}
          </button>
        </nav>
      </div>
    </header>

    <ConnectPrompt
      v-if="!children.length"
      storage-key="mutqin_connect_prompt_parent"
      :title="t('ui.connections_connect_title')"
      :body="t('ui.connections_prompt_parent')"
      :status="t('ui.connections_status_none')"
    />

    <section v-if="!children.length" class="parent-panel parent-home-empty">
      <TeacherEmpty illustrated icon="bi bi-people" :message="t('parent.children_empty')" />
      <p class="parent-lead">{{ t('parent.home_empty_support') }}</p>
      <div class="parent-hub-actions">
        <button type="button" @click="$emit('open-messages', null)">
          <i class="bi bi-chat-heart" aria-hidden="true"></i>{{ t('parent.home_empty_action_messages') }}
        </button>
        <button type="button" @click="$emit('open-settings')">
          <i class="bi bi-gear" aria-hidden="true"></i>{{ t('parent.home_empty_action_settings') }}
        </button>
      </div>
    </section>

    <template v-else>
      <TeacherSectionPane
        v-if="attention.length"
        class="parent-home-attention"
        :title="t('parent.home_attention_title')"
        icon="bi bi-lightning"
        tone="warn"
        flat
      >
        <ul class="teacher-activity-list">
          <li v-for="item in attention" :key="item.id">
            <button type="button" @click="openAttention(item)">
              <span class="teacher-activity-list__avatar" aria-hidden="true"><i :class="item.icon"></i></span>
              <span class="teacher-activity-list__copy">
                <strong>{{ item.name }}</strong>
                <small>{{ item.detail }}</small>
              </span>
              <span class="teacher-activity-list__score">{{ item.action }}</span>
              <i class="bi bi-chevron-right" aria-hidden="true"></i>
            </button>
          </li>
        </ul>
      </TeacherSectionPane>
      <div class="parent-home-columns">
        <TeacherSectionPane :title="t('parent.overview_homework')" icon="bi bi-journal-check" flat>
          <TeacherEmpty v-if="!upcoming.length" inline icon="bi bi-check2-circle" :message="t('parent.homework_empty')" />
          <template v-else>
            <ul class="teacher-activity-list parent-home-task-list">
              <li v-for="row in upcoming" :key="row.id">
                <button type="button" @click="$emit('open-learning', row.child_id)">
                  <span class="teacher-activity-list__avatar" aria-hidden="true"><i :class="activityIcon(row.activity)"></i></span>
                  <span class="teacher-activity-list__copy">
                    <strong>{{ row.child_name }} · {{ taskTitle(row) }}</strong>
                    <small>{{ taskMeta(row) }}</small>
                  </span>
                  <span class="parent-status" :class="taskStatusClass(row)">
                    {{ taskStatusLabel(row) }}
                  </span>
                  <i class="bi bi-chevron-right" aria-hidden="true"></i>
                </button>
              </li>
            </ul>
            <div class="parent-home-section-foot">
              <button type="button" class="parent-home-link" @click="$emit('open-learning', null)">
                {{ t('parent.home_view_homework') }}<i class="bi bi-arrow-right" aria-hidden="true"></i>
              </button>
            </div>
          </template>
        </TeacherSectionPane>

        <TeacherSectionPane :title="t('parent.overview_feedback')" icon="bi bi-chat-square-quote" flat>
          <TeacherEmpty v-if="!recentFeedback.length" inline icon="bi bi-chat-left" :message="t('parent.feedback_empty')" />
          <ul v-else class="parent-report parent-home-feedback">
            <li v-for="row in recentFeedback" :key="row.id">
              <header>
                <div>
                  <strong>{{ row.child_name }}</strong>
                  <p>{{ row.teacher_name }}</p>
                </div>
                <span v-if="row.unread" class="parent-status is-open">{{ t('parent.messages_unread', { n: 1 }) }}</span>
              </header>
              <blockquote>
                <p>{{ row.excerpt }}</p>
                <footer>{{ formatWhen(row.at) }}</footer>
              </blockquote>
              <button type="button" class="parent-home-link" @click="$emit('open-progress', row.child_id)">
                {{ t('parent.open_progress') }}<i class="bi bi-arrow-right" aria-hidden="true"></i>
              </button>
            </li>
          </ul>
        </TeacherSectionPane>
      </div>

      <TeacherSectionPane :title="t('parent.overview_activity')" icon="bi bi-activity" flat>
        <TeacherEmpty v-if="!activity.length" inline icon="bi bi-calendar2" :message="t('parent.activity_empty')" />
        <ul v-else class="teacher-activity-list">
          <li v-for="row in activity" :key="row.id">
            <button type="button" @click="$emit('open-progress', row.child_id)">
              <span class="teacher-activity-list__avatar" aria-hidden="true">{{ initial(row.child_name) }}</span>
              <span class="teacher-activity-list__copy">
                <strong>{{ row.child_name }}</strong>
                <small>{{ activityLine(row) }}</small>
              </span>
              <span class="teacher-activity-list__score">{{ formatWhen(row.at) }}</span>
              <i class="bi bi-chevron-right" aria-hidden="true"></i>
            </button>
          </li>
        </ul>
      </TeacherSectionPane>
    </template>
  </section>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'
import {
  activityIcon,
  activityName,
  formatWhen,
  initial,
  passageLabel,
} from '../../scripts/parent/dashboard'
import {
  buildAttentionItems,
  homeStatusSubtitle,
  homeworkRowStatusClass,
  latestFeedbackRows,
  upcomingHomeworkRows,
} from '../../scripts/parent/homeDashboard'
import ConnectPrompt from '../ConnectPrompt.vue'
import TeacherEmpty from '../teacher/TeacherEmpty.vue'
import TeacherSectionPane from '../teacher/TeacherSectionPane.vue'

export default {
  name: 'ParentFamilyOverview',
  components: { ConnectPrompt, TeacherEmpty, TeacherSectionPane },
  mixins: [i18nMixin],
  props: {
    firstName: { type: String, required: true },
    children: { type: Array, default: () => [] },
    homework: { type: Array, default: () => [] },
    feedback: { type: Array, default: () => [] },
    activity: { type: Array, default: () => [] },
    messageUnread: { type: Number, default: 0 },
  },
  emits: ['open-child', 'open-learning', 'open-messages', 'open-progress', 'open-settings'],
  computed: {
    statusSubtitle() {
      return homeStatusSubtitle(this.t, {
        homework: this.homework,
        feedback: this.feedback,
        messageUnread: this.messageUnread,
        hasChildren: this.children.length > 0,
      })
    },
    attention() {
      return buildAttentionItems({
        t: this.t,
        homework: this.homework,
        feedback: this.feedback,
        messageUnread: this.messageUnread,
        formatWhen,
        activityName,
        passageLabel,
      })
    },
    upcoming() {
      return upcomingHomeworkRows(this.homework, 5)
    },
    recentFeedback() {
      return latestFeedbackRows(this.feedback, 3)
    },
  },
  methods: {
    initial,
    formatWhen,
    activityIcon,
    taskTitle(row) {
      return [activityName(this.t, row.activity), passageLabel(row)].filter(Boolean).join(' · ') || this.t('parent.nav_learning')
    },
    taskMeta(row) {
      return [
        row.teacher_name,
        row.due_at ? this.t('parent.homework_due_short', { when: formatWhen(row.due_at) }) : '',
      ].filter(Boolean).join(' · ')
    },
    taskStatusClass(row) {
      return homeworkRowStatusClass(row)
    },
    taskStatusLabel(row) {
      if (row.overdue) return this.t('parent.homework_overdue')
      if (row.due_soon) return this.t('parent.homework_due_soon')
      const key = `parent.homework_${row.status}`
      const label = this.t(key)
      return label && label !== key ? label : this.t('parent.homework_pending')
    },
    activityLine(row) {
      if (row.kind === 'practice') {
        const count = Number(row.recent_ayahs || 0)
        return count === 1 ? this.t('parent.activity_practice_one') : this.t('parent.activity_practice', { count })
      }
      const task = [activityName(this.t, row.activity), passageLabel(row)].filter(Boolean).join(' · ')
      return this.t('parent.activity_completed', { task: task || this.t('parent.nav_learning') })
    },
    openAttention(item) {
      if (item.kind === 'messages') {
        this.$emit('open-messages', null)
        return
      }
      if (item.kind === 'feedback') {
        this.$emit('open-progress', item.childId)
        return
      }
      this.$emit('open-learning', item.childId)
    },
  },
}
</script>