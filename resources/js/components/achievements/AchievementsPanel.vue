<template>
  <div class="ach-progress" :class="{ 'ach-progress--preview': mode === 'preview' }">
    <section
      v-if="nextMilestone"
      class="ach-progress__block ach-progress__block--hero"
      :aria-labelledby="nextHeadingId"
    >
      <h3 :id="nextHeadingId" class="ach-progress__heading">{{ nextMilestoneLabel }}</h3>
      <AchievementCard
        :item="nextMilestone"
        :locale="locale"
        :title="nameFor(nextMilestone)"
        :description="descriptionFor(nextMilestone)"
        :meaning="resolveMeaning(nextMilestone)"
        :how-to-earn="resolveHow(nextMilestone)"
        :status-label="resolveStatus(nextMilestone)"
        :progress-label="progressFor(nextMilestone)"
        :requirement="requirementFor(nextMilestone)"
        :unlock-prefix="unlockPrefix"
        :expand-desc-label="expandDescLabel"
        :collapse-desc-label="collapseDescLabel"
        variant="hero"
      />
    </section>

    <p v-if="summaryLine" class="ach-progress__summary" role="status">
      {{ summaryLine }}
    </p>

    <section
      v-if="earnedItems.length"
      class="ach-progress__block"
      :aria-labelledby="earnedHeadingId"
    >
      <h3 :id="earnedHeadingId" class="ach-progress__heading">{{ earnedSectionLabel }}</h3>
      <div class="ach-progress__grid ach-progress__grid--earned" role="list">
        <AchievementCard
          v-for="item in earnedItems"
          :key="item.id"
          role="listitem"
          :item="item"
          :locale="locale"
          :title="nameFor(item)"
          :description="descriptionFor(item)"
          :meaning="resolveMeaning(item)"
          :how-to-earn="resolveHow(item)"
          :status-label="resolveStatus(item)"
          :progress-label="progressFor(item)"
          :requirement="requirementFor(item)"
          :unlock-prefix="unlockPrefix"
          :expand-desc-label="expandDescLabel"
          :collapse-desc-label="collapseDescLabel"
          variant="compact"
        />
      </div>
    </section>

    <section
      v-if="inProgressItems.length"
      class="ach-progress__block"
      :aria-labelledby="inProgressHeadingId"
    >
      <h3 :id="inProgressHeadingId" class="ach-progress__heading">{{ inProgressSectionLabel }}</h3>
      <div class="ach-progress__list" role="list">
        <AchievementCard
          v-for="item in inProgressItems"
          :key="item.id"
          role="listitem"
          :item="item"
          :locale="locale"
          :title="nameFor(item)"
          :description="descriptionFor(item)"
          :meaning="resolveMeaning(item)"
          :how-to-earn="resolveHow(item)"
          :status-label="resolveStatus(item)"
          :progress-label="progressFor(item)"
          :requirement="requirementFor(item)"
          :unlock-prefix="unlockPrefix"
          :expand-desc-label="expandDescLabel"
          :collapse-desc-label="collapseDescLabel"
          variant="row"
        />
      </div>
    </section>

    <template v-if="showTierGroups">
      <section
        v-for="tier in tierGroups"
        :key="tier.id"
        class="ach-progress__tier"
        :class="{ 'is-expanded': tierOpen[tier.id] }"
      >
        <header class="ach-progress__tier-head">
          <button
            type="button"
            class="ach-progress__tier-toggle"
            :aria-expanded="tierOpen[tier.id] ? 'true' : 'false'"
            :aria-controls="`ach-tier-${tier.id}`"
            @click="toggleTier(tier.id)"
          >
            <span class="ach-progress__tier-copy">
              <span class="ach-progress__tier-title">{{ tierTitle(tier) }}</span>
              <span v-if="tierHint(tier)" class="ach-progress__tier-hint">{{ tierHint(tier) }}</span>
            </span>
            <span class="ach-progress__tier-meta">
              <span class="ach-progress__tier-count">{{ tierCount(tier) }}</span>
              <i class="bi ach-progress__tier-chevron" :class="tierOpen[tier.id] ? 'bi-chevron-up' : 'bi-chevron-down'" aria-hidden="true"></i>
            </span>
          </button>
        </header>
        <div
          v-show="tierOpen[tier.id]"
          :id="`ach-tier-${tier.id}`"
          class="ach-progress__grid ach-progress__grid--locked"
          role="list"
        >
          <AchievementCard
            v-for="item in lockedInTier(tier)"
            :key="item.id"
            role="listitem"
            :item="item"
            :locale="locale"
            :title="nameFor(item)"
            :description="descriptionFor(item)"
            :meaning="resolveMeaning(item)"
            :how-to-earn="resolveHow(item)"
            :status-label="resolveStatus(item)"
            :progress-label="progressFor(item)"
            :requirement="requirementFor(item)"
            :unlock-prefix="unlockPrefix"
            :expand-desc-label="expandDescLabel"
            :collapse-desc-label="collapseDescLabel"
            variant="compact"
          />
        </div>
      </section>
    </template>
  </div>
</template>

<script>
import AchievementCard from './AchievementCard.vue'

const TIER_ORDER = ['beginner', 'intermediate', 'advanced']

export default {
  name: 'AchievementsPanel',
  components: { AchievementCard },
  props: {
    items: { type: Array, default: () => [] },
    tiers: { type: Array, default: () => [] },
    next: { type: Object, default: null },
    activeTier: { type: String, default: '' },
    unlockedCount: { type: Number, default: null },
    totalCount: { type: Number, default: null },
    mode: { type: String, default: 'full' },
    locale: { type: String, default: 'en' },
    nextMilestoneLabel: { type: String, default: 'Next milestone' },
    earnedSectionLabel: { type: String, default: 'Earned' },
    inProgressSectionLabel: { type: String, default: 'In progress' },
    summaryTemplate: { type: String, default: '{earned} of {total} earned' },
    expandDescLabel: { type: String, default: 'More' },
    collapseDescLabel: { type: String, default: 'Less' },
    unlockPrefix: { type: String, default: '' },
    nameFor: { type: Function, required: true },
    descriptionFor: { type: Function, required: true },
    meaningFor: { type: Function, required: true },
    howLabelFor: { type: Function, default: null },
    statusFor: { type: Function, required: true },
    progressFor: { type: Function, required: true },
    requirementFor: { type: Function, required: true },
    tierTitleFor: { type: Function, required: true },
    tierHintFor: { type: Function, required: true },
  },
  data() {
    return {
      tierOpen: { beginner: false, intermediate: false, advanced: false },
      uid: Math.random().toString(36).slice(2, 9),
    }
  },
  computed: {
    nextHeadingId() {
      return `ach-next-${this.uid}`
    },
    earnedHeadingId() {
      return `ach-earned-${this.uid}`
    },
    inProgressHeadingId() {
      return `ach-progress-${this.uid}`
    },
    allItems() {
      return Array.isArray(this.items) ? this.items : []
    },
    nextMilestone() {
      if (this.next?.id) return this.next
      return this.allItems.find((item) => item.is_next) || null
    },
    earnedItems() {
      const earned = this.allItems.filter((item) => item.state === 'unlocked')
      earned.sort((a, b) => String(b.unlocked_at || '').localeCompare(String(a.unlocked_at || '')))
      return earned
    },
    inProgressItems() {
      const nextId = this.nextMilestone?.id
      return this.allItems.filter((item) => {
        if (item.state !== 'in_progress') return false
        if (nextId && item.id === nextId) return false
        return true
      })
    },
    summaryLine() {
      const earned = this.unlockedCount != null ? this.unlockedCount : this.earnedItems.length
      const total = this.totalCount != null ? this.totalCount : this.allItems.length
      if (total <= 0) return ''
      return this.summaryTemplate
        .replace('{earned}', String(earned))
        .replace('{total}', String(total))
    },
    showTierGroups() {
      return this.mode === 'full'
    },
    tierGroups() {
      if (Array.isArray(this.tiers) && this.tiers.length) {
        return this.tiers.map((tier) => ({
          ...tier,
          items: Array.isArray(tier.items) ? tier.items : [],
        }))
      }
      const map = {}
      this.allItems.forEach((item) => {
        const id = item?.tier || 'beginner'
        if (!map[id]) {
          map[id] = { id, items: [], unlocked_count: 0, total_count: 0 }
        }
        map[id].items.push(item)
        map[id].total_count += 1
        if (item.state === 'unlocked') map[id].unlocked_count += 1
      })
      return TIER_ORDER.map((id) => map[id]).filter(Boolean)
    },
    defaultOpenTier() {
      if (this.activeTier && TIER_ORDER.includes(this.activeTier)) return this.activeTier
      const fromNext = this.nextMilestone?.tier
      if (fromNext && TIER_ORDER.includes(fromNext)) return fromNext
      return 'beginner'
    },
  },
  watch: {
    defaultOpenTier: {
      immediate: true,
      handler(tier) {
        TIER_ORDER.forEach((id) => {
          this.tierOpen[id] = id === tier
        })
      },
    },
  },
  methods: {
    tierTitle(tier) {
      return this.tierTitleFor(tier)
    },
    tierHint(tier) {
      return this.tierHintFor(tier) || ''
    },
    tierCount(tier) {
      return `${tier.unlocked_count || 0} / ${tier.total_count || 0}`
    },
    lockedInTier(tier) {
      const items = Array.isArray(tier?.items) ? tier.items : []
      return items.filter((item) => item.state === 'locked')
    },
    toggleTier(id) {
      this.tierOpen = { ...this.tierOpen, [id]: !this.tierOpen[id] }
    },
    resolveMeaning(item) {
      return this.meaningFor(item) || ''
    },
    resolveStatus(item) {
      return this.statusFor(item) || ''
    },
    resolveHow(item) {
      if (typeof this.howLabelFor === 'function') {
        return this.howLabelFor(item) || ''
      }
      return ''
    },
  },
}
</script>