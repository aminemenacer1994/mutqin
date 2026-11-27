<template>
  <div
    class="preview-product-stage"
    :class="{
      'preview-product-stage--depth': enableDepth,
      'preview-product-stage--flat': !enableDepth,
    }"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
    @pointerdown="onPointerDown"
    @pointerenter="resumeAutoplay"
  >
    <p v-if="showCaption && activeRole.caption" class="preview-product-stage__caption">
      {{ activeRole.caption }}
    </p>

    <div
      v-if="showTabs && tabRoles.length > 1"
      class="preview-product-stage__tabs"
      role="tablist"
      :aria-label="tabsLabel"
    >
      <button
        v-for="role in tabRoles"
        :key="role.id"
        type="button"
        class="preview-product-stage__tab"
        :class="{ 'is-active': role.id === activeId }"
        role="tab"
        :aria-selected="role.id === activeId ? 'true' : 'false'"
        @click="selectRole(role.id)"
      >
        {{ role.label }}
      </button>
    </div>

    <figure
      class="preview-browser preview-product-stage__frame"
      :style="frameStyle"
    >
      <Transition name="preview-shot" mode="out-in">
        <img
          :key="activeId"
          class="preview-browser__shot"
          :src="activeRole.src"
          :alt="activeRole.alt"
          width="1440"
          height="900"
          :loading="eager ? 'eager' : 'lazy'"
          decoding="async"
        >
      </Transition>
    </figure>
  </div>
</template>

<script>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { prefersReducedMotion } from '../../composables/usePreviewMotion.js';

export default {
  name: 'PreviewProductStage',
  props: {
    roles: { type: Array, required: true },
    tabsLabel: { type: String, default: 'Product views' },
    initialRole: { type: String, default: '' },
    showTabs: { type: Boolean, default: true },
    showCaption: { type: Boolean, default: false },
    enableDepth: { type: Boolean, default: true },
    eager: { type: Boolean, default: false },
    autoplayMs: { type: Number, default: 0 },
  },
  setup(props) {
    const tiltX = ref(0);
    const tiltY = ref(0);
    const lift = ref(0);
    const reduced = prefersReducedMotion();

    const tabRoles = computed(() => props.roles.filter((role) => role.label));

    const activeId = ref(
      props.roles.some((role) => role.id === props.initialRole)
        ? props.initialRole
        : (props.roles[0]?.id || 'view'),
    );

    const activeRole = computed(() => (
      props.roles.find((role) => role.id === activeId.value) || props.roles[0] || {
        id: 'view',
        label: '',
        caption: '',
        src: '',
        alt: '',
      }
    ));

    const roleOrder = computed(() => props.roles.map((role) => role.id));

    const selectRole = (id) => {
      if (props.roles.some((role) => role.id === id)) {
        activeId.value = id;
      }
    };

    let autoplayTimer = null;
    let paused = false;

    const clearAutoplay = () => {
      if (autoplayTimer) {
        window.clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    };

    const startAutoplay = () => {
      clearAutoplay();
      if (reduced || props.autoplayMs <= 0 || props.roles.length < 2) return;
      autoplayTimer = window.setInterval(() => {
        if (paused) return;
        const order = roleOrder.value;
        const idx = order.indexOf(activeId.value);
        const next = order[(idx + 1) % order.length];
        if (next) activeId.value = next;
      }, props.autoplayMs);
    };

    const pauseAutoplay = () => {
      paused = true;
    };

    const resumeAutoplay = () => {
      paused = false;
    };

    let resetTimer = null;

    const resetTilt = () => {
      tiltX.value = 0;
      tiltY.value = 0;
      lift.value = 0;
    };

    const onPointerLeave = () => {
      resetTilt();
      resumeAutoplay();
    };

    const onPointerMove = (event) => {
      pauseAutoplay();
      if (!props.enableDepth || reduced) return;
      const el = event.currentTarget;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      tiltY.value = Math.max(-4, Math.min(4, px * 8));
      tiltX.value = Math.max(-3, Math.min(3, -py * 6));
      lift.value = 1;
    };

    const onPointerDown = () => {
      if (!props.enableDepth || reduced) return;
      lift.value = 0;
    };

    const frameStyle = computed(() => {
      if (!props.enableDepth || reduced) {
        return undefined;
      }
      return {
        transform: `perspective(1200px) rotateX(${tiltX.value}deg) rotateY(${tiltY.value}deg) translateZ(${lift.value ? '6px' : '0px'})`,
      };
    });

    onMounted(() => {
      startAutoplay();
    });

    watch(() => [props.autoplayMs, props.roles.length], () => {
      startAutoplay();
    });

    onUnmounted(() => {
      if (resetTimer) window.clearTimeout(resetTimer);
      clearAutoplay();
    });

    return {
      tabRoles,
      activeId,
      activeRole,
      selectRole,
      frameStyle,
      onPointerMove,
      onPointerLeave,
      resetTilt,
      onPointerDown,
      pauseAutoplay,
      resumeAutoplay,
    };
  },
};
</script>