import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { prefersReducedMotion } from './usePreviewMotion.js';
import {
  readWalkthroughState,
  resetWalkthroughState,
  stepsForWalkthrough,
  writeWalkthroughState,
} from './sandboxWalkthroughSteps.js';

function queryTarget(selector) {
  if (!selector) return null;
  const parts = selector.split(',').map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    const el = document.querySelector(part);
    if (el) return el;
  }
  return null;
}

function measureTarget(el, pad = 8) {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    top: Math.max(0, rect.top - pad),
    left: Math.max(0, rect.left - pad),
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };
}

export function useSandboxWalkthrough({ t, config, emitComplete }) {
  const active = ref(false);
  const paused = ref(false);
  const stepIndex = ref(0);
  const walkthroughId = ref('');
  const targetRect = ref(null);
  const targetEl = ref(null);
  const missingTarget = ref(false);

  const steps = computed(() => stepsForWalkthrough(walkthroughId.value));
  const currentStep = computed(() => steps.value[stepIndex.value] || null);
  const totalSteps = computed(() => steps.value.length);
  const progress = computed(() => {
    if (!totalSteps.value) return 0;
    return Math.min(1, (stepIndex.value + 1) / totalSteps.value);
  });

  let resizeObserver = null;
  let clickListener = null;
  let changeListener = null;
  let scrollListener = null;
  let repositionFrame = 0;

  function syncFromStorage() {
    const state = readWalkthroughState();
    stepIndex.value = state.step;
    paused.value = state.paused;
    if (state.id) walkthroughId.value = state.id;
  }

  function persist() {
    writeWalkthroughState({
      id: walkthroughId.value,
      step: stepIndex.value,
      paused: paused.value,
    });
  }

  function detachListeners() {
    if (clickListener && targetEl.value) {
      targetEl.value.removeEventListener('click', clickListener, true);
    }
    if (changeListener) {
      const select = document.querySelector('[data-sandbox-tour="sandbox-role-switch"]');
      select?.removeEventListener('change', changeListener);
    }
    clickListener = null;
    changeListener = null;
    if (scrollListener) {
      window.removeEventListener('scroll', scrollListener, true);
      window.removeEventListener('resize', scrollListener);
    }
    scrollListener = null;
    resizeObserver?.disconnect();
    resizeObserver = null;
  }

  function reposition() {
    cancelAnimationFrame(repositionFrame);
    repositionFrame = requestAnimationFrame(() => {
      const step = currentStep.value;
      if (!step) {
        targetRect.value = null;
        return;
      }
      if (step.requiredPersona && config.value?.activePersona !== step.requiredPersona) {
        const switchEl = document.querySelector('[data-sandbox-tour="sandbox-role-switch"]');
        targetEl.value = switchEl;
        missingTarget.value = !switchEl;
      } else {
        const el = queryTarget(step.selector);
        targetEl.value = el;
        missingTarget.value = !el && !step.optional;
      }
      targetRect.value = measureTarget(targetEl.value, step.pad ?? 8);
      if (targetEl.value) {
        try {
          targetEl.value.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        } catch {
          /* ignore */
        }
        targetEl.value.classList.add('sandbox-tour-target');
      }
    });
  }

  function advanceStep() {
    const step = currentStep.value;
    if (step?.complete) {
      document.documentElement.classList.add('sandbox-tour-complete');
      window.dispatchEvent(new CustomEvent('mutqin-sandbox-tour-complete', {
        detail: { walkthroughId: walkthroughId.value },
      }));
      emitComplete?.();
    }
    if (stepIndex.value >= steps.value.length - 1) {
      active.value = false;
      detachListeners();
      document.documentElement.classList.remove('sandbox-tour-active');
      return;
    }
    stepIndex.value += 1;
    persist();
    bindStep();
  }

  function retreatStep() {
    if (stepIndex.value <= 0) return;
    stepIndex.value -= 1;
    persist();
    bindStep();
  }

  function bindStep() {
    detachListeners();
    document.querySelectorAll('.sandbox-tour-target').forEach((el) => el.classList.remove('sandbox-tour-target'));
    const step = currentStep.value;
    if (!step) {
      active.value = false;
      return;
    }
    reposition();

    scrollListener = () => reposition();
    window.addEventListener('scroll', scrollListener, true);
    window.addEventListener('resize', scrollListener);

    if (targetEl.value && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => reposition());
      resizeObserver.observe(targetEl.value);
    }

    if (paused.value || step.advance === 'manual') {
      return;
    }

    if (step.advance === 'click' && targetEl.value) {
      clickListener = (event) => {
        if (!targetEl.value?.contains(event.target)) return;
        window.setTimeout(() => advanceStep(), prefersReducedMotion() ? 80 : 320);
      };
      targetEl.value.addEventListener('click', clickListener, true);
    }

    if (step.advance === 'select') {
      const select = document.querySelector('[data-sandbox-tour="sandbox-role-switch"]');
      if (!select) return;
      changeListener = () => {
        const value = select.value;
        if (step.selectValue && value !== step.selectValue) return;
        window.setTimeout(() => advanceStep(), prefersReducedMotion() ? 120 : 480);
      };
      select.addEventListener('change', changeListener);
    }
  }

  function start(id) {
    if (!id || !stepsForWalkthrough(id).length) return;
    walkthroughId.value = id;
    resetWalkthroughState(id);
    stepIndex.value = 0;
    paused.value = false;
    active.value = true;
    document.documentElement.classList.add('sandbox-tour-active');
    document.documentElement.classList.remove('sandbox-tour-complete');
    bindStep();
    persist();
  }

  function resume(id, guided) {
    if (!guided || !id) {
      active.value = false;
      detachListeners();
      document.documentElement.classList.remove('sandbox-tour-active');
      return;
    }
    walkthroughId.value = id;
    syncFromStorage();
    if (!stepsForWalkthrough(id).length) return;
    active.value = true;
    document.documentElement.classList.add('sandbox-tour-active');
    bindStep();
  }

  function skip() {
    active.value = false;
    detachListeners();
    document.documentElement.classList.remove('sandbox-tour-active');
    writeWalkthroughState({ id: '', step: 0, paused: false });
  }

  function togglePause() {
    paused.value = !paused.value;
    persist();
    bindStep();
  }

  function restart() {
    if (!walkthroughId.value) return;
    resetWalkthroughState(walkthroughId.value);
    stepIndex.value = 0;
    paused.value = false;
    bindStep();
  }

  watch(() => config.value?.activePersona, () => {
    if (!active.value) return;
    reposition();
  });

  onMounted(() => {
    const guided = Boolean(config.value?.guided);
    const id = config.value?.walkthroughId || '';
    if (config.value?.walkthroughReset && id) {
      resetWalkthroughState(id);
    }
    if (guided && id) {
      resume(id, true);
    }
  });

  onUnmounted(() => {
    detachListeners();
    document.querySelectorAll('.sandbox-tour-target').forEach((el) => el.classList.remove('sandbox-tour-target'));
    document.documentElement.classList.remove('sandbox-tour-active');
    cancelAnimationFrame(repositionFrame);
  });

  return {
    active,
    paused,
    stepIndex,
    walkthroughId,
    targetRect,
    missingTarget,
    currentStep,
    totalSteps,
    progress,
    advanceStep,
    retreatStep,
    skip,
    togglePause,
    restart,
    start,
    reposition,
  };
}