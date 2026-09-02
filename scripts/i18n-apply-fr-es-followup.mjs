/**
 * Add production EN keys and remaining FR/ES product copy.
 * Usage: node scripts/i18n-apply-fr-es-followup.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LOCALES_DIR = path.join(ROOT, 'resources/js/locales')

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

function applyMap(tree, map) {
  for (const [key, value] of Object.entries(map)) setAt(tree, key, value)
  return tree
}

function writeLocale(locale, tree) {
  const file = path.join(LOCALES_DIR, `${locale}.json`)
  fs.writeFileSync(file, `${JSON.stringify(tree, null, 2)}\n`)
}

const EN = {
  'common.filters': 'Filters',
  'common.relative.justNow': 'Just now',
  'common.relative.minutesAgo': '{n}m ago',
  'common.relative.hoursAgo': '{n}h ago',
  'common.relative.daysAgo': '{n}d ago',
  'admin.kicker': 'Admin',
  'admin.dashboard': 'Dashboard',
  'ui.contact_inbox': 'Contact Inbox',
  'toasts.sessionStartFailed': 'Unable to start this session. Please try again.',
  'errors.genericRetry': 'Something went wrong. Please retry.',
  'memorisation.exportReport.saved': 'Saved',
  'memorisation.exportReport.exported': 'Exported',
  'memorisation.exportReport.sessionStats': 'Session stats',
  'memorisation.exportReport.footer': 'Mutqin session export',
  'memorisation.analyticsReport.repeatsCompleted': 'Repeats completed',
  'memorisation.analyticsReport.runsCompleted': 'Runs completed',
  'memorisation.analytics.summaryReviewedOne': 'You reviewed {count} ayah',
  'memorisation.analytics.summaryReviewedMany': 'You reviewed {count} ayahs',
  'memorisation.analytics.summaryTime': 'in {time}',
  'memorisation.analytics.summaryRepeatsOne': 'with {count} repeat',
  'memorisation.analytics.summaryRepeatsMany': 'with {count} repeats',
  'memorisation.analytics.summaryAttentionOne': '{count} ayah needed extra attention.',
  'memorisation.analytics.summaryAttentionMany': '{count} ayahs needed extra attention.',
  'memorisation.saved_session_meta_completed': 'Completed',
  'feedback.messageRequired': 'Please enter your feedback.',
  'feedback.messageMin': 'Please enter at least a few characters.',
  'feedback.typeRequired': 'Please choose a feedback type.',
  'feedback.typeInvalid': 'That feedback type is not supported.',
  'toasts.hifzRecoveryApplied': 'Recovery plan applied',
  'memorisation.exportReport.versesRead': 'Ayahs reviewed',
  'memorisation.exportReport.timeSpent': 'Time memorising',
  'memorisation.exportReport.repetitions': 'Repeats completed',
  'memorisation.exportReport.sessionPlays': 'Session plays',
  'memorisation.exportReport.versePlays': 'Verse plays',
  'memorisation.exportReport.averageTime': 'Average time per ayah',
  'memorisation.exportReport.struggledAyahs': 'Ayahs that needed extra care',
  'memorisation.hifzJourney.ayahsPerDayMax': '{max} ayahs/day',
}

const FR = {
  ...EN,
  'common.filters': 'Filtres',
  'common.relative.justNow': 'À l’instant',
  'common.relative.minutesAgo': 'il y a {n} min',
  'common.relative.hoursAgo': 'il y a {n} h',
  'common.relative.daysAgo': 'il y a {n} j',
  'admin.kicker': 'Admin',
  'admin.dashboard': 'Tableau de bord',
  'ui.contact_inbox': 'Boîte de contact',
  'toasts.sessionStartFailed': 'Impossible de démarrer cette session. Réessayez.',
  'errors.genericRetry': 'Une erreur s’est produite. Veuillez réessayer.',
  'memorisation.exportReport.saved': 'Enregistrée',
  'memorisation.exportReport.exported': 'Exportée',
  'memorisation.exportReport.sessionStats': 'Statistiques de session',
  'memorisation.exportReport.footer': 'Export de session Mutqin',
  'memorisation.analyticsReport.repeatsCompleted': 'Répétitions terminées',
  'memorisation.analyticsReport.runsCompleted': 'Passages terminés',
  'memorisation.analytics.summaryReviewedOne': 'Vous avez révisé {count} ayah',
  'memorisation.analytics.summaryReviewedMany': 'Vous avez révisé {count} ayahs',
  'memorisation.analytics.summaryTime': 'en {time}',
  'memorisation.analytics.summaryRepeatsOne': 'avec {count} répétition',
  'memorisation.analytics.summaryRepeatsMany': 'avec {count} répétitions',
  'memorisation.analytics.summaryAttentionOne': '{count} ayah a besoin d’un peu plus d’attention.',
  'memorisation.analytics.summaryAttentionMany': '{count} ayahs ont besoin d’un peu plus d’attention.',
  'memorisation.saved_session_meta_completed': 'Terminée',
  'homepage.start_free': 'Commencer gratuitement',
  'memorisation.aiCheck.consentDecline': 'Pas maintenant',
  'feedback.messageRequired': 'Veuillez saisir votre avis.',
  'feedback.messageMin': 'Veuillez saisir au moins quelques caractères.',
  'feedback.typeRequired': 'Veuillez choisir un type d’avis.',
  'feedback.typeInvalid': 'Ce type d’avis n’est pas pris en charge.',
  'toasts.hifzRecoveryApplied': 'Plan de rattrapage appliqué',
  'memorisation.exportReport.versesRead': 'Ayahs révisées',
  'memorisation.exportReport.timeSpent': 'Temps de mémorisation',
  'memorisation.exportReport.repetitions': 'Répétitions terminées',
  'memorisation.exportReport.sessionPlays': 'Lectures de session',
  'memorisation.exportReport.versePlays': 'Lectures d’ayahs',
  'memorisation.exportReport.averageTime': 'Temps moyen par ayah',
  'memorisation.exportReport.struggledAyahs': 'Ayahs qui ont demandé plus d’attention',
  'memorisation.hifzJourney.ayahsPerDayMax': '{max} ayahs/jour',
}

const ES = {
  ...EN,
  'common.filters': 'Filtros',
  'common.relative.justNow': 'Justo ahora',
  'common.relative.minutesAgo': 'hace {n} min',
  'common.relative.hoursAgo': 'hace {n} h',
  'common.relative.daysAgo': 'hace {n} d',
  'admin.kicker': 'Admin',
  'admin.dashboard': 'Panel',
  'ui.contact_inbox': 'Bandeja de contacto',
  'toasts.sessionStartFailed': 'No se pudo iniciar esta sesión. Inténtalo de nuevo.',
  'errors.genericRetry': 'Algo salió mal. Inténtalo de nuevo.',
  'memorisation.exportReport.saved': 'Guardada',
  'memorisation.exportReport.exported': 'Exportada',
  'memorisation.exportReport.sessionStats': 'Estadísticas de la sesión',
  'memorisation.exportReport.footer': 'Exportación de sesión Mutqin',
  'memorisation.analyticsReport.repeatsCompleted': 'Repeticiones completadas',
  'memorisation.analyticsReport.runsCompleted': 'Pasadas completadas',
  'memorisation.analytics.summaryReviewedOne': 'Revisaste {count} ayah',
  'memorisation.analytics.summaryReviewedMany': 'Revisaste {count} ayahs',
  'memorisation.analytics.summaryTime': 'en {time}',
  'memorisation.analytics.summaryRepeatsOne': 'con {count} repetición',
  'memorisation.analytics.summaryRepeatsMany': 'con {count} repeticiones',
  'memorisation.analytics.summaryAttentionOne': '{count} ayah necesitó más atención.',
  'memorisation.analytics.summaryAttentionMany': '{count} ayahs necesitaron más atención.',
  'memorisation.saved_session_meta_completed': 'Completada',
  'homepage.start_free': 'Empieza gratis',
  'memorisation.aiCheck.consentDecline': 'Ahora no',
  'feedback.messageRequired': 'Por favor, escribe tu comentario.',
  'feedback.messageMin': 'Escribe al menos unos caracteres.',
  'feedback.typeRequired': 'Elige un tipo de comentario.',
  'feedback.typeInvalid': 'Ese tipo de comentario no está admitido.',
  'toasts.hifzRecoveryApplied': 'Plan de recuperación aplicado',
  'memorisation.exportReport.versesRead': 'Ayahs revisadas',
  'memorisation.exportReport.timeSpent': 'Tiempo de memorización',
  'memorisation.exportReport.repetitions': 'Repeticiones completadas',
  'memorisation.exportReport.sessionPlays': 'Reproducciones de la sesión',
  'memorisation.exportReport.versePlays': 'Reproducciones de ayahs',
  'memorisation.exportReport.averageTime': 'Tiempo medio por ayah',
  'memorisation.exportReport.struggledAyahs': 'Ayahs que pidieron más cuidado',
  'memorisation.hifzJourney.ayahsPerDayMax': '{max} ayahs/día',
}

const enTree = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en.json'), 'utf8'))
applyMap(enTree, EN)
writeLocale('en', enTree)

const frTree = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'fr.json'), 'utf8'))
applyMap(frTree, FR)
writeLocale('fr', frTree)

const esTree = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'es.json'), 'utf8'))
applyMap(esTree, ES)
writeLocale('es', esTree)

for (const locale of ['ar', 'id', 'tr', 'ur']) {
  const tree = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, `${locale}.json`), 'utf8'))
  for (const [key, value] of Object.entries(EN)) {
    const parts = key.split('.')
    let cursor = tree
    let missing = false
    for (let i = 0; i < parts.length; i += 1) {
      if (cursor[parts[i]] === undefined) {
        missing = true
        break
      }
      if (i < parts.length - 1) cursor = cursor[parts[i]]
    }
    if (missing) setAt(tree, key, value)
  }
  writeLocale(locale, tree)
}

console.log(`Applied ${Object.keys(EN).length} EN keys, FR/ES product copy, and English fallbacks for other locales.`)
