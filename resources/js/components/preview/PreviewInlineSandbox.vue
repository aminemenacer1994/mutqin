<template>
  <section
    id="sandbox"
    class="preview-inline-sandbox wrap"
    :aria-labelledby="titleId"
    data-reveal
  >
    <header class="section-head">
      <p class="section-kicker">{{ kicker }}</p>
      <h2 :id="titleId" class="section-title">{{ title }}</h2>
      <p class="section-sub">{{ subtitle }}</p>
    </header>

    <p v-if="errorMessage" class="preview-inline-sandbox__error" role="alert">{{ errorMessage }}</p>
    <p v-else-if="seedHint" class="preview-inline-sandbox__hint">{{ seedHint }}</p>

    <div class="preview-inline-sandbox__chrome">
      <div class="preview-inline-sandbox__toolbar" role="toolbar" :aria-label="toolbarLabel">
        <button
          v-for="item in experiences"
          :key="item.id"
          type="button"
          class="preview-inline-sandbox__exp"
          :class="{ 'is-active': item.id === selectedExperience }"
          :disabled="!item.ready || loading"
          @click="selectExperience(item.id)"
        >
          {{ item.label }}
        </button>
        <button
          type="button"
          class="btn btn--primary preview-inline-sandbox__launch"
          :disabled="!canLaunch || loading"
          @click="launch"
        >
          {{ loading ? launchingLabel : launchLabel }}
        </button>
      </div>

      <form
        ref="enterForm"
        method="POST"
        :action="enterUrl"
        target="mutqinPreviewSandboxFrame"
        class="visually-hidden"
      >
        <input type="hidden" name="_token" :value="csrfToken">
        <input type="hidden" name="experience" :value="selectedExperience">
        <input type="hidden" name="embed" value="1">
      </form>

      <div class="preview-inline-sandbox__viewport">
        <iframe
          v-show="launched"
          name="mutqinPreviewSandboxFrame"
          class="preview-inline-sandbox__frame"
          :title="frameTitle"
          referrerpolicy="same-origin"
        ></iframe>
        <p v-if="!launched" class="preview-inline-sandbox__placeholder">{{ placeholderLabel }}</p>
      </div>
    </div>
  </section>
</template>

<script>
import { computed, onMounted, ref } from 'vue';

const DEFAULT_EXPERIENCES = [
  { id: 'teacher', label: 'Teacher', ready: true },
  { id: 'student', label: 'Student', ready: true },
  { id: 'parent', label: 'Parent', ready: true },
];

export default {
  name: 'PreviewInlineSandbox',
  props: {
    kicker: { type: String, required: true },
    title: { type: String, required: true },
    subtitle: { type: String, required: true },
    enterUrl: { type: String, default: '/preview/demo/enter' },
    statusUrl: { type: String, default: '/preview/demo/status' },
    launchLabel: { type: String, default: 'Open workspace' },
    launchingLabel: { type: String, default: 'Opening…' },
    toolbarLabel: { type: String, default: 'Demo experience' },
    frameTitle: { type: String, default: 'Mutqin demo workspace' },
    placeholderLabel: { type: String, default: 'Choose an experience and open the workspace here.' },
    seedHint: {
      type: String,
      default: 'If launch fails, run: php artisan mutqin:seed-organisation-network',
    },
    autoLaunchTeacher: { type: Boolean, default: true },
  },
  setup(props) {
    const titleId = 'preview-inline-sandbox-title';
    const csrfToken = ref(document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '');
    const selectedExperience = ref('teacher');
    const experiences = ref([...DEFAULT_EXPERIENCES]);
    const loading = ref(false);
    const launched = ref(false);
    const errorMessage = ref('');
    const enterForm = ref(null);

    const canLaunch = computed(() => {
      const row = experiences.value.find((item) => item.id === selectedExperience.value);
      return row ? row.ready : selectedExperience.value === 'personal';
    });

    const selectExperience = (id) => {
      selectedExperience.value = id;
    };

    const loadStatus = async () => {
      try {
        const response = await window.axios.get(props.statusUrl);
        const rows = Array.isArray(response.data?.experiences) ? response.data.experiences : [];
        if (rows.length) {
          experiences.value = rows.map((row) => ({
            id: row.experience,
            label: row.experience.charAt(0).toUpperCase() + row.experience.slice(1),
            ready: !!row.ready,
          }));
        }
      } catch {
        /* keep defaults */
      }
    };

    const launch = () => {
      if (!canLaunch.value || !enterForm.value) return;
      loading.value = true;
      errorMessage.value = '';
      launched.value = true;
      enterForm.value.submit();
      window.setTimeout(() => {
        loading.value = false;
      }, 1200);
    };

    onMounted(async () => {
      await loadStatus();
      if (props.autoLaunchTeacher && canLaunch.value) {
        launch();
      }
    });

    return {
      titleId,
      csrfToken,
      selectedExperience,
      experiences,
      loading,
      launched,
      errorMessage,
      enterForm,
      canLaunch,
      selectExperience,
      launch,
    };
  },
};
</script>