<template>
  <section
    class="preview-workflow"
    :aria-labelledby="headingId"
    data-reveal
  >
    <div class="wrap preview-workflow__layout">
      <div class="preview-workflow__copy">
        <header class="section-head section-head--align-start">
          <p class="section-kicker">{{ kicker }}</p>
          <h2 :id="headingId" class="section-title">{{ title }}</h2>
          <p class="section-sub">{{ subtitle }}</p>
        </header>

        <ol class="preview-workflow__steps" role="list">
          <li v-for="(step, idx) in steps" :key="step.id">
            <button
              type="button"
              class="preview-workflow__step"
              :class="{ 'is-active': idx === activeIndex }"
              :aria-current="idx === activeIndex ? 'step' : undefined"
              @click="goToStep(idx)"
            >
              <span class="preview-workflow__step-index" aria-hidden="true">{{ String(idx + 1).padStart(2, '0') }}</span>
              <div class="preview-workflow__step-body">
                <span class="preview-workflow__platform">{{ step.platform }}</span>
                <h3>{{ step.title }}</h3>
                <p>{{ step.body }}</p>
              </div>
            </button>
          </li>
        </ol>

        <div class="preview-workflow__controls">
          <button type="button" class="btn btn--secondary" :aria-pressed="playing ? 'true' : 'false'" @click="togglePlayback">
            <i class="bi" :class="playing ? 'bi-pause-fill' : 'bi-play-fill'" aria-hidden="true"></i>
            {{ playing ? pauseLabel : playLabel }}
          </button>
          <button type="button" class="btn btn--secondary" :disabled="activeIndex === 0" @click="prevStep">
            {{ prevLabel }}
          </button>
          <button type="button" class="btn btn--secondary" :disabled="activeIndex >= steps.length - 1" @click="nextStep">
            {{ nextLabel }}
          </button>
          <button type="button" class="btn btn--secondary" @click="replay">
            {{ replayLabel }}
          </button>
          <span class="preview-workflow__progress" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" :aria-valuemax="100" :aria-label="progressLabel">
            <span class="preview-workflow__progress-bar" :style="{ width: `${progress}%` }"></span>
          </span>
        </div>
      </div>

      <figure class="preview-browser preview-workflow__visual" :aria-live="playing ? 'polite' : 'off'">
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
    </div>
  </section>
</template>

<script>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { prefersReducedMotion } from '../../composables/usePreviewMotion.js';

const STEP_MS = 4200;

export default {
  name: 'PreviewWorkflowDemo',
  props: {
    kicker: { type: String, required: true },
    title: { type: String, required: true },
    subtitle: { type: String, required: true },
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
    let timer = null;
    let visibilityObserver = null;

    const activeStep = computed(() => props.steps[activeIndex.value] || props.steps[0]);
    const progress = computed(() => {
      const total = props.steps.length || 1;
      return ((activeIndex.value + 1) / total) * 100;
    });

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

    const replay = () => {
      activeIndex.value = 0;
      start();
    };

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
      progress,
      playing,
      togglePlayback,
      goToStep,
      prevStep,
      nextStep,
      replay,
    };
  },
};
</script>