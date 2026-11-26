<template>
  <Teleport to="body">
    <motion-wrapper
      v-if="active && currentStep"
      class="sandbox-walkthrough"
      role="dialog"
      aria-modal="false"
      :aria-label="t('previewDemo.walkthrough.dialogLabel')"
    >
      <motion-wrapper class="sandbox-walkthrough__scrim" aria-hidden="true" @click="onScrimClick" />
      <motion-wrapper
        v-if="spotlightStyle"
        class="sandbox-walkthrough__spotlight"
        aria-hidden="true"
        :style="spotlightStyle"
      />
      <motion-wrapper class="sandbox-walkthrough__card" :style="cardStyle">
        <header class="sandbox-walkthrough__head">
          <p class="sandbox-walkthrough__progress" aria-live="polite">
            {{ t('previewDemo.walkthrough.progress', { current: stepIndex + 1, total: totalSteps }) }}
          </p>
          <div class="sandbox-walkthrough__progress-track" aria-hidden="true">
            <span class="sandbox-walkthrough__progress-fill" :style="{ width: `${Math.round(progress * 100)}%` }" />
          </div>
        </header>
        <h2 class="sandbox-walkthrough__title">{{ stepTitle }}</h2>
        <p class="sandbox-walkthrough__body">{{ stepBody }}</p>
        <p v-if="missingTarget && !currentStep.optional" class="sandbox-walkthrough__hint" role="status">
          {{ t('previewDemo.walkthrough.targetMissing') }}
        </p>
        <p v-if="personaHint" class="sandbox-walkthrough__hint">{{ personaHint }}</p>
        <footer class="sandbox-walkthrough__actions">
          <button type="button" class="sandbox-walkthrough__btn sandbox-walkthrough__btn--quiet" @click="skip">
            {{ t('previewDemo.walkthrough.skip') }}
          </button>
          <button type="button" class="sandbox-walkthrough__btn sandbox-walkthrough__btn--quiet" @click="togglePause">
            {{ paused ? t('previewDemo.walkthrough.resume') : t('previewDemo.walkthrough.pause') }}
          </button>
          <button
            v-if="stepIndex > 0"
            type="button"
            class="sandbox-walkthrough__btn"
            @click="retreatStep"
          >
            {{ t('previewDemo.walkthrough.back') }}
          </button>
          <button
            v-if="showContinue"
            type="button"
            class="sandbox-walkthrough__btn sandbox-walkthrough__btn--primary"
            @click="advanceStep"
          >
            {{ continueLabel }}
          </button>
        </footer>
      </motion-wrapper>
    </motion-wrapper>
  </Teleport>
</template>

<script>
import { computed, defineComponent, h } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSandboxWalkthrough } from '../../composables/useSandboxWalkthrough.js';

const MotionWrapper = defineComponent({
  name: 'MotionWrapper',
  props: {
    tag: { type: String, default: 'div' },
  },
  setup(props, { slots, attrs }) {
    return () => h(props.tag, { ...attrs, class: ['sandbox-motion-surface', attrs.class] }, slots.default?.());
  },
});

export default {
  name: 'PreviewSandboxWalkthrough',
  components: { MotionWrapper },
  props: {
    config: { type: Object, required: true },
  },
  emits: ['complete'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const configRef = computed(() => props.config);
    const tour = useSandboxWalkthrough({
      t,
      config: configRef,
      emitComplete: () => emit('complete'),
    });

    const stepTitle = computed(() => {
      const key = tour.currentStep.value?.titleKey;
      return key ? t(key) : '';
    });
    const stepBody = computed(() => {
      const key = tour.currentStep.value?.bodyKey;
      return key ? t(key) : '';
    });

    const showContinue = computed(() => {
      const step = tour.currentStep.value;
      if (!step) return false;
      if (tour.paused.value) return true;
      return step.advance === 'manual' || step.optional;
    });

    const continueLabel = computed(() => {
      if (tour.currentStep.value?.complete) {
        return t('previewDemo.walkthrough.done');
      }
      return t('previewDemo.walkthrough.continue');
    });

    const personaHint = computed(() => {
      const step = tour.currentStep.value;
      if (!step?.requiredPersona) return '';
      if (props.config.activePersona === step.requiredPersona) return '';
      return t('previewDemo.walkthrough.personaHint', { persona: step.requiredPersona });
    });

    const spotlightStyle = computed(() => {
      const rect = tour.targetRect.value;
      if (!rect) return null;
      const radius = tour.currentStep.value?.radius ?? 12;
      return {
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        borderRadius: `${radius}px`,
      };
    });

    const cardStyle = computed(() => {
      const rect = tour.targetRect.value;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
      if (!rect) {
        return { bottom: '6.5rem', left: '50%', transform: 'translateX(-50%)' };
      }
      const preferTop = rect.top > viewportHeight * 0.55;
      if (preferTop) {
        return {
          top: `${Math.max(12, rect.top - 12)}px`,
          left: '50%',
          transform: 'translate(-50%, -100%)',
        };
      }
      return {
        top: `${rect.top + rect.height + 14}px`,
        left: '50%',
        transform: 'translateX(-50%)',
      };
    });

    const onScrimClick = () => {
      /* non-blocking — only dismiss via Skip */
    };

    return {
      t,
      ...tour,
      stepTitle,
      stepBody,
      showContinue,
      continueLabel,
      personaHint,
      spotlightStyle,
      cardStyle,
      onScrimClick,
    };
  },
};
</script>

<style src="../../styles/sandbox-walkthrough.css"></style>
<style src="../../styles/sandbox-motion.css"></style>