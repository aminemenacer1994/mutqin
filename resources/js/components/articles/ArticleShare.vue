<template>
  <div class="article-share" role="group" :aria-label="t('articleDetail.shareLabel')">
    <a
      class="article-share__btn"
      :href="whatsappHref"
      target="_blank"
      rel="noopener noreferrer"
    >
      <i class="bi bi-whatsapp" aria-hidden="true"></i>
      {{ t('articleDetail.shareWhatsapp') }}
    </a>
    <button type="button" class="article-share__btn" @click="onNativeShare">
      <i class="bi" :class="nativeIcon" aria-hidden="true"></i>
      {{ nativeLabel }}
    </button>
    <button type="button" class="article-share__btn" @click="onCopy">
      <i class="bi bi-link-45deg" aria-hidden="true"></i>
      {{ copyLabel }}
    </button>
  </div>
</template>

<script>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  articleAbsoluteUrl,
  canUseNativeShare,
  copyToClipboard,
  shareOrCopy,
  whatsappShareHref,
} from '../../scripts/articles/articleShare.js'

export default {
  name: 'ArticleShare',
  props: {
    title: { type: String, required: true },
    slug: { type: String, required: true },
  },
  setup(props) {
    const { t } = useI18n()
    const copied = ref(false)
    const shared = ref(false)
    const pageUrl = computed(() => {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      return articleAbsoluteUrl(props.slug, origin)
    })
    const whatsappHref = computed(() => whatsappShareHref(props.title, pageUrl.value))
    const nativeLabel = computed(() => (
      shared.value ? t('articleDetail.shared') : t('articleDetail.shareNative')
    ))
    const copyLabel = computed(() => (
      copied.value ? t('articleDetail.copied') : t('articleDetail.copyLink')
    ))
    const nativeIcon = computed(() => (
      canUseNativeShare() ? 'bi-share' : 'bi-clipboard'
    ))

    async function onNativeShare() {
      const result = await shareOrCopy({
        title: props.title,
        text: props.title,
        url: pageUrl.value,
        clipboardText: pageUrl.value,
      })
      if (result === 'shared') {
        shared.value = true
        window.setTimeout(() => { shared.value = false }, 2000)
      }
      if (result === 'copied') {
        copied.value = true
        window.setTimeout(() => { copied.value = false }, 2000)
      }
    }

    async function onCopy() {
      const result = await copyToClipboard(pageUrl.value)
      if (result === 'copied') {
        copied.value = true
        window.setTimeout(() => { copied.value = false }, 2000)
      }
    }

    return {
      t,
      whatsappHref,
      nativeLabel,
      copyLabel,
      nativeIcon,
      onNativeShare,
      onCopy,
    }
  },
}
</script>
