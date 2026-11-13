<template>
  <section
    v-if="visible"
    id="achievements"
    class="dash-section dash-section--flat dash-achievements dash-reveal"
    :class="{ 'is-collapsed': collapsed }"
    aria-labelledby="dash-achievements-heading"
    style="--dash-delay: 30ms"
  >
    <div class="dash-section__head dash-section__head--compact">
      <div class="dash-section__head-row">
        <button
          type="button"
          class="dash-section__collapse"
          :aria-expanded="collapsed ? 'false' : 'true'"
          aria-controls="dash-achievements-body"
          @click="$emit('toggle')"
        >
          <span class="dash-section__title">
            <span class="dash-section__icon dash-section__icon--activity" aria-hidden="true">
              <i class="bi bi-award" aria-hidden="true"></i>
            </span>
            <span class="dash-section__title-copy">
              <h2 id="dash-achievements-heading">{{ title }}</h2>
              <p v-if="resolvedSubtitle" class="dash-section__hint">{{ resolvedSubtitle }}</p>
            </span>
          </span>
          <i class="bi dash-section__chevron" :class="collapsed ? 'bi-chevron-down' : 'bi-chevron-up'" aria-hidden="true"></i>
        </button>
      </div>
    </div>

    <div v-show="!collapsed" id="dash-achievements-body" class="dash-section__body dash-achievements__body">
      <div class="dash-achievements__mobile">
        <div v-if="initial" class="dash-achievements__empty">
          <p>{{ emptyTitle }}</p>
          <p class="dash-achievements__empty-hint">{{ emptyHint }}</p>
        </div>
        <div v-else-if="focus" class="dash-achievements__summary">
          <div class="dash-achievements__focus" :class="`dash-achievements__focus--${tone}`">
            <AchievementBadgeArt :item="focus" size="md" :muted="focus.state === 'locked'" />
            <div class="dash-achievements__focus-copy">
              <span v-if="focusStatus" class="dash-achievements__status" :class="focusStatusClass">
                {{ focusStatus }}
              </span>
              <strong>{{ focusTitle }}</strong>
              <p v-if="focusMeaning">{{ focusMeaning }}</p>
              <p v-if="focusProgress">{{ focusProgress }}</p>
              <div v-if="focusPercent != null" class="ach-badge__meter" aria-hidden="true">
                <span class="ach-badge__meter-fill" :style="{ width: `${focusPercent}%` }"></span>
              </div>
            </div>
          </div>
        </div>
        <button
          type="button"
          class="dash-btn dash-btn--ghost dash-achievements__view-all"
          @click="$emit('view-all')"
        >
          {{ viewAllLabel }}
        </button>
      </div>

      <div class="dash-achievements__desktop">
        <div v-if="initial" class="dash-achievements__empty">
          <p>{{ emptyTitle }}</p>
          <p class="dash-achievements__empty-hint">{{ emptyHint }}</p>
        </div>
        <AchievementsPanel
          v-else
          :items="items"
          :tiers="tiers"
          :locale="locale"
          :show-more-label="showMoreLabel"
          :show-less-label="showLessLabel"
          :name-for="nameFor"
          :description-for="descriptionFor"
          :meaning-for="meaningFor"
          :status-for="statusFor"
          :progress-for="progressFor"
          :requirement-for="requirementFor"
          :tier-title-for="tierTitleFor"
          :tier-hint-for="tierHintFor"
          :unlock-prefix="unlockPrefix"
        />
      </div>
    </div>
  </section>
</template>

<script>
import { achievementTone } from './achievementMeta.js'
import AchievementBadgeArt from './AchievementBadgeArt.vue'
import AchievementsPanel from './AchievementsPanel.vue'

export default {
  name: 'DashboardAchievementsWidget',
  components: { AchievementBadgeArt, AchievementsPanel },
  props: {
    widget: { type: Object, default: null },
    collapsed: { type: Boolean, default: false },
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    subtitleFor: { type: Function, default: null },
    viewAllLabel: { type: String, required: true },
    showMoreLabel: { type: String, default: 'Show more' },
    showLessLabel: { type: String, default: 'Show less' },
    emptyTitle: { type: String, required: true },
    emptyHint: { type: String, required: true },
    locale: { type: String, default: 'en' },
    unlockPrefix: { type: String, default: '' },
    nameFor: { type: Function, required: true },
    descriptionFor: { type: Function, required: true },
    meaningFor: { type: Function, required: true },
    statusFor: { type: Function, required: true },
    progressFor: { type: Function, required: true },
    remainingFor: { type: Function, required: true },
    requirementFor: { type: Function, required: true },
    tierTitleFor: { type: Function, required: true },
    tierHintFor: { type: Function, required: true },
  },
  emits: ['toggle', 'view-all'],
  computed: {
    visible() {
      return !!this.widget
    },
    initial() {
      return !!this.widget?.initial && !this.widget?.next && !this.widget?.latest
    },
    items() {
      return Array.isArray(this.widget?.items) ? this.widget.items : []
    },
    tiers() {
      return Array.isArray(this.widget?.tiers) ? this.widget.tiers : []
    },
    focus() {
      if (this.widget?.next) return this.widget.next
      return this.widget?.latest || null
    },
    tone() {
      return achievementTone(this.focus?.id)
    },
    resolvedSubtitle() {
      if (typeof this.subtitleFor === 'function') {
        return this.subtitleFor(this.widget) || this.subtitle
      }
      return this.subtitle
    },
    focusTitle() {
      return this.focus ? this.nameFor(this.focus) : ''
    },
    focusStatus() {
      return this.focus ? this.statusFor(this.focus) : ''
    },
    focusStatusClass() {
      if (this.focus?.is_next || this.focus?.state === 'in_progress') return 'dash-achievements__status--next'
      if (this.focus?.state === 'unlocked') return 'dash-achievements__status--unlocked'
      return 'dash-achievements__status--locked'
    },
    focusMeaning() {
      if (!this.focus || this.focus.state === 'unlocked') return ''
      return this.meaningFor(this.focus) || this.descriptionFor(this.focus) || ''
    },
    focusProgress() {
      if (!this.focus || this.focus.state === 'unlocked') return ''
      return this.progressFor(this.focus) || this.remainingFor(this.focus) || ''
    },
    focusPercent() {
      if (!this.focus || this.focus.state === 'unlocked') return null
      if (this.focus.percent == null) return null
      return Math.max(0, Math.min(100, Number(this.focus.percent) || 0))
    },
  },
}
</script>
