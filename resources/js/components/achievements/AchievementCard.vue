<template>
  <article
    class="ach-card"
    :class="cardClasses"
    :aria-label="ariaLabel"
  >
    <AchievementBadgeArt
      :item="item"
      size="md"
      :muted="isMutedIcon"
    />
    <div class="ach-card__body">
      <div class="ach-card__head">
        <span v-if="statusLabel" class="ach-card__status" :class="statusClass">
          <i v-if="stateIcon" class="bi" :class="stateIcon" aria-hidden="true"></i>
          {{ statusLabel }}
        </span>
        <h3 class="ach-card__title">{{ title }}</h3>
      </div>

      <p v-if="howToEarn && showHow" class="ach-card__how">{{ howToEarn }}</p>

      <p
        v-if="bodyText"
        class="ach-card__desc"
        :class="{ 'is-clamped': descClamped }"
      >
        <button
          v-if="canToggleDesc"
          type="button"
          class="ach-card__desc-toggle"
          :aria-expanded="descExpanded ? 'true' : 'false'"
          @click="descExpanded = !descExpanded"
        >
          <span class="ach-card__desc-text">{{ bodyText }}</span>
          <span class="ach-card__desc-more">{{ descExpanded ? collapseDescLabel : expandDescLabel }}</span>
        </button>
        <span v-else class="ach-card__desc-text">{{ bodyText }}</span>
      </p>

      <div
        v-if="showProgress"
        class="ach-card__progress"
        role="progressbar"
        :aria-valuenow="progressNow"
        :aria-valuemin="0"
        :aria-valuemax="progressMax"
        :aria-label="progressAria"
      >
        <div class="ach-card__meter" aria-hidden="true">
          <span class="ach-card__meter-fill" :style="{ width: `${displayPercent}%` }"></span>
        </div>
        <p class="ach-card__progress-text">
          <span>{{ progressLabel }}</span>
          <span v-if="displayPercent != null" class="ach-card__pct">{{ displayPercent }}%</span>
        </p>
      </div>

      <p v-else-if="item.state === 'unlocked' && unlockLabel" class="ach-card__earned">
        <i class="bi bi-check-circle-fill" aria-hidden="true"></i>
        {{ unlockLabel }}
      </p>

      <p v-else-if="requirement" class="ach-card__req">
        <i class="bi bi-lock" aria-hidden="true"></i>
        {{ requirement }}
      </p>
    </div>
  </article>
</template>

<script>
import { formatUnlockDate } from './achievementMeta.js'
import AchievementBadgeArt from './AchievementBadgeArt.vue'

export default {
  name: 'AchievementCard',
  components: { AchievementBadgeArt },
  props: {
    item: { type: Object, required: true },
    locale: { type: String, default: 'en' },
    title: { type: String, required: true },
    description: { type: String, required: true },
    meaning: { type: String, default: '' },
    howToEarn: { type: String, default: '' },
    statusLabel: { type: String, default: '' },
    progressLabel: { type: String, default: '' },
    requirement: { type: String, default: '' },
    unlockPrefix: { type: String, default: '' },
    variant: { type: String, default: 'default' },
    expandDescLabel: { type: String, default: 'More' },
    collapseDescLabel: { type: String, default: 'Less' },
  },
  data() {
    return { descExpanded: false }
  },
  computed: {
    tone() {
      return this.item?.state === 'unlocked' ? 'success' : 'brand'
    },
    isPathLocked() {
      return this.item?.detail === 'path_locked' || this.item?.path_open === false
    },
    cardClasses() {
      return [
        `ach-card--${this.tone}`,
        `ach-card--${this.item.state || 'locked'}`,
        `ach-card--${this.variant}`,
        { 'is-next': !!this.item.is_next },
        { 'is-path-locked': this.isPathLocked },
      ]
    },
    state() {
      return this.item?.state || 'locked'
    },
    statusClass() {
      if (this.item?.is_next) return 'ach-card__status--next'
      return `ach-card__status--${this.state}`
    },
    stateIcon() {
      if (this.state === 'unlocked') return 'bi-check-lg'
      if (this.state === 'locked' || this.isPathLocked) return 'bi-lock'
      if (this.state === 'in_progress' || this.item?.is_next) return 'bi-arrow-up-right'
      return ''
    },
    isMutedIcon() {
      return this.state === 'locked' && !this.item?.is_next
    },
    showHow() {
      return this.state !== 'unlocked'
    },
    bodyText() {
      if (this.isPathLocked) return ''
      if (this.state === 'unlocked') return this.meaning || this.description
      return this.meaning || this.description
    },
    canToggleDesc() {
      return (this.bodyText || '').length > 72
    },
    descClamped() {
      return this.canToggleDesc && !this.descExpanded
    },
    progressMax() {
      return Math.max(0, Number(this.item?.target) || 0)
    },
    progressNow() {
      return Math.max(0, Number(this.item?.current) || 0)
    },
    displayPercent() {
      if (this.state === 'unlocked') return 100
      if (this.item?.percent == null) return null
      const raw = Math.max(0, Math.min(100, Number(this.item.percent) || 0))
      if (raw >= 100 && this.state !== 'unlocked') return 99
      return raw
    },
    showProgress() {
      if (this.state === 'unlocked') return false
      if (this.progressMax <= 0) return false
      if (this.state === 'in_progress') return true
      return !!this.item?.is_next && this.progressNow > 0
    },
    unlockLabel() {
      const date = formatUnlockDate(this.item?.unlocked_at, this.locale)
      if (!date) return this.unlockPrefix || ''
      return this.unlockPrefix ? `${this.unlockPrefix} ${date}` : date
    },
    progressAria() {
      const parts = [this.progressLabel || this.title]
      if (this.displayPercent != null) parts.push(`${this.displayPercent}%`)
      return parts.filter(Boolean).join(', ')
    },
    ariaLabel() {
      const parts = [this.statusLabel, this.title]
      if (this.howToEarn && this.showHow) parts.push(this.howToEarn)
      if (this.bodyText) parts.push(this.bodyText)
      if (this.showProgress && this.progressLabel) parts.push(this.progressLabel)
      if (this.state === 'unlocked' && this.unlockLabel) parts.push(this.unlockLabel)
      if (this.state === 'locked' && this.requirement) parts.push(this.requirement)
      return parts.filter(Boolean).join('. ')
    },
  },
}
</script>