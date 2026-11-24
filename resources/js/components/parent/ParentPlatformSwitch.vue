<template>
  <component :is="embedded ? 'div' : 'section'" :class="embedded ? 'parent-platform-switch parent-platform-switch--embedded' : 'teacher-pane parent-platform-switch'">
    <header v-if="!embedded" class="teacher-pane__head">
      <div>
        <p class="teacher-hero__eyebrow">{{ t('parent.platform_switch_eyebrow') }}</p>
        <h2 class="teacher-pane__title">{{ t('parent.platform_switch_title') }}</h2>
        <p class="teacher-pane__hint">{{ t('parent.platform_switch_hint') }}</p>
      </div>
    </header>
    <div :class="embedded ? '' : 'teacher-pane__body'">
      <form method="POST" :action="switchUrl" class="parent-platform-switch__form">
        <input type="hidden" name="_token" :value="csrfToken" />
        <button
          v-for="platform in platforms"
          :key="platform.id"
          type="submit"
          name="platform"
          :value="platform.id"
          class="btn btn-outline-secondary btn-sm"
        >
          <i :class="iconFor(platform.id)" aria-hidden="true"></i>
          {{ labelFor(platform.id) }}
        </button>
      </form>
    </div>
  </component>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'

export default {
  name: 'ParentPlatformSwitch',
  mixins: [i18nMixin],
  props: {
    platforms: { type: Array, default: () => [] },
    switchUrl: { type: String, required: true },
    csrfToken: { type: String, required: true },
    embedded: { type: Boolean, default: false },
  },
  methods: {
    iconFor(id) {
      if (id === 'teacher') return 'bi bi-mortarboard'
      if (id === 'parent') return 'bi bi-people'
      return 'bi bi-journal-bookmark'
    },
    labelFor(id) {
      if (id === 'teacher') return this.t('parent.platform_teacher')
      if (id === 'parent') return this.t('parent.platform_parent')
      return this.t('parent.platform_learner')
    },
  },
}
</script>