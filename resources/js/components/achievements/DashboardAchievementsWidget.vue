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
      <div v-if="initial" class="dash-achievements__empty">
        <p>{{ emptyTitle }}</p>
        <p class="dash-achievements__empty-hint">{{ emptyHint }}</p>
      </div>
      <template v-else>
        <AchievementsPanel
          mode="preview"
          :items="items"
          :tiers="tiers"
          :next="widget?.next || null"
          :active-tier="widget?.active_tier || ''"
          :unlocked-count="widget?.unlocked_count"
          :total-count="widget?.total_count"
          :locale="locale"
          :next-milestone-label="nextMilestoneLabel"
          :earned-section-label="earnedSectionLabel"
          :in-progress-section-label="inProgressSectionLabel"
          :summary-template="summaryTemplate"
          :expand-desc-label="expandDescLabel"
          :collapse-desc-label="collapseDescLabel"
          :name-for="nameFor"
          :description-for="descriptionFor"
          :meaning-for="meaningFor"
          :how-label-for="howFor"
          :status-for="statusFor"
          :progress-for="progressFor"
          :requirement-for="requirementFor"
          :tier-title-for="tierTitleFor"
          :tier-hint-for="tierHintFor"
          :unlock-prefix="unlockPrefix"
        />
        <button
          type="button"
          class="dash-btn dash-btn--ghost dash-achievements__view-all"
          @click="$emit('view-all')"
        >
          {{ viewAllLabel }}
        </button>
      </template>
    </div>
  </section>
</template>

<script>
import AchievementsPanel from './AchievementsPanel.vue'

export default {
  name: 'DashboardAchievementsWidget',
  components: { AchievementsPanel },
  props: {
    widget: { type: Object, default: null },
    collapsed: { type: Boolean, default: false },
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    subtitleFor: { type: Function, default: null },
    viewAllLabel: { type: String, required: true },
    nextMilestoneLabel: { type: String, default: 'Next milestone' },
    earnedSectionLabel: { type: String, default: 'Earned' },
    inProgressSectionLabel: { type: String, default: 'In progress' },
    summaryTemplate: { type: String, default: '{earned} of {total} earned' },
    expandDescLabel: { type: String, default: 'More' },
    collapseDescLabel: { type: String, default: 'Less' },
    emptyTitle: { type: String, required: true },
    emptyHint: { type: String, required: true },
    locale: { type: String, default: 'en' },
    unlockPrefix: { type: String, default: '' },
    nameFor: { type: Function, required: true },
    descriptionFor: { type: Function, required: true },
    meaningFor: { type: Function, required: true },
    howFor: { type: Function, default: null },
    statusFor: { type: Function, required: true },
    progressFor: { type: Function, required: true },
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
    resolvedSubtitle() {
      if (typeof this.subtitleFor === 'function') {
        return this.subtitleFor(this.widget) || this.subtitle
      }
      return this.subtitle
    },
  },
}
</script>