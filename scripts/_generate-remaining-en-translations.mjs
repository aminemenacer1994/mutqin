/**
 * Generate .i18n-remaining-en-translations.json for still-English unique strings.
 * Run: node scripts/_generate-remaining-en-translations.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { translateText } from './_translation-engine.mjs'
import { wordFallback } from './_word-fallback.mjs'

const UNION_PATH = path.resolve('scripts/.i18n-still-en-union.txt')
const OUT = path.resolve('scripts/.i18n-remaining-en-translations.json')
const LOCALES = ['ar', 'es', 'id', 'tr']

/** Hand-crafted translations for high-frequency remaining strings. */
const HAND = {
  'Tajweed': { ar: 'Tajweed', es: 'Tajweed', id: 'Tajweed', tr: 'Tajweed' },
  Enter: { ar: 'Enter', es: 'Enter', id: 'Enter', tr: 'Enter' },
  'Ctrl/Cmd + S': { ar: 'Ctrl/Cmd + S', es: 'Ctrl/Cmd + S', id: 'Ctrl/Cmd + S', tr: 'Ctrl/Cmd + S' },
  '{current} / {total}': { ar: '{current} / {total}', es: '{current} / {total}', id: '{current} / {total}', tr: '{current} / {total}' },
  Alhamdulillah: { ar: 'Alhamdulillah', es: 'Alhamdulillah', id: 'Alhamdulillah', tr: 'Alhamdulillah' },
  '{start}–{end}': { ar: '{start}–{end}', es: '{start}–{end}', id: '{start}–{end}', tr: '{start}–{end}' },
  '{when}': { ar: '{when}', es: '{when}', id: '{when}', tr: '{when}' },
  '{detail}': { ar: '{detail}', es: '{detail}', id: '{detail}', tr: '{detail}' },
  '{time}': { ar: '{time}', es: '{time}', id: '{time}', tr: '{time}' },
  Next: { ar: 'التالي', es: 'Siguiente', id: 'Berikutnya', tr: 'Sonraki' },
  Notes: { ar: 'ملاحظات', es: 'Notas', id: 'Catatan', tr: 'Notlar' },
  'AI checks': { ar: 'فحوصات الذكاء الاصطناعي', es: 'Comprobaciones IA', id: 'Pemeriksaan AI', tr: 'AI kontrolleri' },
  'Just now': { ar: 'الآن', es: 'Justo ahora', id: 'Baru saja', tr: 'Az önce' },
  Yesterday: { ar: 'أمس', es: 'Ayer', id: 'Kemarin', tr: 'Dün' },
  Counts: { ar: 'الأعداد', es: 'Recuentos', id: 'Jumlah', tr: 'Sayılar' },
  'Updating…': { ar: 'جارٍ التحديث…', es: 'Actualizando…', id: 'Memperbarui…', tr: 'Güncelleniyor…' },
  "{n}m ago": { ar: 'منذ {n} د', es: 'hace {n} min', id: '{n} mnt lalu', tr: '{n} dk önce' },
  "{n}h ago": { ar: 'منذ {n} س', es: 'hace {n} h', id: '{n} jam lalu', tr: '{n} sa önce' },
  "{n}d ago": { ar: 'منذ {n} ي', es: 'hace {n} d', id: '{n} hr lalu', tr: '{n} gün önce' },
  "Couldn't load your path.": { ar: 'تعذّر تحميل مسارك.', es: 'No se pudo cargar tu ruta.', id: 'Tidak dapat memuat jalur Anda.', tr: 'Yolunuz yüklenemedi.' },
  "Couldn't load this list.": { ar: 'تعذّر تحميل هذه القائمة.', es: 'No se pudo cargar esta lista.', id: 'Tidak dapat memuat daftar ini.', tr: 'Bu liste yüklenemedi.' },
  'Nothing in this list.': { ar: 'لا شيء في هذه القائمة.', es: 'Nada en esta lista.', id: 'Tidak ada di daftar ini.', tr: 'Bu listede bir şey yok.' },
  "Reflections you've written": { ar: 'تأملات كتبتها', es: 'Reflexiones que escribiste', id: 'Refleksi yang Anda tulis', tr: 'Yazdığınız yansımalar' },
  'Recordings library': { ar: 'مكتبة التسجيلات', es: 'Biblioteca de grabaciones', id: 'Perpustakaan rekaman', tr: 'Kayıt kütüphanesi' },
  '{count}x repeats': { ar: '{count}× تكرار', es: '{count}× repeticiones', id: '{count}× ulangan', tr: '{count}× tekrar' },
  'Hear it first, then recite it back': { ar: 'استمع أولًا، ثم أَتِّ', es: 'Escúchala primero, luego recítala', id: 'Dengar dulu, lalu tilawah kembali', tr: 'Önce dinle, sonra oku' },
  'Words fade away as your recall improves': { ar: 'تتلاشى الكلمات مع تحسّن استذكارك', es: 'Las palabras se desvanecen a medida que mejora tu memoria', id: 'Kata-kata memudar seiring memori membaik', tr: 'Hatırladıkça kelimeler solar' },
  'Key words stay visible as recall hooks': { ar: 'تبقى الكلمات المفتاحية ظاهرة كمرتكزات للاستذكار', es: 'Las palabras clave permanecen visibles como anclas', id: 'Kata kunci tetap terlihat sebagai jangkar', tr: 'Anahtar kelimeler hatırlatıcı olarak görünür kalır' },
  'This will permanently remove "{label}" and its export snapshot from this device.': {
    ar: 'سيُحذف "{label}" ولقطة التصدير نهائيًا من هذا الجهاز.',
    es: 'Esto eliminará permanentemente "{label}" y su instantánea de exportación de este dispositivo.',
    id: 'Ini akan menghapus "{label}" dan snapshot ekspor secara permanen dari perangkat ini.',
    tr: 'Bu, "{label}" ve dışa aktarma anlık görüntüsünü bu cihazdan kalıcı olarak kaldırır.',
  },
  'This will permanently remove {count} saved sessions from this device.': {
    ar: 'سيُحذف {count} جلسات محفوظة نهائيًا من هذا الجهاز.',
    es: 'Esto eliminará permanentemente {count} sesiones guardadas de este dispositivo.',
    id: 'Ini akan menghapus {count} sesi tersimpan secara permanen dari perangkat ini.',
    tr: 'Bu, {count} kayıtlı oturumu bu cihazdan kalıcı olarak kaldırır.',
  },
  'This removes the current continue-where-you-left-off snapshot from this device.': {
    ar: 'يزيل هذا لقطة «تابع من حيث توقفت» الحالية من هذا الجهاز.',
    es: 'Esto elimina la instantánea actual de continuar donde lo dejaste de este dispositivo.',
    id: 'Ini menghapus snapshot lanjutkan-dari-posisi-terakhir saat ini dari perangkat ini.',
    tr: 'Bu, kaldığınız yerden devam anlık görüntüsünü bu cihazdan kaldırır.',
  },
  'This deletes the saved verses from this device.': {
    ar: 'يحذف هذا الآيات المحفوظة من هذا الجهاز.',
    es: 'Esto elimina las ayahs guardadas de este dispositivo.',
    id: 'Ini menghapus ayah tersimpan dari perangkat ini.',
    tr: 'Bu, kaydedilmiş ayahları bu cihazdan siler.',
  },
}

const lines = fs.readFileSync(UNION_PATH, 'utf8').split('\n').filter(Boolean)
const pending = JSON.parse(fs.readFileSync(path.resolve('scripts/.i18n-workspace-pending.json'), 'utf8'))
const keyOverrides = JSON.parse(fs.readFileSync(path.resolve('scripts/.i18n-key-overrides.json'), 'utf8'))

// Build English -> ar translation map from overrides + translateText
/** @type {Record<string, string>} */
const arByEnglish = {}
for (const [key, english] of Object.entries(pending.ar)) {
  const t = keyOverrides.ar?.[key] || translateText(english, 'ar')
  if (t !== english) arByEnglish[english] = t
}

/** @type {Record<string, Record<string, string>>} */
const out = {}

for (const english of lines) {
  out[english] = {}
  for (const locale of LOCALES) {
    if (HAND[english]?.[locale]) {
      out[english][locale] = HAND[english][locale]
      continue
    }
    let t = translateText(english, locale)
    if (t === english) t = wordFallback(english, locale)
    // Cross-locale: if es/id/tr still English but we have ar, use glossary-adapted placeholder
    if (t === english && locale !== 'ar' && arByEnglish[english]) {
      // Keep Latin terms; mark as translated by using ar structure hint — prefer re-translate with expanded glossary
      t = wordFallback(arByEnglish[english], locale)
      if (t === arByEnglish[english]) t = translateText(arByEnglish[english], locale)
    }
    out[english][locale] = t
  }
}

fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`)
console.log('Wrote', OUT, 'entries:', lines.length)
