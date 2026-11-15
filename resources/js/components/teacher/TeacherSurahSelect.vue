<template>
  <div class="teacher-surah-select" @focusout="onFocusOut">
    <input
      :id="inputId"
      ref="input"
      :value="query"
      type="search"
      class="form-control"
      role="combobox"
      :aria-label="t('teacher.surah')"
      aria-autocomplete="list"
      :aria-controls="`${inputId}-options`"
      :aria-expanded="expanded ? 'true' : 'false'"
      :aria-activedescendant="expanded && filtered[active] ? `${inputId}-option-${active}` : undefined"
      :disabled="disabled"
      autocomplete="off"
      required
      @input="onInput"
      @click="expanded = true"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.enter.prevent="choose(filtered[active])"
      @keydown.esc="onEscape"
    >
    <ul v-if="expanded" :id="`${inputId}-options`" class="teacher-surah-select__options" role="listbox">
      <li v-for="(surah, index) in filtered" :id="`${inputId}-option-${index}`" :key="surah.number" role="option" :aria-selected="index === active" :class="{ 'is-highlighted': index === active }" @mousedown.prevent="choose(surah)">{{ surah.number }}. {{ surah.name }}</li>
      <li v-if="!filtered.length" class="teacher-surah-select__empty">{{ t('teacher.no_surah_results') }}</li>
    </ul>
  </div>
</template>
<script>
import { i18nMixin } from '../../mixins/i18nMixin'
let selectUid = 0
export default {
  name: 'TeacherSurahSelect',
  mixins: [i18nMixin],
  props: { modelValue: { type: [String, Number], default: '' }, surahs: { type: Array, default: () => [] }, disabled: Boolean },
  emits: ['update:modelValue'],
  data() { return { inputId: `teacher-surah-${++selectUid}`, query: '', expanded: false, active: 0 } },
  computed: {
    filtered() {
      const current = this.surahs.find(s => String(s.number) === String(this.modelValue))
      const needle = this.query === this.label(current) ? '' : this.query.toLocaleLowerCase().trim()
      return this.surahs.filter(s => `${s.number} ${s.name}`.toLocaleLowerCase().includes(needle))
    },
  },
  watch: { modelValue: { immediate: true, handler() { this.sync() } }, surahs() { this.sync() } },
  methods: {
    label(surah) { return surah ? `${surah.number}. ${surah.name}` : '' },
    sync() { this.query = this.label(this.surahs.find(s => String(s.number) === String(this.modelValue))) },
    onInput(event) { this.query = event.target.value; this.expanded = true; this.active = 0 },
    onEscape(event) { if (this.expanded) { event.stopPropagation(); event.preventDefault(); this.expanded = false; this.sync() } },
    move(step) { this.expanded = true; const count = this.filtered.length; if (count) this.active = (this.active + step + count) % count; this.$nextTick(() => document.getElementById(`${this.inputId}-option-${this.active}`)?.scrollIntoView({ block: 'nearest' })) },
    choose(surah) { if (!surah) return; this.$emit('update:modelValue', Number(surah.number)); this.query = this.label(surah); this.expanded = false },
    onFocusOut(event) { if (!event.currentTarget.contains(event.relatedTarget)) { this.expanded = false; this.sync() } },
  },
}
</script>
