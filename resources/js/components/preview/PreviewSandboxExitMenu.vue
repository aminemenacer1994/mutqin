<template>
  <dialog ref="dialogEl" class="sandbox-exit" :aria-label="t('previewDemo.exit.dialogLabel')">
    <form method="dialog" class="sandbox-exit__shell">
      <header class="sandbox-exit__head">
        <h2 class="sandbox-exit__title">{{ t('previewDemo.exit.title') }}</h2>
        <p class="sandbox-exit__sub">{{ t('previewDemo.exit.subtitle') }}</p>
      </header>
      <ul class="sandbox-exit__menu">
        <li>
          <button type="button" class="sandbox-exit__choice" @click="close">
            {{ t('previewDemo.exit.continueExploring') }}
          </button>
        </li>
        <li>
          <button type="button" class="sandbox-exit__choice" @click="onRestart">
            {{ t('previewDemo.exit.restartDemo') }}
          </button>
        </li>
        <li>
          <a class="sandbox-exit__choice sandbox-exit__choice--link" :href="config.pricingUrl">
            {{ t('previewDemo.exit.viewPlans') }}
          </a>
        </li>
        <li>
          <a class="sandbox-exit__choice sandbox-exit__choice--link" :href="config.registerUrl">
            {{ t('previewDemo.exit.startRegistration') }}
          </a>
        </li>
        <li>
          <button type="submit" class="sandbox-exit__choice" :form="landingFormId" formmethod="POST">
            {{ t('previewDemo.exit.returnLanding') }}
          </button>
        </li>
        <li>
          <button type="submit" class="sandbox-exit__choice" :form="hubFormId" formmethod="POST">
            {{ t('previewDemo.exit.returnHub') }}
          </button>
        </li>
      </ul>
      <button type="submit" class="sandbox-exit__cancel">
        {{ t('previewDemo.exit.close') }}
      </button>
    </form>
    <form :id="hubFormId" method="POST" :action="config.exitUrl" class="visually-hidden">
      <input type="hidden" name="_token" :value="config.csrfToken">
      <input type="hidden" name="destination" value="hub">
    </form>
    <form :id="landingFormId" method="POST" :action="config.exitUrl" class="visually-hidden">
      <input type="hidden" name="_token" :value="config.csrfToken">
      <input type="hidden" name="destination" value="landing">
    </form>
  </dialog>
</template>

<script>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

let exitFormCounter = 0;

export default {
  name: 'PreviewSandboxExitMenu',
  props: {
    config: {
      type: Object,
      required: true,
    },
  },
  emits: ['restart'],
  setup(props, { emit, expose }) {
    const { t } = useI18n();
    const dialogEl = ref(null);
    exitFormCounter += 1;
    const hubFormId = `preview-sandbox-exit-hub-${exitFormCounter}`;
    const landingFormId = `preview-sandbox-exit-landing-${exitFormCounter}`;

    const open = () => {
      document.documentElement.classList.add('sandbox-exit-open');
      dialogEl.value?.showModal?.();
    };

    const close = () => {
      dialogEl.value?.close?.();
      document.documentElement.classList.remove('sandbox-exit-open');
    };

    const onRestart = () => {
      close();
      emit('restart');
    };

    onMounted(() => {
      dialogEl.value?.addEventListener('cancel', () => {
        document.documentElement.classList.remove('sandbox-exit-open');
      });
    });

    expose({ open, close });

    return {
      t,
      dialogEl,
      hubFormId,
      landingFormId,
      close,
      onRestart,
    };
  },
};
</script>