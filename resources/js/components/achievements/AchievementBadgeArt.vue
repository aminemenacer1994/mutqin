<template>
  <span class="ach-art" :class="[`ach-art--${tone}`, `ach-art--${size}`, { 'is-muted': muted }]" aria-hidden="true">
    <svg class="ach-art__plate" viewBox="0 0 64 64" focusable="false">
      <defs>
        <linearGradient :id="gradId" x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" :stop-color="colors.light" />
          <stop offset="100%" :stop-color="colors.dark" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" :fill="`url(#${gradId})`" opacity="0.42" />
      <circle cx="32" cy="32" r="22" fill="currentColor" opacity="0.22" />
      <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" stroke-width="2" opacity="0.7" />
    </svg>
    <i class="ach-art__glyph" :class="iconClass"></i>
  </span>
</template>

<script>
import { achievementIconClass, achievementTone } from './achievementMeta.js'

const TONE_COLORS = {
  gold: { light: '#f0c56a', dark: '#a06b12' },
  emerald: { light: '#5ecf8e', dark: '#1f7a4a' },
  sage: { light: '#6fbf7e', dark: '#2f7a3f' },
  blue: { light: '#6eb0e8', dark: '#1f5f9a' },
  purple: { light: '#b88ae8', dark: '#6b2fad' },
  orange: { light: '#ff9f4a', dark: '#c45a0c' },
  red: { light: '#ff7a7a', dark: '#c62828' },
  black: { light: '#6a6a6a', dark: '#111111' },
}

let artSeq = 0

export default {
  name: 'AchievementBadgeArt',
  props: {
    item: { type: Object, default: null },
    icon: { type: String, default: '' },
    id: { type: String, default: '' },
    size: { type: String, default: 'md' },
    muted: { type: Boolean, default: false },
  },
  data() {
    return { uid: ++artSeq }
  },
  computed: {
    tone() {
      return achievementTone(this.item?.id || this.id)
    },
    colors() {
      return TONE_COLORS[this.tone] || TONE_COLORS.sage
    },
    iconClass() {
      return achievementIconClass(this.item?.icon || this.icon)
    },
    gradId() {
      return `ach-grad-${this.tone}-${this.uid}`
    },
  },
}
</script>
