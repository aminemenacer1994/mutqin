<template>
  <header v-if="juzLabel || surahLabel" class="madani-mushaf-page-header" dir="rtl">
    <span class="madani-mushaf-page-header__juz">{{ juzLabel }}</span>
    <span class="madani-mushaf-page-header__surah">{{ surahLabel }}</span>
  </header>
</template>

<script>
export default {
  name: 'MushafPageHeader',
  props: {
    juzLabel: { type: String, default: '' },
    surahLabel: { type: String, default: '' },
  },
}
</script>
