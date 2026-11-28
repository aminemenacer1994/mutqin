<template>
  <section class="parent-home parent-home-dashboard teacher-stack" aria-labelledby="parent-overview-heading">
    <header class="dash-reveal teacher-hero parent-home-hero">
      <div class="teacher-hero__row">
        <div class="teacher-hero__identity">
          <span class="teacher-hero__mark" aria-hidden="true"><i class="bi bi-people"></i></span>
          <div class="teacher-hero__copy">
            <p class="teacher-hero__eyebrow">{{ t('parent.workspace_label') }}</p>
            <h1 id="parent-overview-heading" class="teacher-hero__title">{{ t('parent.greeting', { name: firstName }) }}</h1>
            <p class="teacher-meta" role="status">{{ statusSubtitle }}</p>
          </div>
        </div>
        <button type="button" class="btn btn-primary" @click="$emit('open-children')">
          <i class="bi bi-people" aria-hidden="true"></i>{{ t('parent.nav_children') }}
        </button>
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
        class="parent-home-snapshot parent-home-snapshot--featured"
        :title="t('parent.home_snapshot_title')"
        icon="bi bi-sun"
        flat
      >
        <div class="parent-home-snapshot__body">
          <dl v-if="nextLesson" class="parent-home-today__facts parent-home-snapshot__next">
            <div>
              <dt>{{ t('parent.home_next_lesson') }}</dt>
              <dd>
                <button
                  type="button"
                  class="parent-home-link"
                  @click="$emit('open-learning', nextLesson.child_id, nextLesson.id)"
                >
                  {{ nextLessonLabel }}<i class="bi bi-arrow-right" aria-hidden="true"></i>
                </button>
              </dd>
            </div>
          </dl>
          <div v-if="weeklyCards.length" class="parent-home-snapshot__week" role="list">
            <article
              v-for="card in weeklyCards"
              :key="card.childId"
              class="parent-stat parent-home-weekly-card parent-home-snapshot__stat"
              role="listitem"
            >
              <button type="button" @click="$emit('open-progress', card.childId)">
                <span aria-hidden="true"><i class="bi bi-graph-up-arrow"></i></span>
                <strong>{{ card.label }}</strong>
                <small>
                  {{ children.length > 1 ? `${card.childName} · ` : '' }}{{ card.practiceLabel }}
                </small>
              </button>
            </article>
          </div>
        </div>
        <TeacherEmpty
          v-if="!nextLesson && !weeklyCards.length && !upcoming.length"
          inline
          icon="bi bi-check2-circle"
          :message="t('parent.homework_empty')"
        />
      </TeacherSectionPane>

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

      <div v-if="showDetailColumns" class="parent-home-columns parent-home-columns--split">
        <TeacherSectionPane
          v-if="showHomeworkPane"
          :title="t('parent.overview_homework')"
          icon="bi bi-journal-check"
          flat
        >
          <TeacherEmpty v-if="!upcoming.length" inline icon="bi bi-check2-circle" :message="t('parent.homework_empty')" />
          <template v-else>
            <ul class="teacher-activity-list parent-home-task-list">
              <li v-for="row in upcoming" :key="row.id">
                <button type="button" @click="$emit('open-learning', row.child_id, row.id)">
                  <span class="teacher-activity-list__avatar" aria-hidden="true"><i :class="activityIcon(row.activity)"></i></span>
                  <span class="teacher-activity-list__copy">
                    <strong>{{ taskChildPrefix(row) }}{{ taskTitle(row) }}</strong>
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
              <button
                type="button"
                class="parent-home-link"
                @click="$emit('open-learning', focusChild?.id || selectedChildId || (children.length === 1 ? children[0].id : null))"
              >
                {{ t('parent.home_view_homework') }}<i class="bi bi-arrow-right" aria-hidden="true"></i>
              </button>
            </div>
          </template>
        </TeacherSectionPane>

        <TeacherSectionPane
          v-if="showFeedbackPane"
          :title="t('parent.overview_feedback')"
          icon="bi bi-chat-square-quote"
          flat
        >
          <TeacherEmpty v-if="!recentFeedback.length" inline icon="bi bi-chat-left" :message="t('parent.feedback_empty')" />
          <ul v-else class="parent-home-feedback">
            <li v-for="row in recentFeedback" :key="row.id">
              <header class="parent-home-feedback__head">
                <strong v-if="showFeedbackChildName">{{ row.child_name }}</strong>
                <p>{{ row.teacher_name }}</p>
              </header>
              <blockquote v-if="row.excerpt">
                <p>{{ row.excerpt }}</p>
                <footer>{{ formatWhen(row.at) }}</footer>
              </blockquote>
              <p v-else class="parent-home-feedback__voice-label">{{ t('teacher.voice_feedback') }}</p>
              <TeacherAudioFeedbackPlayer
                v-if="row.audio?.available && row.audio?.url"
                :src="row.audio.url"
                :duration-ms="row.audio.duration_ms"
                compact
              />
              <button type="button" class="parent-home-link" @click="$emit('open-progress', row.child_id)">
                {{ t('parent.open_progress') }}<i class="bi bi-arrow-right" aria-hidden="true"></i>
              </button>
            </li>
          </ul>
        </TeacherSectionPane>
      </div>

      <TeacherSectionPane
        v-if="showChildrenSummary"
        :title="t('parent.home_children_title')"
        icon="bi bi-people"
        flat
      >
        <div class="parent-home-children-grid">
          <ParentHomeChildCard
            v-for="child in children"
            :key="child.id"
            :child="child"
            :homework="homework"
            @open-learning="(id, assignmentId) => $emit('open-learning', id, assignmentId)"
            @open-progress="$emit('open-progress', $event)"
            @open-profile="$emit('open-child', $event)"
          />
        </div>
      </TeacherSectionPane>

      <TeacherSectionPane
        v-if="activity.length"
        :title="t('parent.overview_activity')"
        icon="bi bi-activity"
        flat
      >
        <ul class="teacher-activity-list">
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
  feedbackExcludingAttention,
  homeStatusSubtitle,
  homeworkExcludingAttention,
  homeworkRowStatusClass,
  latestFeedbackRows,
  nextScheduledHomework,
  resolveFocusChild,
  upcomingHomeworkRows,
  weeklyProgressCards,
} from '../../scripts/parent/homeDashboard'
import ConnectPrompt from '../ConnectPrompt.vue'
import TeacherEmpty from '../teacher/TeacherEmpty.vue'
import TeacherSectionPane from '../teacher/TeacherSectionPane.vue'
import ParentHomeChildCard from './ParentHomeChildCard.vue'
import ParentSimpleBarChart from './ParentSimpleBarChart.vue'
import { homeHomeworkStatusBars } from '../../scripts/parent/homeworkBreakdown'
import TeacherAudioFeedbackPlayer from '../teacher/TeacherAudioFeedbackPlayer.vue'

export default {
  name: 'ParentFamilyOverview',
  components: { ConnectPrompt, ParentHomeChildCard, ParentSimpleBarChart, TeacherAudioFeedbackPlayer, TeacherEmpty, TeacherSectionPane },
  mixins: [i18nMixin],
  props: {
    firstName: { type: String, required: true },
    children: { type: Array, default: () => [] },
    homework: { type: Array, default: () => [] },
    feedback: { type: Array, default: () => [] },
    activity: { type: Array, default: () => [] },
    messageUnread: { type: Number, default: 0 },
    attendanceAlerts: { type: Array, default: () => [] },
    selectedChildId: { type: Number, default: null },
  },
  emits: ['open-child', 'open-children', 'open-learning', 'open-messages', 'open-progress', 'open-settings'],
  computed: {
    focusChild() {
      return resolveFocusChild(this.children, this.selectedChildId)
    },
    statusSubtitle() {
      return homeStatusSubtitle(this.t, {
        homework: this.homework,
        feedback: this.feedback,
        messageUnread: this.messageUnread,
        hasChildren: this.children.length > 0,
      })
    },
    attention() {
      const alerts = this.selectedChildId
        ? this.attendanceAlerts.filter((row) => Number(row.child_id) === Number(this.selectedChildId))
        : this.attendanceAlerts
      return buildAttentionItems({
        t: this.t,
        homework: this.homework,
        feedback: this.feedback,
        messageUnread: this.messageUnread,
        attendanceAlerts: alerts,
        formatWhen,
        activityName,
        passageLabel,
      })
    },
    upcoming() {
      const rows = homeworkExcludingAttention(this.homework, this.attention)
      return upcomingHomeworkRows(rows, 5)
    },
    recentFeedback() {
      return latestFeedbackRows(feedbackExcludingAttention(this.feedback, this.attention), 3)
    },
    nextLesson() {
      return nextScheduledHomework(this.homework, this.focusChild?.id || null)
    },
    nextLessonLabel() {
      if (!this.nextLesson) return ''
      const task = this.taskTitle(this.nextLesson)
      const name = this.children.length > 1 ? `${this.nextLesson.child_name} · ` : ''
      const due = this.nextLesson.due_at
        ? this.t('parent.homework_due_short', { when: formatWhen(this.nextLesson.due_at) })
        : ''
      return [name + task, due].filter(Boolean).join('. ')
    },
    todayLead() {
      if (this.focusChild) {
        return this.t('parent.home_today_child', { name: this.focusChild.name })
      }
      return this.t('parent.home_today_family', { count: this.children.length })
    },
    weeklyCards() {
      return weeklyProgressCards(this.t, this.children, this.selectedChildId)
    },
    showChildrenSummary() {
      return this.children.length > 1 && !this.selectedChildId
    },
    showHomeworkPane() {
      return this.children.some((child) => child.permissions?.assignments)
    },
    showFeedbackPane() {
      return this.children.some((child) => child.permissions?.messages)
    },
    showDetailColumns() {
      return this.showHomeworkPane || this.showFeedbackPane
    },
    showFeedbackChildName() {
      return this.children.length > 1 && !this.selectedChildId
    },
    homeworkStatusBars() {
      const rows = this.focusChild
        ? this.homework.filter((row) => Number(row.child_id) === Number(this.focusChild.id))
        : this.homework
      return homeHomeworkStatusBars(this.t, rows)
    },
  },
  methods: {
    initial,
    formatWhen,
    activityIcon,
    taskChildPrefix(row) {
      if (this.children.length <= 1 || this.selectedChildId) return ''
      return `${row.child_name} · `
    },
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
      if (item.kind === 'feedback' || item.kind === 'attendance') {
        this.$emit('open-progress', item.childId)
        return
      }
      const match = String(item.id || '').match(/^(?:overdue|due-soon)-(\d+)$/)
      const assignmentId = match ? Number(match[1]) : null
      this.$emit('open-learning', item.childId, assignmentId)
    },
  },
}
</script>
