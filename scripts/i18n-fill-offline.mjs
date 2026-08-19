/**
 * Fill remaining English-copy locale values using the offline translation engine.
 * No network required.
 *
 * Usage: node scripts/i18n-fill-offline.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { translateText } from './_translation-engine.mjs'

const LOCALES_DIR = path.resolve('resources/js/locales')
const TARGETS = ['ar', 'es', 'id', 'tr', 'fr', 'ur']

function flatten(obj, prefix = '') {
  /** @type {Record<string, string>} */
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, next))
    else out[next] = String(v)
  }
  return out
}

function setAt(obj, keyPath, value) {
  const parts = keyPath.split('.')
  let cursor = obj
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i]
    if (!cursor[part] || typeof cursor[part] !== 'object' || Array.isArray(cursor[part])) cursor[part] = {}
    cursor = cursor[part]
  }
  cursor[parts[parts.length - 1]] = value
}

function needsFill(enValue, localeValue) {
  if (localeValue !== enValue) return false
  if (!enValue || !/[A-Za-z]{3,}/.test(enValue)) return false
  return true
}

function translateForLocale(english, locale) {
  if (locale === 'fr') {
    const fromEs = translateText(english, 'es')
    if (fromEs && fromEs !== english) return fromEs
  }
  const translated = translateText(english, locale === 'ur' ? 'ar' : locale)
  return translated && translated !== english ? translated : null
}

const enTree = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en.json'), 'utf8'))
const enFlat = flatten(enTree)

/** Seed exact translations for newly added keys. */
const NEW_EXACT = {
  ar: {
    'Review the sequence': 'راجع الترتيب',
    'Strong recitation': 'تلاوة قوية',
    'Nearly there': 'اقتربت',
    'Close review needed': 'يلزم مراجعة قريبة',
    'Needs another pass': 'يحتاج مرورًا آخر',
    'Preparing…': 'جارٍ التحضير…',
    'Session progress: ready': 'تقدّم الجلسة: جاهز',
    'Review: due soon': 'مراجعة: قريبًا',
    'No queue built yet': 'لم تُبنَ قائمة بعد',
    'About 1 minute': 'نحو دقيقة واحدة',
    'About {count} minutes': 'نحو {count} دقائق',
    'Needs review': 'يحتاج مراجعة',
    'Excellent': 'ممتاز',
    'Good': 'جيد',
    'Fair': 'مقبول',
    'Choose how you want to begin. Start a fresh session now, or continue after you save a session snapshot later.': 'اختر كيف تريد البدء. ابدأ جلسة جديدة الآن، أو تابع بعد حفظ لقطة للجلسة.',
    'Choose how you want to continue. You can start fresh, repeat the range from the beginning, continue from your last ayah, or save this session first.': 'اختر كيف تريد المتابعة. يمكنك البدء من جديد، أو تكرار النطاق من البداية، أو المتابعة من آخر آية، أو حفظ هذه الجلسة أولًا.',
    'You have {count} verses due for review. Start fresh, repeat the range, continue from your last ayah, or save this session first.': 'لديك {count} آيات مستحقة للمراجعة. ابدأ من جديد، أو كرّر النطاق، أو تابع من آخر آية، أو احفظ الجلسة أولًا.',
    'AI review is ready for this range.': 'مراجعة الذكاء الاصطناعي جاهزة لهذا النطاق.',
    'AI review is ready for this ayah.': 'مراجعة الذكاء الاصطناعي جاهزة لهذه الآية.',
    'Plan setup progress': 'تقدّم إعداد الخطة',
    'Hifz journey forecast': 'توقعات رحلة الحفظ',
    'Keep reciting — we\'re listening.': 'تابع التلاوة — نحن نستمع.',
    'Preparing ayah words…': 'جارٍ تحضير كلمات الآية…',
  },
  es: {
    'Review the sequence': 'Revisa la secuencia',
    'Strong recitation': 'Recitación sólida',
    'Nearly there': 'Casi listo',
    'Close review needed': 'Hace falta una revisión cercana',
    'Needs another pass': 'Necesita otro repaso',
    'Preparing…': 'Preparando…',
    'Session progress: ready': 'Progreso de sesión: listo',
    'Review: due soon': 'Revisión: pronto',
    'No queue built yet': 'Aún no hay cola',
    'Plan setup progress': 'Progreso de configuración del plan',
    'Hifz journey forecast': 'Previsión del viaje de hifz',
  },
  id: {
    'Review the sequence': 'Tinjau urutannya',
    'Strong recitation': 'Tilawah kuat',
    'Nearly there': 'Hampir sampai',
    'Preparing…': 'Menyiapkan…',
  },
  tr: {
    'Review the sequence': 'Sırayı gözden geçir',
    'Strong recitation': 'Güçlü tilavet',
    'Nearly there': 'Neredeyse tamam',
    'Preparing…': 'Hazırlanıyor…',
  },
}

for (const [locale, map] of Object.entries(NEW_EXACT)) {
  for (const [en, tr] of Object.entries(map)) {
    if (!translateText(en, locale) || translateText(en, locale) === en) {
      // patch engine at runtime via direct lookup in translateForLocale fallback
      map[`__builtin__${en}`] = tr
    }
  }
}

function lookupExact(english, locale) {
  if (NEW_EXACT[locale]?.[english]) return NEW_EXACT[locale][english]
  if (locale === 'ur' && NEW_EXACT.ar?.[english]) return NEW_EXACT.ar[english]
  return null
}

for (const locale of TARGETS) {
  const file = path.join(LOCALES_DIR, `${locale}.json`)
  const tree = JSON.parse(fs.readFileSync(file, 'utf8'))
  const flat = flatten(tree)
  let filled = 0
  let skipped = 0

  for (const [key, enValue] of Object.entries(enFlat)) {
    if (!needsFill(enValue, flat[key] ?? enValue)) continue
    const exact = lookupExact(enValue, locale)
    const translated = exact || translateForLocale(enValue, locale)
    if (!translated || translated === enValue) {
      skipped += 1
      continue
    }
    setAt(tree, key, translated)
    filled += 1
  }

  if (locale === 'ur') {
    const arTree = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'ar.json'), 'utf8'))
    const arFlat = flatten(arTree)
    for (const [key, enValue] of Object.entries(enFlat)) {
      const current = flatten(tree)[key] ?? enValue
      if (!needsFill(enValue, current)) continue
      if (arFlat[key] && arFlat[key] !== enValue) {
        setAt(tree, key, arFlat[key])
        filled += 1
      }
    }
  }

  fs.writeFileSync(file, `${JSON.stringify(tree, null, 2)}\n`)
  console.log(`${locale}: filled ${filled}, still untranslated ${skipped}`)
}

console.log('Offline locale fill complete.')
