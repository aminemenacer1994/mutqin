<template>
  <div class="preview-hero-showcase">
    <p class="visually-hidden" :id="tabsLabelId">{{ tabsLabel }}</p>
    <div
      class="preview-hero-showcase__tabs"
      role="tablist"
      :aria-labelledby="tabsLabelId"
    >
      <button
        v-for="role in roles"
        :key="role.id"
        type="button"
        class="preview-hero-showcase__tab"
        :class="{ 'is-active': role.id === activeId }"
        role="tab"
        :id="`${baseId}-tab-${role.id}`"
        :aria-selected="role.id === activeId ? 'true' : 'false'"
        :aria-controls="`${baseId}-panel`"
        :tabindex="role.id === activeId ? 0 : -1"
        @click="selectRole(role.id)"
        @keydown="onTabKeydown($event, role.id)"
      >
        {{ role.label }}
      </button>
    </div>

    <p
      :id="`${baseId}-caption`"
      class="preview-hero-showcase__caption"
      role="tabpanel"
      :aria-labelledby="`${baseId}-tab-${activeId}`"
    >
      {{ activeRole.caption }}
    </p>

    <figure
      :id="`${baseId}-panel`"
      class="preview-browser preview-browser--hero preview-hero-showcase__frame"
      role="tabpanel"
      :aria-labelledby="`${baseId}-tab-${activeId}`"
    >
      <Transition name="preview-shot" mode="out-in">
        <img
          :key="activeId"
          class="preview-browser__shot"
          :src="activeRole.src"
          :alt="activeRole.alt"
          width="1440"
          height="900"
          loading="eager"
          decoding="async"
        >
      </Transition>
    </figure>
  </div>
</template>

<script>
import { computed, ref } from 'vue';

const DEFAULT_ROLE_ORDER = ['teacher', 'student', 'parent', 'personal'];

export default {
  name: 'PreviewHeroShowcase',
  props: {
    roles: {
      type: Array,
      required: true,
    },
    tabsLabel: {
      type: String,
      default: 'Platform preview',
    },
    initialRole: {
      type: String,
      default: 'teacher',
    },
  },
  setup(props) {
    const baseId = `preview-hero-${Math.random().toString(36).slice(2, 9)}`;
    const tabsLabelId = `${baseId}-label`;
    const roleOrder = computed(() => (
      props.roles.length
        ? props.roles.map((role) => role.id)
        : DEFAULT_ROLE_ORDER
    ));

    const activeId = ref(
      props.roles.some((role) => role.id === props.initialRole)
        ? props.initialRole
        : (props.roles[0]?.id || 'teacher'),
    );

    const rolesById = computed(() => {
      const map = new Map();
      props.roles.forEach((role) => map.set(role.id, role));
      return map;
    });

    const orderedRoleIds = computed(() => (
      roleOrder.value.filter((id) => rolesById.value.has(id))
    ));

    const activeRole = computed(() => (
      rolesById.value.get(activeId.value) || props.roles[0] || {
        id: 'teacher',
        label: '',
        caption: '',
        src: '',
        alt: '',
      }
    ));

    const selectRole = (id) => {
      if (!rolesById.value.has(id)) return;
      activeId.value = id;
    };

    const focusTab = (id) => {
      const el = document.getElementById(`${baseId}-tab-${id}`);
      el?.focus();
    };

    const onTabKeydown = (event, currentId) => {
      const order = orderedRoleIds.value;
      const idx = order.indexOf(currentId);
      if (idx < 0) return;

      let nextId = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        nextId = order[(idx + 1) % order.length];
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        nextId = order[(idx - 1 + order.length) % order.length];
      } else if (event.key === 'Home') {
        event.preventDefault();
        nextId = order[0];
      } else if (event.key === 'End') {
        event.preventDefault();
        nextId = order[order.length - 1];
      }

      if (!nextId || !rolesById.value.has(nextId)) return;
      selectRole(nextId);
      focusTab(nextId);
    };

    return {
      baseId,
      tabsLabelId,
      activeId,
      activeRole,
      selectRole,
      onTabKeydown,
    };
  },
};
</script>