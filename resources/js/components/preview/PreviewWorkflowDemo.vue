<template>
  <section
    class="preview-workflow preview-workflow--compact"
    :aria-labelledby="headingId"
    data-reveal
  >
    <div class="wrap preview-workflow--compact__inner">
      <header class="section-head">
        <p class="section-kicker">{{ kicker }}</p>
        <h2 :id="headingId" class="section-title">{{ title }}</h2>
        <p v-if="subtitle" class="section-sub">{{ subtitle }}</p>
      </header>

      <div class="preview-workflow__chips" role="tablist" :aria-label="progressLabel">
        <button
          v-for="(step, idx) in steps"
          :key="step.id"
          type="button"
          class="preview-workflow__chip"
          :class="{ 'is-active': idx === activeIndex }"
          role="tab"
          :aria-selected="idx === activeIndex ? 'true' : 'false'"
          @click="goToStep(idx)"
        >
          {{ step.shortLabel || step.title }}
        </button>
      </div>

      <figure
        class="preview-browser preview-workflow__visual"
        :style="frameStyle"
        :aria-live="playing ? 'polite' : 'off'"
        @pointermove="onPointerMove"
        @pointerleave="resetTilt"
      >
        <Transition name="preview-shot" mode="out-in">
          <img
            :key="activeStep.id"
            class="preview-browser__shot"
            :src="activeStep.src"
            :alt="activeStep.alt"
            width="1440"
            height="900"
            loading="lazy"
            decoding="async"
          >
        </Transition>
      </figure>

      <ul class="preview-workflow__legend">
        <li class="preview-workflow__legend-text">{{ activeStep.caption || activeStep.title }}</li>
      </ul>

      <div class="preview-workflow__controls preview-workflow__controls--compact">
        <button type="button" class="btn btn--secondary" @click="togglePlayback">
          <i class="bi" :class="playing ? 'bi-pause-fill' : 'bi-play-fill'" aria-hidden="true"></i>
          {{ playing ? pauseLabel : playLabel }}
        </button>
        <button type="button" class="btn btn--secondary" :disabled="activeIndex === 0" @click="prevStep">
          {{ prevLabel }}
        </button>
        <button type="button" class="btn btn--secondary" :disabled="activeIndex >= steps.length - 1" @click="nextStep">
          {{ nextLabel }}
        </button>
      </div>
    </div>
  </section>
</template>

<script>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { prefersReducedMotion } from '../../composables/usePreviewMotion.js';

const STEP_MS = 3200;

export default {
  name: 'PreviewWorkflowDemo',
  props: {
    kicker: { type: String, required: true },
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    steps: { type: Array, required: true },
    playLabel: { type: String, default: 'Play' },
    pauseLabel: { type: String, default: 'Pause' },
    prevLabel: { type: String, default: 'Previous' },
    nextLabel: { type: String, default: 'Next' },
    replayLabel: { type: String, default: 'Replay' },
    progressLabel: { type: String, default: 'Workflow progress' },
  },
  setup(props) {
    const headingId = 'preview-workflow-title';
    const activeIndex = ref(0);
    const playing = ref(false);
    const tiltX = ref(0);
    const tiltY = ref(0);
    const reduced = prefersReducedMotion();
    let timer = null;
    let visibilityObserver = null;

    const activeStep = computed(() => props.steps[activeIndex.value] || props.steps[0]);

    const frameStyle = computed(() => {
      if (reduced) return undefined;
      return {
        transform: `perspective(1100px) rotateX(${tiltX.value}deg) rotateY(${tiltY.value}deg)`,
        transition: 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
      };
    });

    const resetTilt = () => {
      tiltX.value = 0;
      tiltY.value = 0;
    };

    const onPointerMove = (event) => {
      if (reduced) return;
      const el = event.currentTarget;
      const rect = el.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      tiltY.value = Math.max(-3.5, Math.min(3.5, px * 7));
      tiltX.value = Math.max(-2.5, Math.min(2.5, -py * 5));
    };

    const clearTimer = () => {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    const tick = () => {
      if (activeIndex.value >= props.steps.length - 1) {
        stop();
        return;
      }
      activeIndex.value += 1;
    };

    const stop = () => {
      clearTimer();
      playing.value = false;
    };

    const start = () => {
      if (prefersReducedMotion()) {
        playing.value = false;
        return;
      }
      clearTimer();
      playing.value = true;
      timer = window.setInterval(tick, STEP_MS);
    };

    const togglePlayback = () => {
      if (playing.value) stop();
      else start();
    };

    const goToStep = (idx) => {
      activeIndex.value = Math.max(0, Math.min(idx, props.steps.length - 1));
      if (playing.value) {
        clearTimer();
        timer = window.setInterval(tick, STEP_MS);
      }
    };

    const prevStep = () => goToStep(activeIndex.value - 1);
    const nextStep = () => goToStep(activeIndex.value + 1);

    watch(() => props.steps.length, () => {
      if (activeIndex.value >= props.steps.length) {
        activeIndex.value = 0;
      }
    });

    onMounted(() => {
      if (typeof window !== 'undefined' && 'IntersectionObserver' in window && !prefersReducedMotion()) {
        const section = document.querySelector('.preview-workflow');
        if (section) {
          visibilityObserver = new IntersectionObserver(([entry]) => {
            if (!entry?.isIntersecting) stop();
          }, { threshold: 0.08 });
          visibilityObserver.observe(section);
        }
      }
    });

    onUnmounted(() => {
      clearTimer();
      visibilityObserver?.disconnect();
    });

    return {
      headingId,
      activeIndex,
      activeStep,
      frameStyle,
      playing,
      togglePlayback,
      goToStep,
      prevStep,
      nextStep,
      onPointerMove,
      resetTilt,
    };
  },
};
</script>