<template>
  <nav v-if="items.length" class="article-toc" :aria-label="label">
    <details class="article-toc__details">
      <summary class="article-toc__summary">{{ label }}</summary>
      <ol class="article-toc__list">
        <li v-for="item in items" :key="item.id">
          <a :href="`#${item.id}`" @click="onNavigate">{{ item.label }}</a>
        </li>
      </ol>
    </details>
  </nav>
</template>

<script>
export default {
  name: 'ArticleToc',
  props: {
    items: { type: Array, default: () => [] },
    label: { type: String, default: 'On this page' },
  },
  methods: {
    onNavigate(event) {
      const href = event?.currentTarget?.getAttribute?.('href') || ''
      if (!href.startsWith('#')) return
      const target = document.getElementById(href.slice(1))
      if (!target) return
      event.preventDefault()
      target.setAttribute('tabindex', '-1')
      target.focus({ preventScroll: true })
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
  },
}
</script>
