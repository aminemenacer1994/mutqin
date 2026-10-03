<template>
  <Teleport to="body">
    <transition name="post-session-fade">
      <div
        v-if="open"
        class="post-session-simple post-session-simple--calm-v2 mutashabihat-catalog"
        :data-theme="theme"
        data-testid="mutashabihat-catalog"
      >
        <div class="post-session-simple__backdrop" aria-hidden="true"></div>
        <div
          class="post-session-simple__overlay"
          @mousedown.self.prevent
          @click.self.prevent
        >
          <div
            ref="dialog"
            class="post-session-simple__dialog post-session-simple__dialog--lg mutashabihat-catalog__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mutashabihatCatalogTitle"
            tabindex="-1"
            @keydown="onDialogKeydown"
          >
            <header class="post-session-simple__header post-session-simple__header--calm">
              <div class="post-session-simple__header-copy">
                <h2 id="mutashabihatCatalogTitle" class="post-session-simple__title" tabindex="-1">
                  {{ title }}
                </h2>
                <p v-if="subtitle" class="post-session-simple__subtitle">{{ subtitle }}</p>
              </div>
              <button
                type="button"
                class="modal-close-btn post-session-simple__close"
                :aria-label="closeLabel"
                @click="requestClose"
              >
                <i class="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </header>

            <div class="post-session-simple__body mutashabihat-catalog__body">
              <div class="mutashabihat-catalog__filters" role="group" :aria-label="filterGroupLabel">
                <button
                  v-for="item in filters"
                  :key="item.id"
                  type="button"
                  class="mutashabihat-catalog__chip"
                  :class="{ 'is-active': item.id === filter }"
                  :aria-pressed="item.id === filter"
                  @click="$emit('update:filter', item.id)"
                >
                  {{ item.label }}
                </button>
              </div>
              <label class="mutashabihat-catalog__search">
                <span class="visually-hidden">{{ searchPlaceholder }}</span>
                <input
                  type="search"
                  :value="query"
                  :placeholder="searchPlaceholder"
                  @input="$emit('update:query', $event.target.value)"
                >
              </label>
              <p v-if="!rows.length" class="mutashabihat-catalog__empty">{{ emptyLabel }}</p>
              <ul v-else class="mutashabihat-catalog__list">
                <li v-for="row in rows" :key="row.key">
                  <MutashabihatPairCard
                    :row="row"
                    :quran-font-family="quranFontFamily"
                    :compare-label="compareLabel"
                    :loading-label="loadingLabel"
                    :open-left-label="openAyahNamed(row.leftLabel)"
                    :open-right-label="openAyahNamed(row.rightLabel)"
                    @compare="$emit('compare', row)"
                    @open-ayah="$emit('open-ayah', $event)"
                  />
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script>
import {
  captureReturnFocus,
  focusInitialElement,
  handleModalKeydown,
  restoreReturnFocus,
} from '../utils/modalFocus'
import MutashabihatPairCard from './MutashabihatPairCard.vue'

export default {
  name: 'MutashabihatCatalogModal',
  components: { MutashabihatPairCard },
  props: {
    open: { type: Boolean, default: false },
    theme: { type: String, default: 'light' },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    closeLabel: { type: String, default: 'Close' },
    filter: { type: String, default: 'all' },
    query: { type: String, default: '' },
    filters: { type: Array, default: () => [] },
    rows: { type: Array, default: () => [] },
    emptyLabel: { type: String, default: '' },
    searchPlaceholder: { type: String, default: '' },
    filterGroupLabel: { type: String, default: '' },
    quranFontFamily: { type: String, default: '' },
    compareLabel: { type: String, default: '' },
    loadingLabel: { type: String, default: '' },
    openAyahLabel: { type: String, default: 'Open {label}' },
  },
  emits: ['close', 'compare', 'open-ayah', 'update:filter', 'update:query'],
  data() {
    return { _returnFocusEl: null }
  },
  watch: {
    open: {
      immediate: true,
      handler(value) {
        if (value) {
          this._returnFocusEl = captureReturnFocus()
          this.$nextTick(() => focusInitialElement(this.$refs.dialog, '#mutashabihatCatalogTitle'))
          return
        }
        restoreReturnFocus(this._returnFocusEl)
        this._returnFocusEl = null
      },
    },
  },
  beforeUnmount() {
    restoreReturnFocus(this._returnFocusEl)
    this._returnFocusEl = null
  },
  methods: {
    openAyahNamed(label) {
      return String(this.openAyahLabel || 'Open {label}').replace('{label}', label)
    },
    onDialogKeydown(event) {
      handleModalKeydown(event, {
        container: this.$refs.dialog,
        open: this.open,
        onEscape: this.requestClose,
      })
    },
    requestClose() {
      this.$emit('close')
    },
  },
}
</script>

<style src="./MutashabihatCatalogModal.css"></style>
