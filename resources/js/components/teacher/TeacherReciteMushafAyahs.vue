<template>
  <div class="teacher-recite-mushaf" lang="ar" dir="rtl">
    <article v-for="ayah in ayahs" :key="ayah.ayah" class="teacher-recite-mushaf__ayah">
      <span class="teacher-recite-mushaf__ayah-marker" :aria-label="t('teacher.ayah_n', { n: ayah.ayah })">{{ ayah.ayah }}</span>
      <p class="teacher-recite-mushaf__line">
        <span
          v-for="(part, index) in ayah.parts"
          :key="`${ayah.ayah}-${index}`"
          :class="part.className"
          :style="part.fontFamily ? { fontFamily: part.fontFamily } : undefined"
          :title="part.title || undefined"
        >{{ part.text }}</span>
      </p>
    </article>
  </div>
</template>

<script>
import { i18nMixin } from '../../mixins/i18nMixin'

export default {
  name: 'TeacherReciteMushafAyahs',
  mixins: [i18nMixin],
  props: {
    ayahs: { type: Array, default: () => [] },
  },
}
</script>
