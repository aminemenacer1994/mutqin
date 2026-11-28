<template>
  <button
    type="button"
    class="mr-mutqin-flagship"
    :class="{ 'mr-mutqin-flagship--compact': compact }"
    data-testid="mr-mutqin-sidebar"
    :aria-label="t('mrMutqin.sidebar.aria')"
    @click="$emit('open')"
  >
    <span class="mr-mutqin-flagship__orb">
      <MrMutqinWaveform
        variant="flagship"
        :bar-count="7"
        :idle="true"
        :active="hovered || focused"
      />
    </span>
    <template v-if="!compact">
      <span class="mr-mutqin-flagship__title">{{ t('mrMutqin.sidebar.title') }}</span>
      <span class="mr-mutqin-flagship__beta">{{ t('mrMutqin.sidebar.beta') }}</span>
    </template>
  </button>
</template>

<script>
import './MrMutqinSidebarCard.css'
import { i18nMixin } from '../../mixins/i18nMixin'
import MrMutqinWaveform from './MrMutqinWaveform.vue'

export default {
  name: 'MrMutqinSidebarCard',
  components: { MrMutqinWaveform },
  mixins: [i18nMixin],
  props: {
    role: { type: String, default: 'student' },
    compact: { type: Boolean, default: false },
  },
  emits: ['open'],
  data() {
    return { hovered: false, focused: false }
  },
  mounted() {
    const el = this.$el
    el?.addEventListener('mouseenter', this.onEnter)
    el?.addEventListener('mouseleave', this.onLeave)
    el?.addEventListener('focus', this.onFocus)
    el?.addEventListener('blur', this.onBlur)
  },
  beforeUnmount() {
    const el = this.$el
    el?.removeEventListener('mouseenter', this.onEnter)
    el?.removeEventListener('mouseleave', this.onLeave)
    el?.removeEventListener('focus', this.onFocus)
    el?.removeEventListener('blur', this.onBlur)
  },
  methods: {
    onEnter() { this.hovered = true },
    onLeave() { this.hovered = false },
    onFocus() { this.focused = true },
    onBlur() { this.focused = false },
  },
}
</script>