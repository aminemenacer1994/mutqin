<template>
  <div class="teacher-plan-workspace" :class="{ 'is-for-student': Boolean(studentId) }">
    <p v-if="error && !composerOpen && !detailPlan" class="alert alert-danger teacher-notice mb-2" role="alert">{{ error }}<span class="teacher-notice__timer" aria-hidden="true"></span></p>
    <p v-if="success && !detailPlan" class="alert alert-success teacher-notice mb-2" role="status">{{ success }}<span class="teacher-notice__timer" aria-hidden="true"></span></p>

    <div v-if="!embedded" class="teacher-plan-workspace__toolbar">
      <button type="button" class="btn btn-primary btn-sm" :disabled="busy" @click="openComposer()">
        <i class="bi bi-plus-lg" aria-hidden="true"></i>{{ t('teacher.plan_create') }}
      </button>
    </div>

    <TeacherHifzProgress
      v-if="studentId && hifz"
      :student-id="studentId"
      :hifz="hifz"
      :format-when="formatWhen"
      @assign="assignNext"
    />

    <section v-if="studentId" class="teacher-profile-sheet teacher-plan-revisions" :aria-label="t('teacher.plan_revision_heading')">
      <header class="teacher-hifz__head">
        <strong>{{ t('teacher.plan_revision_heading') }}</strong>
      </header>
      <p v-if="!openRecommendations.length" class="teacher-empty-line teacher-plan-revisions__empty">{{ t('teacher.plan_revision_empty') }}</p>
      <article v-for="row in openRecommendations" :key="row.id" class="teacher-plan-revisions__row">
        <div>
          <p class="teacher-hifz__lead">{{ row.label }}</p>
          <p class="teacher-hifz__quiet">{{ recommendationSummary(row) }}</p>
          <p class="teacher-hifz__quiet">{{ lastReviewedLabel(row) }} · {{ dueLabel(row) }}<template v-if="row.teacher_confirmed"> · {{ t('teacher.plan_teacher_confirmed') }}</template></p>
        </div>
        <div class="teacher-plan-revisions__actions">
          <button type="button" class="btn btn-primary btn-sm" :disabled="busy" @click="runRecommendationPrimary(row)">{{ recommendationPrimary(row).label }}</button>
          <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="busy || row.status === 'assigned'" @click="openRecommendationEdit(row)">{{ t('teacher.plan_recommendation_edit') }}</button>
          <div class="teacher-plan-menu">
            <button type="button" class="teacher-plan-menu__toggle" :aria-expanded="recommendationMenuId === row.id ? 'true' : 'false'" :aria-label="t('teacher.plan_menu')" @click.stop="recommendationMenuId = recommendationMenuId === row.id ? null : row.id">
              <i class="bi bi-three-dots" aria-hidden="true"></i>
            </button>
            <div v-if="recommendationMenuId === row.id" class="teacher-plan-menu__list" role="menu">
              <button type="button" role="menuitem" :disabled="busy" @click="snoozeRecommendation(row)">{{ t('teacher.plan_snooze') }}</button>
              <button type="button" role="menuitem" :disabled="busy" @click="dismissRecommendation(row)">{{ t('teacher.plan_dismiss') }}</button>
            </div>
          </div>
        </div>
      </article>
      <details v-if="historyRecommendations.length" class="teacher-plan-revisions__history">
        <summary>{{ t('teacher.plan_revision_history') }}</summary>
        <p v-for="row in historyRecommendations" :key="row.id">
          {{ row.label }}<br>{{ recommendationStatusLabel(row.status) }}
          <button v-if="row.teacher_assignment_id" type="button" class="btn btn-link btn-sm" @click="$emit('open-task', { studentId: studentId || row.student_id, assignmentId: row.teacher_assignment_id })">{{ t('teacher.task_view') }}</button>
        </p>
      </details>
    </section>

    <section v-if="reflections.length" class="teacher-profile-sheet" :aria-label="t('teacher.student_reflections')">
      <header class="teacher-profile-sheet__head">
        <div class="teacher-profile-sheet__copy">
          <strong>{{ t('teacher.student_reflections') }}</strong>
          <p>{{ t('teacher.reflection_not_verified') }}</p>
        </div>
      </header>
      <ul class="teacher-activity-list">
        <li v-for="row in reflections" :key="row.id">
          <span class="teacher-activity-list__copy">
            <strong>{{ reflectionLabel(row) }}</strong>
            <small>{{ reflectionDetail(row) }}</small>
          </span>
        </li>
      </ul>
    </section>

    <p v-if="loading" class="teacher-loading-inline" role="status">{{ t('teacher.loading') }}</p>
    <div v-else-if="!visiblePlans.length" class="teacher-empty-panel">
      <TeacherEmpty icon="bi bi-calendar-week" :message="plans.length ? t('teacher.plan_no_matches') : (studentId ? t('teacher.plan_empty') : t('teacher.plans_global_empty'))" />
    </div>

    <div v-else class="teacher-plan-board">
      <h3 v-if="studentId" class="teacher-plan-workspace__heading">{{ t('teacher.plan_following') }}</h3>
      <article v-for="plan in visiblePlans" :key="plan.id" class="teacher-plan-card">
        <header class="teacher-plan-card__top">
          <div class="teacher-plan-card__copy">
            <p class="teacher-plan-card__student">{{ plan.student?.name || studentLabel }}</p>
            <h3>{{ plan.title }}</h3>
            <p class="teacher-plan-card__meta">
              <span class="teacher-plan-card__badge" :class="`is-${badge(plan).key}`">{{ badge(plan).label }}</span>
              <span>{{ formatDate(plan.starts_on) }}<template v-if="plan.ends_on"> – {{ formatDate(plan.ends_on) }}</template></span>
              <span>{{ t('teacher.plan_progress', { done: plan.progress?.completed || 0, total: plan.progress?.total || 0 }) }}</span>
            </p>
          </div>
          <footer>
            <button type="button" class="btn btn-primary btn-sm" @click="openDetail(plan)">{{ t('teacher.plan_view') }}</button>
            <div class="teacher-plan-menu">
            <button type="button" class="teacher-plan-menu__toggle" :aria-expanded="menuId === plan.id ? 'true' : 'false'" :aria-label="t('teacher.plan_menu')" @click.stop="menuId = menuId === plan.id ? null : plan.id">
              <i class="bi bi-three-dots" aria-hidden="true"></i>
            </button>
            <div v-if="menuId === plan.id" class="teacher-plan-menu__list" role="menu">
              <button type="button" role="menuitem" @click="openComposer(plan)">{{ t('teacher.plan_edit') }}</button>
              <button v-if="plan.status === 'draft'" type="button" role="menuitem" @click="setStatus(plan, 'active')">{{ t('teacher.plan_activate') }}</button>
              <button v-if="plan.status === 'active'" type="button" role="menuitem" @click="setStatus(plan, 'paused')">{{ t('teacher.plan_pause') }}</button>
              <button v-if="plan.status === 'paused'" type="button" role="menuitem" @click="setStatus(plan, 'active')">{{ t('teacher.plan_resume') }}</button>
              <button v-if="plan.status === 'active' || plan.status === 'paused'" type="button" role="menuitem" @click="setStatus(plan, 'completed')">{{ t('teacher.plan_close') }}</button>
              <button type="button" role="menuitem" @click="duplicatePlan(plan)">{{ t('teacher.plan_duplicate') }}</button>
              <button type="button" role="menuitem" @click="saveAsTemplate(plan)">{{ t('teacher.plan_save_template') }}</button>
              <button type="button" role="menuitem" @click="removePlan(plan)">{{ t('teacher.plan_delete') }}</button>
            </div>
            </div>
          </footer>
        </header>
        <div class="teacher-plan-card__bar" role="progressbar" :aria-label="plan.title" :aria-valuenow="planPercent(plan)" aria-valuemin="0" aria-valuemax="100">
          <span :style="planMeterStyle(plan)"></span>
        </div>
        <p v-if="nextOf(plan)" class="teacher-plan-card__next">
          <span v-if="isOverdue(plan)" class="teacher-plan-card__badge is-overdue">{{ t('teacher.overdue') }}</span>
          <span class="teacher-plan-card__next-label">{{ t('teacher.plan_next_activity') }}</span>
          {{ nextOf(plan).label }}<template v-if="nextOf(plan).due_on"> · {{ formatDate(nextOf(plan).due_on) }}</template>
        </p>
      </article>
    </div>

    <TeacherDialog
      class="teacher-plan-dialog"
      :open="Boolean(editDraft.id)"
      :busy="busy"
      :title="editingRecommendation ? editingRecommendation.label : t('teacher.plan_recommendation_edit')"
      size="sm"
      compact
      :close-label="t('teacher.close')"
      @close="editDraft = { id: null, due_on: '', instructions: '' }"
    >
      <div class="teacher-plan-modal__fields">
        <label class="teacher-plan-modal__field teacher-plan-modal__field--wide">
          <span>{{ t('teacher.due_date') }}</span>
          <input v-model="editDraft.due_on" class="form-control" type="date">
        </label>
        <label class="teacher-plan-modal__field teacher-plan-modal__field--wide">
          <span>{{ t('teacher.plan_instructions_placeholder') }}</span>
          <input v-model="editDraft.instructions" class="form-control" type="text" maxlength="2000">
        </label>
      </div>
      <template #footer>
        <button type="button" class="btn btn-outline-secondary" :disabled="busy" @click="editDraft = { id: null, due_on: '', instructions: '' }">{{ t('teacher.cancel') }}</button>
        <button type="button" class="btn btn-primary" :disabled="busy" @click="saveRecommendationEdit">{{ t('teacher.plan_recommendation_save') }}</button>
      </template>
    </TeacherDialog>

    <TeacherDialog
      class="teacher-plan-dialog"
      :open="Boolean(detailPlan)"
      :busy="busy"
      :title="detailPlan?.title || t('teacher.plan_view')"
      :close-label="t('teacher.close')"
      @close="detailId = null"
    >
      <p v-if="error" class="alert alert-danger" role="alert">{{ error }}</p>
      <p v-if="success" class="alert alert-success" role="status">{{ success }}</p>
      <article v-if="detailPlan" class="teacher-plan-detail">
        <header class="teacher-plan-detail__summary">
          <p class="teacher-plan-detail__who">{{ detailPlan.student?.name || studentLabel }}</p>
          <p class="teacher-plan-card__meta">
            <span class="teacher-plan-card__badge" :class="`is-${badge(detailPlan).key}`">{{ badge(detailPlan).label }}</span>
            <span>{{ planSpan(detailPlan) }}</span>
            <span>{{ t('teacher.plan_progress', { done: detailPlan.progress?.completed || 0, total: detailPlan.progress?.total || 0 }) }}</span>
          </p>
          <div class="teacher-plan-card__bar" role="progressbar" :aria-label="detailPlan.title" :aria-valuenow="planPercent(detailPlan)" aria-valuemin="0" aria-valuemax="100">
            <span :style="planMeterStyle(detailPlan)"></span>
          </div>
        </header>
        <p v-if="detailPlan.student_goal" class="teacher-plan-detail__goal"><span>{{ t('teacher.plan_goal_label') }}</span>{{ detailPlan.student_goal }}</p>
        <p v-if="detailPlan.notes" class="teacher-plan-detail__notes">{{ detailPlan.notes }}</p>
        <h3 v-if="detailPlan.items.length" class="teacher-plan-detail__activities">{{ t('teacher.plan_activities') }}</h3>
        <ol class="teacher-plan-detail__list">
          <li v-for="item in detailPlan.items" :key="item.id">
            <div class="teacher-plan-detail__item">
              <strong>{{ item.label }}</strong>
              <p class="teacher-plan-card__meta">
                <span>{{ activityLabel(item) }}</span>
                <span class="teacher-plan-card__badge" :class="`is-${item.display_status}`">{{ displayStatusLabel(item.display_status) }}</span>
                <span v-if="item.due_on" :class="item.display_status === 'overdue' ? 'is-overdue' : ''">{{ formatDate(item.due_on) }}</span>
                <span v-if="item.is_milestone">{{ t('teacher.plan_milestone') }}</span>
              </p>
              <p v-if="item.instructions" class="teacher-plan-detail__notes">{{ item.instructions }}</p>
            </div>
            <div v-if="item.origin === 'suggested' && item.item_status !== 'released' && item.item_status !== 'skipped'" class="teacher-plan-detail__actions">
              <button type="button" class="btn btn-sm btn-primary" :disabled="busy" @click="approveItem(item)">{{ t('teacher.plan_approve') }}</button>
              <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="busy" @click="skipItem(item)">{{ t('teacher.plan_skip') }}</button>
            </div>
            <div v-else-if="item.display_status === 'submitted'" class="teacher-plan-detail__actions">
              <button type="button" class="btn btn-sm btn-primary" :disabled="busy" @click="completeActivity(item)">{{ t('teacher.plan_mark_activity') }}</button>
              <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="busy" @click="requestAttempt(item)">{{ t('teacher.plan_request_attempt') }}</button>
            </div>
            <details v-if="item.origin !== 'suggested' || item.item_status === 'released'" class="teacher-plan-detail__change">
              <summary>{{ t('teacher.plan_change') }}</summary>
              <div class="teacher-plan-detail__actions">
                <label class="teacher-plan-detail__date">
                  <span class="visually-hidden">{{ t('teacher.plan_reschedule') }}</span>
                  <input v-model="rescheduleDrafts[item.id]" class="form-control" type="date">
                </label>
                <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="busy || !rescheduleDrafts[item.id]" @click="rescheduleItem(item)">{{ t('teacher.plan_reschedule') }}</button>
                <a v-if="item.recipient_id" class="teacher-plan-detail__link" :href="reviewHref">{{ t('teacher.plan_review_recitation') }}</a>
              </div>
              <label v-if="item.recipient_id" class="teacher-plan-detail__feedback">
                <span>{{ t('teacher.plan_feedback') }}</span>
                <textarea v-model="feedbackDrafts[item.id]" class="form-control" rows="2" maxlength="2000"></textarea>
              </label>
              <div v-if="item.recipient_id" class="teacher-plan-detail__actions">
                <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="busy || !String(feedbackDrafts[item.id] || '').trim()" @click="sendFeedback(item)">{{ t('teacher.plan_send_feedback') }}</button>
              </div>
            </details>
          </li>
        </ol>
      </article>
    </TeacherDialog>

    <TeacherDialog
      ref="dialog"
      class="teacher-plan-dialog"
      :open="composerOpen"
      :busy="busy"
      :dirty="formDirty"
      :title="editingPlan ? t('teacher.plan_edit') : t('teacher.plan_create')"
      compact
      :close-label="t('teacher.close')"
      @close="closeComposer"
    >
      <p v-if="error" class="alert alert-danger" role="alert">{{ error }}</p>
      <p v-if="stepError" class="alert alert-danger" role="alert">{{ stepError }}</p>
      <ol class="teacher-plan-steps">
        <li :class="{ 'is-current': step === 1, 'is-done': step > 1 }">
          <button type="button" @click="goToStep(1)">1. {{ t('teacher.plan_step_details') }}</button>
        </li>
        <li :class="{ 'is-current': step === 2, 'is-done': step > 2 }">
          <button type="button" @click="goToStep(2)">2. {{ t('teacher.plan_step_activities') }}</button>
        </li>
        <li :class="{ 'is-current': step === 3 }">
          <button type="button" @click="goToStep(3)">3. {{ t('teacher.plan_step_review') }}</button>
        </li>
      </ol>
      <section v-show="step === 1" class="teacher-plan-section" :aria-label="t('teacher.plan_step_details')">
      <div class="teacher-plan-modal__fields">
        <label v-if="!studentId" class="teacher-plan-modal__field teacher-plan-modal__field--wide">
          <span>{{ t('teacher.plan_student') }}</span>
          <select v-if="students.length && !editingPlan" v-model="form.student_id" class="form-select" @change="loadSuggestions">
            <option value="">{{ t('teacher.student') }}</option>
            <option v-for="student in students" :key="student.id" :value="String(student.id)">{{ student.name }}</option>
          </select>
          <input v-else class="form-control" type="text" :value="selectedStudentName" readonly>
        </label>
        <label class="teacher-plan-modal__field teacher-plan-modal__field--wide">
          <span>{{ t('teacher.plan_title') }}</span>
          <input ref="planTitle" v-model="form.title" class="form-control" type="text" maxlength="160" :placeholder="t('teacher.plan_title_example')">
        </label>
        <label class="teacher-plan-modal__field">
          <span>{{ t('teacher.plan_cadence') }}</span>
          <select v-model="form.cadence" class="form-select" @change="syncEnd">
            <option value="weekly">{{ t('teacher.plan_weekly') }}</option>
            <option value="monthly">{{ t('teacher.plan_monthly') }}</option>
            <option value="custom">{{ t('teacher.plan_custom') }}</option>
          </select>
        </label>
        <label class="teacher-plan-modal__field">
          <span>{{ t('teacher.plan_starts') }}</span>
          <input v-model="form.starts_on" class="form-control" type="date" @change="syncEnd">
        </label>
        <label class="teacher-plan-modal__field">
          <span>{{ t('teacher.plan_ends') }}</span>
          <input v-model="form.ends_on" class="form-control" type="date" :readonly="form.cadence !== 'custom'">
        </label>
        <label class="teacher-plan-modal__field teacher-plan-modal__field--wide">
          <span>{{ t('teacher.plan_student_goal') }}</span>
          <input v-model="form.student_goal" class="form-control" type="text" maxlength="500">
        </label>
        <label class="teacher-plan-modal__field teacher-plan-modal__field--wide">
          <span>{{ t('teacher.plan_notes') }}</span>
          <textarea v-model="form.notes" class="form-control" rows="2" maxlength="2000"></textarea>
        </label>
      </div>
      </section>

      <section v-show="step === 2" class="teacher-plan-section" :aria-label="t('teacher.plan_step_activities')">
        <div class="teacher-plan-modal__activities-head">
          <strong>{{ t('teacher.plan_activities') }}</strong>
          <button type="button" class="btn btn-sm btn-outline-secondary" @click="addDraftItem()">{{ t('teacher.plan_add_activity') }}</button>
        </div>
        <p v-if="!form.items.length" class="teacher-empty-line">{{ t('teacher.plan_activities_empty') }}</p>
        <article v-for="(item, index) in form.items" :key="item.key" class="teacher-plan-modal__activity">
          <header>
            <div class="teacher-plan-activity__summary">
              <strong>{{ t('teacher.plan_activity_n', { n: index + 1 }) }} · {{ activityLabel(item) }}</strong>
              <p>{{ passageLabel(item) }}</p>
              <p class="teacher-plan-card__meta">
                <span>{{ scheduleLabel(item) }}</span>
                <span class="teacher-plan-card__badge" :class="`is-${itemStatusKey(item)}`">{{ itemStatusLabel(item) }}</span>
              </p>
            </div>
            <div class="teacher-plan-activity__tools">
              <button type="button" class="btn btn-sm btn-outline-secondary" :aria-expanded="item.open ? 'true' : 'false'" @click="item.open = !item.open">{{ t(item.open ? 'teacher.close' : 'teacher.plan_edit_activity') }}</button>
              <button v-if="!item.locked" type="button" class="teacher-plan-modal__remove" :aria-label="t('teacher.plan_remove_activity')" @click="removeDraftItem(index)">
                <i class="bi bi-trash" aria-hidden="true"></i>
              </button>
            </div>
          </header>
          <p v-if="item.open && item.locked" class="teacher-plan-modal__locked">{{ t('teacher.plan_locked_activity') }}</p>
          <div v-show="item.open" class="teacher-plan-modal__activity-grid">
            <label>
              <span>{{ t('teacher.plan_kind') }}</span>
              <select v-model="item.activity" class="form-select form-select-sm" :disabled="item.locked" @change="applyActivity(item)">
                <option v-for="type in activityChoices(item)" :key="type.id" :value="type.id">{{ t(type.label) }}</option>
              </select>
            </label>
            <label v-if="item.activity === 'hifz'">
              <span>{{ t('teacher.hifz_stage') }}</span>
              <select v-model="item.hifz_category" class="form-select form-select-sm" :disabled="item.locked">
                <option value="sabaq">{{ t('teacher.hifz_sabaq') }}</option>
                <option value="sabqi">{{ t('teacher.hifz_sabqi') }}</option>
                <option value="manzil">{{ t('teacher.hifz_manzil') }}</option>
              </select>
              <p class="text-body-secondary small mb-0">{{ t('teacher.hifz_stage_help') }}</p>
            </label>
            <label>
              <span>{{ t('teacher.surah') }}</span>
              <TeacherSurahSelect :model-value="item.surah_number" :surahs="teacherSurahs" :disabled="busy || item.locked" @update:model-value="changeSurah(item, $event)" />
            </label>
            <label>
              <span>{{ t('teacher.from') }}</span>
              <input v-model.number="item.ayah_start" class="form-control form-control-sm" type="number" min="1" :max="ayahCount(item) || undefined" :disabled="item.locked" :aria-invalid="itemError(item) ? 'true' : undefined">
            </label>
            <label>
              <span>{{ t('teacher.to') }}</span>
              <input v-model.number="item.ayah_end" class="form-control form-control-sm" type="number" min="1" :max="ayahCount(item) || undefined" :disabled="item.locked" :aria-invalid="itemError(item) ? 'true' : undefined">
            </label>
            <label>
              <span>{{ requirementLabel(item) }}</span>
              <input v-model="item.repetition_target" class="form-control form-control-sm" type="number" min="1" max="50" inputmode="numeric" :disabled="item.locked" :aria-describedby="`plan-target-help-${item.key}`">
              <p :id="`plan-target-help-${item.key}`" class="text-body-secondary small mb-0">{{ requirementHelp(item) }}</p>
            </label>
            <label>
              <span>{{ t('teacher.due') }}</span>
              <input v-model="item.due_on" class="form-control form-control-sm" type="date">
            </label>
            <label class="teacher-plan-modal__instructions">
              <span>{{ t('teacher.plan_instructions_placeholder') }}</span>
              <input v-model="item.instructions" class="form-control form-control-sm" type="text" maxlength="2000" :disabled="item.locked">
            </label>
            <label>
              <input v-model="item.is_milestone" type="checkbox">
              {{ t('teacher.plan_milestone') }}
            </label>
          </div>
          <p v-if="item.open && itemError(item)" class="text-danger small mt-2 mb-0" role="alert">{{ itemError(item) }}</p>
        </article>

        <details class="teacher-plan-suggestions">
          <summary>{{ t('teacher.plan_suggestions') }}</summary>
          <p v-if="suggestionsLoading" class="teacher-loading-inline" role="status">{{ t('teacher.loading') }}</p>
          <p v-else-if="!groupedSuggestions.length" class="teacher-empty-line">{{ t('teacher.plan_no_suggestions') }}</p>
          <p v-else class="teacher-plan-suggestions__help">{{ t('teacher.plan_suggestions_help') }}</p>
          <article v-for="suggestion in groupedSuggestions" :key="suggestionKey(suggestion)">
            <p>
              <strong>{{ suggestion.surah_name }} · {{ suggestion.ayah_start }}<template v-if="suggestion.ayah_end !== suggestion.ayah_start">–{{ suggestion.ayah_end }}</template></strong>
              <span>{{ suggestion.reason }}</span>
            </p>
            <div>
              <button type="button" class="btn btn-sm btn-outline-secondary" @click="addSuggestion(suggestion)">{{ t('teacher.plan_add_to_plan') }}</button>
              <button type="button" class="btn btn-sm btn-outline-secondary" @click="dismissSuggestion(suggestion)">{{ t('teacher.plan_dismiss') }}</button>
            </div>
          </article>
        </details>
      </section>

      <section v-show="step === 3" class="teacher-plan-section teacher-plan-review" :aria-label="t('teacher.plan_step_review')">
        <p class="teacher-plan-review__note">{{ activationCopy }}</p>
        <p v-if="canActivate"><span>{{ t('teacher.plan_assignments_label') }}</span><strong>{{ t('teacher.plan_assignments_on_activate', { n: assignmentCount }) }}</strong></p>
        <p><span>{{ t('teacher.plan_title') }}</span><strong>{{ form.title.trim() }}</strong></p>
        <p v-if="selectedStudentName"><span>{{ t('teacher.plan_student') }}</span><strong>{{ selectedStudentName }}</strong></p>
        <p><span>{{ t('teacher.plan_cadence') }}</span><strong>{{ reviewSpan }}</strong></p>
        <p v-if="form.student_goal.trim()"><span>{{ t('teacher.plan_student_goal') }}</span><strong>{{ form.student_goal.trim() }}</strong></p>
        <p v-if="form.notes.trim()"><span>{{ t('teacher.plan_notes') }}</span><strong>{{ form.notes.trim() }}</strong></p>
        <h3>{{ t('teacher.plan_activities') }}</h3>
        <p v-if="!form.items.length" class="teacher-empty-line">{{ t('teacher.plan_review_empty') }}</p>
        <ul v-else>
          <li v-for="item in form.items" :key="`review-${item.key}`">
            <strong>{{ passageLabel(item) }}</strong><br>
            {{ activityLabel(item) }} · {{ scheduleLabel(item) }} · {{ itemStatusLabel(item) }}
          </li>
        </ul>
      </section>

      <template #footer>
        <button type="button" class="btn btn-outline-secondary" :disabled="busy" @click="$refs.dialog.requestClose()">{{ t('teacher.cancel') }}</button>
        <button v-if="step > 1" type="button" class="btn btn-outline-secondary" :disabled="busy" @click="goToStep(step - 1)">{{ t('teacher.plan_back_step') }}</button>
        <button v-if="step < 3" type="button" class="btn btn-primary" :disabled="busy" @click="goNext()">{{ t('teacher.plan_next') }}</button>
        <template v-else>
          <button type="button" class="btn teacher-plan-dialog__draft" :class="canActivate ? 'btn-outline-secondary' : 'btn-primary'" :disabled="busy || !formValid" @click="savePlan(false)">{{ t(editingPlan && editingPlan.status !== 'draft' ? 'teacher.task_save' : 'teacher.plan_save_draft') }}</button>
          <button v-if="canActivate" type="button" class="btn btn-primary teacher-plan-dialog__activate" :disabled="busy || !formValid || !form.items.length" @click="savePlan(true)">{{ t('teacher.plan_activate') }}</button>
        </template>
      </template>
    </TeacherDialog>

    <TeacherRecitationPlaybackReview
      :open="Boolean(reviewAttemptId)"
      :student-id="studentId"
      :attempt-id="reviewAttemptId"
      @close="reviewAttemptId = null"
      @reviewed="onRecommendationReviewed"
    />
  </div>
</template>

<script>
import { i18nMixin } from '../../../mixins/i18nMixin'
import { assignmentAttemptHelp, assignmentRequirementLabel } from '../../../scripts/teacher/formatters'
import { assignmentDisplayLabel } from '../../../scripts/teacher/taskTypes'
import { activityProgressPercent, progressMeterStyle } from '../../../scripts/teacher/activityProgress'
import { learningApi } from '../../../scripts/api/learning'
import TeacherDialog from '../TeacherDialog.vue'
import TeacherRecitationPlaybackReview from '../TeacherRecitationPlaybackReview.vue'
import TeacherSurahSelect from '../TeacherSurahSelect.vue'
import TeacherEmpty from '../TeacherEmpty.vue'
import TeacherHifzProgress from './TeacherHifzProgress.vue'

const ACTIVITY_TYPES = [
  { id: 'nazra', kind: 'practice', hifz_category: 'sabqi', label: 'teacher.activity_nazra' },
  { id: 'hifz', kind: 'ai_recite', hifz_category: 'sabaq', label: 'teacher.activity_hifz' },
  { id: 'tajweed', kind: 'ai_recite', hifz_category: 'sabqi', label: 'teacher.activity_tajweed' },
  { id: 'revision', kind: 'practice', hifz_category: 'sabqi', label: 'teacher.activity_revision' },
  { id: 'sabqi', kind: 'practice', hifz_category: 'sabqi', label: 'teacher.activity_revision', legacy: true },
  { id: 'manzil', kind: 'practice', hifz_category: 'manzil', label: 'teacher.activity_revision', legacy: true },
  { id: 'ai_recite', kind: 'ai_recite', hifz_category: 'sabqi', label: 'teacher.task_type_recite', legacy: true },
]

function todayIso() {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function addDays(iso, days) {
  const [year, month, day] = String(iso || todayIso()).slice(0, 10).split('-').map(Number)
  const date = new Date(year, (month || 1) - 1, day || 1)
  date.setDate(date.getDate() + days)
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0')
  const nextDay = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${nextMonth}-${nextDay}`
}

let draftSeq = 0

function nextDraftKey() {
  draftSeq += 1
  return `draft-${draftSeq}`
}

function activityId(item) {
  return item?.activity || 'hifz'
}

function blankItem() {
  return {
    key: nextDraftKey(),
    activity: 'hifz',
    kind: 'ai_recite',
    hifz_category: 'sabaq',
    is_milestone: false,
    surah_number: 1,
    ayah_start: 1,
    ayah_end: 7,
    due_on: '',
    priority: 'normal',
    repetition_target: '',
    instructions: '',
    origin: 'assigned',
    open: true,
    locked: false,
    display_status: 'planned',
  }
}

function blankForm(studentId) {
  const starts = todayIso()
  return {
    student_id: studentId ? String(studentId) : '',
    title: '',
    cadence: 'weekly',
    starts_on: starts,
    ends_on: addDays(starts, 7),
    notes: '',
    student_goal: '',
    items: [blankItem()],
  }
}

function uniquePlans(list) {
  const seen = new Set()
  return (Array.isArray(list) ? list : []).filter((plan) => {
    if (!plan || seen.has(plan.id)) return false
    seen.add(plan.id)
    return plan.status !== 'archived'
  })
}

export default {
  name: 'TeacherStudentProfilePlan',
  components: { TeacherDialog, TeacherEmpty, TeacherHifzProgress, TeacherRecitationPlaybackReview, TeacherSurahSelect },
  inject: { teacherSurahs: { default: () => [] } },
  emits: ['updated', 'leave', 'created', 'open-task', 'assign-next'],
  mixins: [i18nMixin],
  props: {
    studentId: { type: [Number, String], default: '' },
    studentName: { type: String, default: '' },
    hifz: { type: Object, default: null },
    profile: { type: Object, default: null },
    formatWhen: { type: Function, default: (value) => value || '' },
    students: { type: Array, default: () => [] },
    embedded: { type: Boolean, default: false },
    statusFilter: { type: String, default: 'all' },
    query: { type: String, default: '' },
    sort: { type: String, default: 'recent' },
    focusPlanId: { type: [Number, String], default: null },
    createOnMount: { type: Boolean, default: false },
  },
  data() {
    return {
      loading: true,
      busy: false,
      error: '',
      success: '',
      stepError: '',
      plans: [],
      templates: [],
      suggestions: [],
      dismissed: [],
      suggestionsLoading: false,
      showTemplates: false,
      composerOpen: false,
      editingPlan: null,
      step: 1,
      detailId: null,
      menuId: null,
      feedbackDrafts: {},
      rescheduleDrafts: {},
      recommendations: [],
      editingRecommendationId: null,
      editDraft: { id: null, due_on: '', instructions: '' },
      successTimer: null,
      recommendationMenuId: null,
      reviewAttemptId: null,
      form: blankForm(this.studentId),
      removedItemIds: [],
      initialForm: '',
      requestId: 0,
    }
  },
  computed: {
    formDirty() { return this.composerOpen && this.formSignature() !== this.initialForm },
    canActivate() { return !this.editingPlan || this.editingPlan.status === 'draft' },
    assignmentCount() { return this.form.items.filter((item) => item.origin !== 'suggested').length },
    activationCopy() {
      if (!this.canActivate) return this.t('teacher.plan_save_explainer')
      return this.t('teacher.plan_activate_explainer')
    },
    reviewSpan() {
      const cadence = this.cadenceLabel(this.form.cadence)
      const start = this.formatDate(this.form.starts_on)
      const end = this.formatDate(this.form.ends_on)
      return end ? `${cadence} · ${start} – ${end}` : cadence
    },
    editingRecommendation() {
      if (!this.editDraft.id) return null
      return this.recommendations.find((row) => row.id === this.editDraft.id) || null
    },
    formValid() { return this.stepValid(1) && this.stepValid(2) },
    studentLabel() { return this.studentName || this.plans[0]?.student?.name || this.t('teacher.student') },
    selectedStudentName() {
      const match = this.students.find((student) => String(student.id) === String(this.form.student_id))
      return match?.name || this.studentName || ''
    },
    reviewHref() {
      const id = this.form.student_id || this.studentId || this.detailPlan?.student?.id
      return `/teacher?view=student&student=${id}&section=ai`
    },
    detailPlan() { return this.plans.find((plan) => Number(plan.id) === Number(this.detailId)) || null },
    openRecommendations() {
      return this.recommendations.filter((row) => row.status === 'pending' || row.status === 'accepted')
    },
    historyRecommendations() {
      return this.recommendations.filter((row) => row.status === 'dismissed' || row.status === 'assigned')
    },
    reflections() { return this.profile?.payload?.self_assessments || [] },
    weeklySchedule() {
      const items = this.detailPlan?.items || []
      const groups = new Map()
      items.forEach((item) => {
        const key = item.due_on ? this.weekStart(item.due_on) : 'none'
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key).push(item)
      })
      return [...groups.entries()].map(([key, rows]) => ({
        key,
        label: key === 'none' ? this.t('teacher.hifz_week_undated') : this.t('teacher.hifz_week_of', { date: key }),
        items: rows,
      }))
    },
    visiblePlans() {
      const query = this.query.trim().toLowerCase()
      const rows = this.plans.filter((plan) => {
        if (this.statusFilter !== 'all' && plan.status !== this.statusFilter) return false
        if (!query) return true
        const name = String(plan.student?.name || this.studentName || '').toLowerCase()
        return name.includes(query) || String(plan.title || '').toLowerCase().includes(query)
      })
      const due = (plan) => String(this.nextOf(plan)?.due_on || '9999-99-99')
      if (this.sort === 'due') return rows.slice().sort((a, b) => due(a).localeCompare(due(b)))
      if (this.sort === 'progress') return rows.slice().sort((a, b) => this.planPercent(a) - this.planPercent(b))
      return rows.slice().sort((a, b) => Number(b.id) - Number(a.id))
    },
    groupedSuggestions() {
      const map = new Map()
      this.suggestions.forEach((suggestion) => {
        const key = this.suggestionKey(suggestion)
        if (this.dismissed.includes(key)) return
        const count = Number(suggestion.evidence_count || 0)
        if (!map.has(key)) {
          map.set(key, { ...suggestion, evidence_count: count })
          return
        }
        const row = map.get(key)
        row.evidence_count += count
        row.reason = this.t('teacher.plan_suggestion_reason', { n: row.evidence_count })
      })
      return [...map.values()].sort((a, b) => Number(b.evidence_count || 0) - Number(a.evidence_count || 0))
    },
  },
  watch: {
    studentId: { immediate: true, handler() { this.reload() } },
    focusPlanId: { immediate: true, handler(id) { if (id) this.detailId = Number(id) } },
    statusFilter() { this.keepVisibleDetail() },
    query() { this.keepVisibleDetail() },
    success(message) {
      window.clearTimeout(this.successTimer)
      if (!message) return
      this.successTimer = window.setTimeout(() => { this.success = '' }, 4000)
    },
  },
  mounted() {
    if (this.createOnMount) this.openComposer()
    this.onRecommendationMenuPointer = (event) => {
      if (!this.recommendationMenuId) return
      if (event.target?.closest?.('.teacher-plan-menu')) return
      this.recommendationMenuId = null
    }
    document.addEventListener('click', this.onRecommendationMenuPointer)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.onRecommendationMenuPointer)
    window.clearTimeout(this.successTimer)
  },
  methods: {
    assignNext(next) {
      this.$emit('assign-next', {
        id: Number(this.studentId),
        activity: next.activity,
        hifz_category: next.hifz_category,
        weak_example: {
          surah_number: next.surah_number,
          ayah_number: next.ayah_start,
          ayah_start: next.ayah_start,
          ayah_end: next.ayah_end,
        },
      })
    },
    weekStart(iso) {
      const date = new Date(`${iso}T12:00:00`)
      const day = date.getDay() || 7
      date.setDate(date.getDate() - day + 1)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`
    },
    reflectionLabel(row) {
      const key = {
        low: 'teacher.hifz_confidence_low',
        steady: 'teacher.hifz_confidence_steady',
        confident: 'teacher.hifz_confidence_confident',
      }[row.confidence]
      return key ? this.t(key) : this.t('teacher.student_reflections')
    },
    reflectionDetail(row) {
      return [row.difficult_ayahs, row.wants_revision ? this.t('teacher.hifz_wants_revision') : '', row.note || row.help_request, this.t('teacher.reflection_not_verified')]
        .filter(Boolean)
        .join(' · ')
    },
    keepVisibleDetail() {
      if (this.detailId && !this.visiblePlans.some((plan) => Number(plan.id) === Number(this.detailId))) this.detailId = null
    },
    ayahCount(item) { return Number(this.teacherSurahs.find((surah) => Number(surah.number) === Number(item.surah_number))?.ayah_count || 0) },
    surahName(item) { return this.teacherSurahs.find((surah) => Number(surah.number) === Number(item.surah_number))?.name || item.surah_name || '' },
    changeSurah(item, number) { item.surah_number = number; item.ayah_start = 1; item.ayah_end = Math.min(this.ayahCount(item) || 1, 7) },
    applyActivity(item) {
      const type = ACTIVITY_TYPES.find((row) => row.id === item.activity) || ACTIVITY_TYPES[0]
      item.kind = type.kind
      item.hifz_category = type.hifz_category
    },
    itemError(item) {
      const from = Number(item.ayah_start)
      const to = Number(item.ayah_end)
      const max = this.ayahCount(item)
      if (!Number.isInteger(from) || from < 1) return this.t('teacher.ayah_range_from_error')
      if (!Number.isInteger(to) || to < 1) return this.t('teacher.ayah_range_to_error')
      if (from > to) return this.t('teacher.ayah_range_order_error')
      if (max && (from > max || to > max)) return this.t('teacher.ayah_range_max_error', { n: max })
      if (item.due_on && this.form.starts_on && item.due_on < this.form.starts_on) return this.t('teacher.plan_due_before_start')
      if (item.due_on && this.form.ends_on && item.due_on > this.form.ends_on) return this.t('teacher.plan_due_after_end')
      if (item.repetition_target !== '' && item.repetition_target != null) {
        const reps = Number(item.repetition_target)
        if (!Number.isInteger(reps) || reps < 1 || reps > 50) return this.t('teacher.plan_target_error')
      }
      return ''
    },
    stepValid(step) {
      if (step === 1) {
        if (!this.form.student_id || !this.form.title.trim() || !this.form.starts_on) return false
        if (!this.form.ends_on || this.form.ends_on < this.form.starts_on) return false
        return true
      }
      return this.form.items.every((item) => !this.itemError(item)) && !this.duplicateMessage()
    },
    syncEnd() {
      if (this.form.cadence === 'custom' || !this.form.starts_on) return
      this.form.ends_on = addDays(this.form.starts_on, this.form.cadence === 'monthly' ? 30 : 7)
    },
    async reload() {
      const requestId = ++this.requestId
      this.loading = true
      this.error = ''
      try {
        const requests = [
          learningApi.getTeacherLearningPlans(this.studentId || null),
          learningApi.getTeacherLearningPlanTemplates(),
        ]
        if (this.studentId) requests.push(learningApi.syncTeacherRevisionRecommendations(this.studentId))
        const [plansRes, templatesRes, recommendationsRes] = await Promise.all(requests)
        if (requestId !== this.requestId) return
        this.plans = uniquePlans(plansRes?.data)
        this.templates = Array.isArray(templatesRes?.data) ? templatesRes.data : []
        this.recommendations = Array.isArray(recommendationsRes?.recommendations) ? recommendationsRes.recommendations : []
        this.keepVisibleDetail()
      } catch (error) {
        if (requestId !== this.requestId) return
        this.error = error?.response?.data?.message || this.t('teacher.plan_load_error')
      } finally {
        if (requestId === this.requestId) this.loading = false
      }
    },
    openDetail(plan) { this.menuId = null; this.detailId = plan.id },
    openComposer(plan = null) {
      if (this.busy) return
      this.menuId = null
      this.editingPlan = plan
      this.success = ''
      this.error = ''
      this.stepError = ''
      this.step = 1
      this.dismissed = []
      this.removedItemIds = []
      if (plan) {
        this.form = {
          student_id: String(plan.student?.id || this.studentId || ''),
          title: plan.title || '',
          cadence: plan.cadence || 'weekly',
          starts_on: String(plan.starts_on || '').slice(0, 10),
          ends_on: String(plan.ends_on || '').slice(0, 10),
          notes: plan.notes || '',
          student_goal: plan.student_goal || '',
          items: (plan.items || []).filter((item) => item.item_status !== 'skipped').map((item) => this.itemFromPlan(item)),
        }
      } else {
        this.form = blankForm(this.studentId)
        this.form.title = ''
      }
      this.initialForm = this.formSignature()
      this.composerOpen = true
      this.loadSuggestions()
      this.$nextTick(() => this.$refs.planTitle?.focus())
    },
    closeComposer(force = false) {
      if (this.busy && !force) return
      this.composerOpen = false
      this.editingPlan = null
      this.step = 1
    },
    goToStep(next) {
      const target = Math.min(3, Math.max(1, Number(next) || 1))
      if (target > this.step) {
        for (let current = this.step; current < target; current += 1) {
          if (!this.stepValid(current)) {
            this.stepError = this.stepHint()
            return
          }
        }
      }
      this.stepError = ''
      this.step = target
      if (target === 2) this.loadSuggestions()
      this.$nextTick(() => {
        const body = this.$refs.dialog?.$refs?.root?.querySelector?.('.modal-body')
        if (body) body.scrollTop = 0
      })
    },
    goNext() { this.goToStep(this.step + 1) },
    stepHint() {
      if (!this.form.student_id) return this.t('teacher.plan_student')
      if (!this.form.title.trim()) return this.t('teacher.plan_title')
      if (!this.form.ends_on || this.form.ends_on < this.form.starts_on) return this.t('teacher.plan_end_required')
      const duplicate = this.duplicateMessage()
      if (duplicate) return duplicate
      const item = this.form.items.find((row) => this.itemError(row))
      return item ? this.itemError(item) : this.t('teacher.plan_save_error')
    },
    formSignature() {
      const { items, ...rest } = this.form
      return JSON.stringify({
        ...rest,
        removed: this.removedItemIds,
        items: (items || []).map(({ open, ...item }) => item),
      })
    },
    itemFromPlan(item) {
      const activity = item.activity || (item.kind === 'ai_recite' ? 'ai_recite' : item.hifz_category === 'manzil' ? 'manzil' : item.hifz_category === 'sabqi' ? 'sabqi' : 'hifz')
      return {
        key: `item-${item.id}`,
        id: item.id,
        activity,
        kind: item.kind || 'practice',
        hifz_category: item.hifz_category || 'sabaq',
        is_milestone: Boolean(item.is_milestone),
        surah_number: item.surah_number,
        surah_name: item.surah_name || '',
        ayah_start: item.ayah_start,
        ayah_end: item.ayah_end,
        due_on: String(item.due_on || '').slice(0, 10),
        priority: item.priority || 'normal',
        repetition_target: item.repetition_target || '',
        instructions: item.instructions || '',
        origin: item.origin === 'suggested' ? 'suggested' : 'assigned',
        weak_spot_id: item.weak_spot_id || null,
        open: false,
        locked: Boolean(item.teacher_assignment_id) || item.item_status === 'released',
        display_status: item.display_status || 'planned',
      }
    },
    addDraftItem() {
      const item = blankItem()
      item.due_on = this.form.ends_on || ''
      item.open = true
      this.form.items.push(item)
    },
    removeDraftItem(index) {
      const item = this.form.items[index]
      if (!item || item.locked) return
      if (item.id) this.removedItemIds.push(item.id)
      this.form.items.splice(index, 1)
    },
    passageLabel(item) {
      const name = this.surahName(item)
      const start = Number(item.ayah_start)
      const end = Number(item.ayah_end)
      const range = start && end && start !== end ? `${start}–${end}` : String(start || '')
      return [name, range].filter(Boolean).join(' · ')
    },
    activityChoices(item) {
      const current = item?.activity
      return ACTIVITY_TYPES.filter((type) => {
        if (!type.legacy) {
          if ((current === 'sabqi' || current === 'manzil') && type.id === 'revision') return false
          return true
        }
        return type.id === current
      })
    },
    requirementLabel(item) {
      return assignmentRequirementLabel(item, this.t.bind(this))
    },
    requirementHelp(item) {
      return assignmentAttemptHelp({ assignment: item }, this.t.bind(this))
    },
    scheduleLabel(item) {
      return item.due_on ? this.formatDate(item.due_on) : this.t('teacher.plan_no_due')
    },
    itemStatusKey(item) {
      if (item.origin === 'suggested' && !item.locked) return 'suggested'
      return item.display_status || 'planned'
    },
    itemStatusLabel(item) {
      const key = this.itemStatusKey(item)
      if (key === 'suggested') return this.t('teacher.plan_suggested')
      return this.displayStatusLabel(key)
    },
    duplicateMessage() {
      const items = this.form.items
      for (let index = 0; index < items.length; index += 1) {
        for (let other = index + 1; other < items.length; other += 1) {
          if (this.sameActivity(items[index], items[other])) return this.t('teacher.plan_duplicate_activity')
        }
      }
      return ''
    },
    suggestionKey(suggestion) { return `${suggestion.surah_number}:${suggestion.ayah_start}:${suggestion.ayah_end}` },
    sameActivity(left, right) {
      return Number(left.surah_number) === Number(right.surah_number)
        && Number(left.ayah_start) === Number(right.ayah_start)
        && Number(left.ayah_end) === Number(right.ayah_end)
        && activityId(left) === activityId(right)
    },
    addSuggestion(suggestion) {
      const item = {
        ...blankItem(),
        activity: suggestion.activity || 'revision',
        kind: suggestion.kind || 'practice',
        hifz_category: suggestion.hifz_category || 'sabqi',
        surah_number: suggestion.surah_number,
        ayah_start: suggestion.ayah_start,
        ayah_end: suggestion.ayah_end,
        due_on: this.form.ends_on || '',
        priority: 'high',
        origin: 'suggested',
        weak_spot_id: suggestion.weak_spot_id,
        repetition_target: suggestion.repetition_target || '',
        instructions: '',
        open: true,
        display_status: 'planned',
      }
      const category = item.hifz_category
      this.applyActivity(item)
      item.hifz_category = category
      item.origin = 'suggested'
      if (this.form.items.some((row) => this.sameActivity(row, item))) {
        this.stepError = this.t('teacher.plan_duplicate_activity')
        return
      }
      this.stepError = ''
      const starter = this.form.items[0]
      const untouched = this.form.items.length === 1 && starter && !starter.id && !this.editingPlan && !starter.instructions && !starter.repetition_target && !starter.due_on && starter.activity === 'hifz' && Number(starter.surah_number) === 1 && Number(starter.ayah_start) === 1 && Number(starter.ayah_end) === 7
      if (untouched) {
        this.form.items.splice(0, 1, item)
      } else {
        this.form.items.push(item)
      }
    },
    dismissSuggestion(suggestion) { this.dismissed.push(this.suggestionKey(suggestion)) },
    async rescheduleItem(item) {
      const due = this.rescheduleDrafts[item.id]
      if (!due || this.busy) return
      this.busy = true
      this.error = ''
      try {
        await learningApi.rescheduleTeacherLearningPlanItem(item.id, due)
        this.success = this.t('teacher.plan_status_updated')
        await this.reload()
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('teacher.plan_save_error')
      } finally {
        this.busy = false
      }
    },
    lastReviewedLabel(row) {
      const value = row?.last_reviewed_at
      if (!value) return this.t('teacher.plan_last_reviewed_unknown')
      return this.t('teacher.plan_last_reviewed', { when: this.formatWhen(value) })
    },
    dueLabel(row) {
      if (!row?.due_on) return this.t('teacher.hifz_tasks_clear')
      return this.t('teacher.task_due_date', { date: this.formatDate(row.due_on) })
    },
    recommendationSummary(row) {
      const reason = String(row?.reason || '').trim()
      if (reason && !/still open\.?$/i.test(reason)) return reason
      const range = row?.label || ''
      if (row?.reason_code === 'previous_feedback') {
        return range
          ? `${this.studentLabel} still has written feedback on ${range} that has not been turned into a completed assignment.`
          : reason
      }
      if (row?.reason_code === 'previous_revision') {
        return range
          ? `${range} still needs practice after your last review. This follow-up is not a Tajweed assessment.`
          : reason
      }
      return reason
    },
    recommendationPrimary(row) {
      const assignmentId = row?.teacher_assignment_id || row?.evidence?.teacher_assignment_id || row?.evidence?.practice_assignment_id || null
      const attemptId = row?.evidence?.attempt_id || null
      if (assignmentId && row.status !== 'dismissed') {
        return { id: 'view_task', label: this.t('teacher.task_view'), assignmentId }
      }
      return { id: 'assign', label: this.t('teacher.playback_assign_revision'), attemptId }
    },
    recommendationMenu(row) {
      const primary = this.recommendationPrimary(row).id
      const items = []
      const attemptId = row?.evidence?.attempt_id || null
      if (row.status === 'pending') items.push({ id: 'accept', label: this.t('teacher.plan_accept') })
      if (attemptId && primary !== 'review_recitation') items.push({ id: 'review_recitation', label: this.t('teacher.overview_action_review') })
      if (row.status === 'pending' || row.status === 'accepted') items.push({ id: 'dismiss', label: this.t('teacher.plan_dismiss') })
      return items
    },
    runRecommendationPrimary(row) {
      const action = this.recommendationPrimary(row)
      this.recommendationMenuId = null
      if (action.id === 'review') {
        this.editingRecommendationId = row.id
        return
      }
      if (action.id === 'save') return this.saveRecommendation(row)
      if (action.id === 'assign') return this.assignRecommendation(row)
      if (action.id === 'view_task') {
        this.$emit('open-task', { studentId: this.studentId || row.student_id, assignmentId: action.assignmentId })
        return
      }
      if (action.id === 'review_recitation') this.reviewAttemptId = action.attemptId
    },
    runRecommendationMenu(row, id) {
      this.recommendationMenuId = null
      if (id === 'edit') {
        if (this.editingRecommendationId === row.id) return this.saveRecommendation(row)
        this.editingRecommendationId = row.id
        return
      }
      if (id === 'accept') return this.acceptRecommendation(row)
      if (id === 'dismiss') return this.dismissRecommendation(row)
      if (id === 'assign') return this.assignRecommendation(row)
      if (id === 'review_recitation') {
        this.reviewAttemptId = row?.evidence?.attempt_id || null
        return
      }
      if (id === 'view_task') {
        const assignmentId = row.teacher_assignment_id || row.evidence?.teacher_assignment_id || row.evidence?.practice_assignment_id
        this.$emit('open-task', { studentId: this.studentId || row.student_id, assignmentId })
      }
    },
    onRecommendationReviewed() {
      this.reviewAttemptId = null
      this.reload()
      this.$emit('updated')
    },
    openRecommendationEdit(row) {
      this.recommendationMenuId = null
      this.editDraft = {
        id: row.id,
        due_on: String(row.due_on || '').slice(0, 10),
        instructions: row.instructions || '',
      }
    },
    async saveRecommendationEdit() {
      const row = this.recommendations.find((item) => item.id === this.editDraft.id)
      if (!row) return
      row.due_on = this.editDraft.due_on || null
      row.instructions = this.editDraft.instructions || ''
      await this.saveRecommendation(row)
      if (!this.error) this.editDraft = { id: null, due_on: '', instructions: '' }
    },
    async saveRecommendation(row) {
      this.busy = true
      this.error = ''
      try {
        await learningApi.updateTeacherRevisionRecommendation(row.id, {
          activity: row.activity,
          surah_number: row.surah_number,
          ayah_start: row.ayah_start,
          ayah_end: row.ayah_end,
          due_on: row.due_on || null,
          instructions: row.instructions || null,
        })
        this.editingRecommendationId = null
        await this.reload()
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('teacher.plan_save_error')
      } finally {
        this.busy = false
      }
    },
    async acceptRecommendation(row) {
      if (this.busy || row?.status === 'assigned') return
      if (this.editingRecommendationId === row.id) {
        await this.saveRecommendation(row)
        if (this.error) return
      }
      await this.runRecommendation(learningApi.acceptTeacherRevisionRecommendation(row.id), this.t('teacher.plan_recommendation_accepted'))
    },
    async snoozeRecommendation(row) {
      if (this.busy || row?.status === 'assigned' || row?.status === 'dismissed') return
      this.recommendationMenuId = null
      const due = new Date()
      due.setDate(due.getDate() + 7)
      const dueOn = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`
      this.busy = true
      this.error = ''
      try {
        await learningApi.updateTeacherRevisionRecommendation(row.id, { due_on: dueOn })
        await this.reload()
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('teacher.plan_save_error')
      } finally {
        this.busy = false
      }
    },
    async dismissRecommendation(row) {
      if (this.busy || row?.status === 'assigned' || row?.status === 'dismissed') return
      await this.runRecommendation(learningApi.dismissTeacherRevisionRecommendation(row.id), this.t('teacher.plan_recommendation_dismissed'))
    },
    async assignRecommendation(row) {
      if (this.busy || row?.status === 'assigned' || row?.teacher_assignment_id) return
      if (this.editingRecommendationId === row.id) {
        await this.saveRecommendation(row)
        if (this.error) return
      }
      await this.runRecommendation(learningApi.assignTeacherRevisionRecommendation(row.id), this.t('teacher.playback_revision_sent'))
    },
    async runRecommendation(request, message = '') {
      if (this.busy) return
      this.busy = true
      this.error = ''
      this.success = ''
      try {
        await request
        this.editingRecommendationId = null
        this.success = message || this.t('teacher.plan_status_updated')
        await this.reload()
        this.$emit('updated')
      } catch (error) {
        this.error = error?.response?.data?.message
          || Object.values(error?.response?.data?.errors || {})?.[0]?.[0]
          || this.t('teacher.plan_save_error')
      } finally {
        this.busy = false
      }
    },
    async loadSuggestions() {
      const studentId = this.form.student_id || this.studentId
      if (!studentId || this.suggestionsLoading) return
      this.suggestionsLoading = true
      try {
        const data = await learningApi.getTeacherLearningPlanSuggestions(studentId)
        this.suggestions = Array.isArray(data?.suggestions) ? data.suggestions : []
      } catch (error) {
        this.stepError = error?.response?.data?.message || this.t('teacher.plan_load_error')
      } finally {
        this.suggestionsLoading = false
      }
    },
    payloadItems() {
      return this.form.items.map((item) => {
        const reps = Number(item.repetition_target)
        const row = {
          activity: item.activity,
          kind: item.kind,
          hifz_category: item.hifz_category,
          surah_number: item.surah_number,
          ayah_start: item.ayah_start,
          ayah_end: item.ayah_end,
          due_on: item.due_on || null,
          priority: item.priority || 'normal',
          repetition_target: Number.isInteger(reps) && reps >= 1 ? reps : null,
          instructions: item.instructions || null,
          origin: item.origin === 'suggested' ? 'suggested' : 'assigned',
          weak_spot_id: item.weak_spot_id || null,
          is_milestone: Boolean(item.is_milestone),
        }
        if (item.id) row.id = item.id
        return row
      })
    },
    async savePlan(activate) {
      const willActivate = Boolean(activate) && this.canActivate
      if (this.busy || !this.formValid || (activate && !willActivate)) {
        this.stepError = this.stepHint()
        return
      }
      if (this.duplicateMessage()) {
        this.stepError = this.duplicateMessage()
        return
      }
      if (willActivate && !this.form.items.length) {
        this.stepError = this.t('teacher.plan_activate_needs_activity')
        return
      }
      this.busy = true
      this.error = ''
      this.success = ''
      const studentId = this.form.student_id
      try {
        for (const id of this.removedItemIds) {
          await learningApi.skipTeacherLearningPlanItem(id)
        }
        if (this.editingPlan) {
          const planId = this.editingPlan.id
          await learningApi.updateTeacherLearningPlan(planId, {
            title: this.form.title.trim(),
            cadence: this.form.cadence,
            starts_on: this.form.starts_on,
            ends_on: this.form.ends_on,
            notes: this.form.notes,
            student_goal: this.form.student_goal,
            items: this.payloadItems(),
          })
          if (willActivate) await learningApi.setTeacherLearningPlanStatus(planId, 'active')
          this.success = willActivate ? this.t('teacher.plan_activated') : this.t('teacher.plan_updated')
        } else {
          const created = await learningApi.createTeacherLearningPlan({
            student_id: Number(this.form.student_id),
            title: this.form.title.trim(),
            cadence: this.form.cadence,
            starts_on: this.form.starts_on,
            ends_on: this.form.ends_on,
            notes: this.form.notes,
            student_goal: this.form.student_goal,
            activate: willActivate,
            items: this.payloadItems(),
          })
          this.success = willActivate ? this.t('teacher.plan_activated') : this.t('teacher.plan_saved')
          this.$emit('created', created?.plan || null)
        }
        this.closeComposer(true)
        if (String(studentId) === String(this.studentId)) await this.reload()
        this.$emit('updated')
      } catch (error) {
        this.error = error?.response?.data?.message
          || Object.values(error?.response?.data?.errors || {})?.[0]?.[0]
          || this.t('teacher.plan_save_error')
      } finally {
        this.busy = false
      }
    },
    async setStatus(plan, status) {
      this.menuId = null
      this.busy = true
      this.error = ''
      try {
        await learningApi.setTeacherLearningPlanStatus(plan.id, status)
        this.success = status === 'archived' ? this.t('teacher.plan_deleted') : this.t('teacher.plan_status_updated')
        await this.reload()
        this.$emit('updated')
      } catch (error) {
        this.error = error?.response?.data?.message
          || Object.values(error?.response?.data?.errors || {})?.[0]?.[0]
          || this.t('teacher.plan_save_error')
      } finally {
        this.busy = false
      }
    },
    async removePlan(plan) {
      this.menuId = null
      if (!window.confirm(this.t('teacher.plan_delete_confirm'))) return
      await this.setStatus(plan, 'archived')
    },
    async duplicatePlan(plan) {
      this.menuId = null
      this.busy = true
      this.error = ''
      try {
        await learningApi.createTeacherLearningPlan({
          student_id: plan.student?.id || this.studentId,
          title: `${plan.title} copy`,
          cadence: ['weekly', 'monthly', 'custom'].includes(plan.cadence) ? plan.cadence : 'weekly',
          starts_on: plan.starts_on,
          ends_on: plan.ends_on,
          notes: plan.notes || '',
          allow_duplicate: true,
          activate: false,
          items: (plan.items || []).filter((item) => item.origin !== 'suggested').map((item) => ({
            activity: item.activity,
            kind: item.kind,
            hifz_category: item.hifz_category,
            surah_number: item.surah_number,
            ayah_start: item.ayah_start,
            ayah_end: item.ayah_end,
            due_on: item.due_on,
            priority: item.priority,
            instructions: item.instructions,
            origin: 'assigned',
          })),
        })
        this.success = this.t('teacher.plan_duplicated')
        await this.reload()
        this.$emit('updated')
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('teacher.plan_save_error')
      } finally {
        this.busy = false
      }
    },
    async approveItem(item) {
      this.busy = true
      this.error = ''
      try {
        await learningApi.approveTeacherLearningPlanItem(item.id)
        this.success = this.t('teacher.plan_suggestion_approved')
        await this.reload()
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('teacher.plan_save_error')
      } finally {
        this.busy = false
      }
    },
    async skipItem(item) {
      this.busy = true
      try {
        await learningApi.skipTeacherLearningPlanItem(item.id)
        await this.reload()
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('teacher.plan_save_error')
      } finally {
        this.busy = false
      }
    },
    async sendFeedback(item) {
      const body = String(this.feedbackDrafts[item.id] || '').trim()
      if (!body || !item.recipient_id) return
      this.busy = true
      this.error = ''
      try {
        await learningApi.sendTeacherAssignmentMessage(item.recipient_id, body)
        this.feedbackDrafts[item.id] = ''
        this.success = this.t('teacher.plan_feedback_sent')
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('teacher.plan_save_error')
      } finally {
        this.busy = false
      }
    },
    async requestAttempt(item) {
      this.busy = true
      this.error = ''
      try {
        await learningApi.requestTeacherAssignmentCorrection(item.recipient_id, this.feedbackDrafts[item.id] || '')
        this.success = this.t('teacher.plan_attempt_requested')
        await this.reload()
      } catch (error) {
        this.error = error?.response?.data?.message
          || Object.values(error?.response?.data?.errors || {})?.[0]?.[0]
          || this.t('teacher.plan_save_error')
      } finally {
        this.busy = false
      }
    },
    async completeActivity(item) {
      this.busy = true
      this.error = ''
      try {
        await learningApi.approveTeacherAssignmentRecipient(item.recipient_id)
        this.success = this.t('teacher.plan_activity_completed')
        await this.reload()
        this.$emit('updated')
      } catch (error) {
        this.error = error?.response?.data?.message
          || Object.values(error?.response?.data?.errors || {})?.[0]?.[0]
          || this.t('teacher.plan_save_error')
      } finally {
        this.busy = false
      }
    },
    async applyTemplate(tpl) {
      if (!this.studentId) return
      this.busy = true
      this.error = ''
      try {
        await learningApi.applyTeacherLearningPlanTemplate(tpl.id, {
          student_id: this.studentId,
          starts_on: todayIso(),
        })
        this.success = this.t('teacher.plan_from_template')
        this.showTemplates = false
        await this.reload()
        this.$emit('updated')
      } catch (error) {
        this.error = error?.response?.data?.message
          || Object.values(error?.response?.data?.errors || {})?.[0]?.[0]
          || this.t('teacher.plan_save_error')
      } finally {
        this.busy = false
      }
    },
    async saveAsTemplate(plan) {
      this.menuId = null
      this.busy = true
      this.error = ''
      try {
        await learningApi.createTeacherLearningPlanTemplate({
          name: plan.title,
          cadence: plan.cadence === 'custom' ? 'weekly' : plan.cadence,
          description: plan.notes || '',
          items: (plan.items || []).filter((item) => item.origin !== 'suggested').map((item, index) => ({
            kind: item.kind,
            hifz_category: item.hifz_category,
            surah_number: item.surah_number,
            ayah_start: item.ayah_start,
            ayah_end: item.ayah_end,
            repetition_target: item.repetition_target,
            day_offset: index,
            priority: item.priority,
            instructions: item.instructions,
          })),
        })
        this.success = this.t('teacher.plan_template_saved')
        const templatesRes = await learningApi.getTeacherLearningPlanTemplates()
        this.templates = Array.isArray(templatesRes?.data) ? templatesRes.data : []
      } catch (error) {
        this.error = error?.response?.data?.message || this.t('teacher.plan_save_error')
      } finally {
        this.busy = false
      }
    },
    planPercent(plan) {
      return activityProgressPercent(plan?.progress?.completed, plan?.progress?.total)
    },
    planMeterStyle(plan) {
      return progressMeterStyle(plan?.progress?.completed, plan?.progress?.total)
    },
    activitiesComplete(plan) {
      const total = Number(plan.progress?.total || 0)
      return total > 0 && Number(plan.progress?.completed || 0) >= total
    },
    badge(plan) {
      if (plan.status === 'completed' && !plan.progress_complete && !this.activitiesComplete(plan)) {
        return { key: 'closed', label: this.t('teacher.plan_status_closed') }
      }
      return { key: plan.status, label: this.statusLabel(plan.status) }
    },
    nextOf(plan) {
      return (plan.items || [])
        .filter((item) => ['overdue', 'submitted', 'upcoming', 'in_progress', 'planned'].includes(item.display_status))
        .slice()
        .sort((a, b) => String(a.due_on || '9999').localeCompare(String(b.due_on || '9999')))[0] || null
    },
    isOverdue(plan) { return Number(plan.progress?.overdue || 0) > 0 || this.nextOf(plan)?.display_status === 'overdue' },
    formatDate(value) {
      const [year, month, day] = String(value || '').slice(0, 10).split('-').map(Number)
      if (!year || !month || !day) return ''
      return new Date(year, month - 1, day).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    },
    planSpan(plan) {
      const start = String(plan?.starts_on || '').slice(0, 10)
      const end = String(plan?.ends_on || '').slice(0, 10)
      if (!start) return ''
      if (!end || end === start) return this.formatDate(start)
      const [startYear, startMonth, startDay] = start.split('-').map(Number)
      const [endYear, endMonth, endDay] = end.split('-').map(Number)
      const startDate = new Date(startYear, startMonth - 1, startDay)
      const endDate = new Date(endYear, endMonth - 1, endDay)
      const monthName = (date) => date.toLocaleDateString(undefined, { month: 'short' })
      if (startYear === endYear && startMonth === endMonth) return `${startDay}–${endDay} ${monthName(startDate)} ${startYear}`
      if (startYear === endYear) return `${startDay} ${monthName(startDate)} – ${endDay} ${monthName(endDate)} ${startYear}`
      return `${this.formatDate(start)} – ${this.formatDate(end)}`
    },
    cadenceLabel(value) {
      if (value === 'monthly') return this.t('teacher.plan_monthly')
      if (value === 'custom') return this.t('teacher.plan_custom')
      return this.t('teacher.plan_weekly')
    },
    statusLabel(value) {
      const key = {
        draft: 'teacher.plan_status_draft',
        active: 'teacher.plan_status_active',
        paused: 'teacher.plan_status_paused',
        completed: 'teacher.plan_status_completed',
        archived: 'teacher.plan_status_archived',
      }[value]
      return key ? this.t(key) : value
    },
    recommendationStatusLabel(value) {
      const key = {
        pending: 'teacher.plan_recommendation_pending',
        accepted: 'teacher.plan_recommendation_accepted',
        dismissed: 'teacher.plan_recommendation_dismissed',
        assigned: 'teacher.plan_recommendation_assigned',
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
        skipped: 'teacher.plan_status_skipped',
      }[value]
      return key ? this.t(key) : value
    },
    activityLabel(item) {
      return assignmentDisplayLabel({
        kind: item?.kind,
        hifz_category: item?.hifz_category,
        activity: item?.activity,
      }, this.t.bind(this)) || this.t('teacher.plan_kind_practice')
    },
  },
}
</script>
