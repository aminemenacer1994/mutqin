/**
 * Build final i18n-workspace-patches.mjs from pending + seeds + fr bridge + overrides.
 */
import fs from 'node:fs'
import path from 'node:path'

const PENDING_PATH = path.resolve('scripts/.i18n-workspace-pending.json')
const OUT_PATCHES = path.resolve('scripts/i18n-workspace-patches.mjs')
const FULL_SYNC = path.resolve('scripts/i18n-full-sync.mjs')
const BULK = path.resolve('scripts/i18n-bulk-translate-placeholders.mjs')
const LOCALES_DIR = path.resolve('resources/js/locales')
const LOCALES = ['ar', 'es', 'id', 'tr']

/** French → Spanish UI bridge (workspace copy). */
const FR_TO_ES = [
  ['Paramètres', 'Ajustes'], ['Contrôles', 'Controles'], ['Déconnexion', 'Cerrar sesión'],
  ['Mémorisation', 'Memorización'], ['Métadonnées', 'Metadatos'], ['Annuler', 'Cancelar'],
  ['Enregistrer', 'Guardar'], ['Fermer', 'Cerrar'], ['Supprimer', 'Eliminar'],
  ['Reprendre', 'Reanudar'], ['Abandonner', 'Descartar'], ['Retour', 'Volver'],
  ['Continuer', 'Continuar'], ['Filtrer', 'Filtrar'], ['Télécharger', 'Descargar'],
  ['Méthode', 'Método'], ['Réinitialiser', 'Restablecer'], ['Chargement', 'Cargando'],
  ['Oui', 'Sí'], ['Non', 'No'], ['Accueil', 'Inicio'], ['Tableau de bord', 'Panel'],
  ['Profil', 'Perfil'], ['Compte', 'Cuenta'], ['Menu', 'Menú'], ['Abonnement', 'Suscripción'],
  ['Paramètre', 'Ajuste'], ['Session', 'Sesión'], ['Séance', 'Sesión'], ['Journée', 'Día'],
  ['Semaine', 'Semana'], ['Mois', 'Mes'], ['Aujourd\'hui', 'Hoy'], ['Demain', 'Mañana'],
  ['Hier', 'Ayer'], ['Précédent', 'Anterior'], ['Suivant', 'Siguiente'], ['Suivante', 'Siguiente'],
  ['Précédente', 'Anterior'], ['Lecture', 'Reproducción'], ['Pause', 'Pausa'], ['Arrêt', 'Detener'],
  ['Audio', 'Audio'], ['Enregistrement', 'Grabación'], ['Récitation', 'Recitación'],
  ['Révision', 'Revisión'], ['Revoir', 'Revisar'], ['Pratique', 'Práctica'], ['Pratiquer', 'Practicar'],
  ['Répéter', 'Repetir'], ['Répétition', 'Repetición'], ['Écouter', 'Escuchar'],
  ['Commencer', 'Comenzar'], ['Démarrer', 'Iniciar'], ['Terminer', 'Terminar'],
  ['Finir', 'Finalizar'], ['Nouvelle', 'Nueva'], ['Nouveau', 'Nuevo'], ['Nouvelles', 'Nuevas'],
  ['Choisir', 'Elegir'], ['Sélectionner', 'Seleccionar'], ['Sélectionné', 'Seleccionado'],
  ['Sélectionnée', 'Seleccionada'], ['Confirmer', 'Confirmar'], ['Conserver', 'Conservar'],
  ['Retirer', 'Quitar'], ['Modifier', 'Editar'], ['Renommer', 'Renombrar'],
  ['Erreur', 'Error'], ['Échec', 'Fallo'], ['Réussi', 'Correcto'], ['Succès', 'Éxito'],
  ['Chargement…', 'Cargando…'], ['Synchronisation', 'Sincronización'], ['Synchronisé', 'Sincronizado'],
  ['Hors ligne', 'Sin conexión'], ['En ligne', 'En línea'], ['Connexion', 'Conexión'],
  ['Microphone', 'Micrófono'], ['Paramètres de', 'Ajustes de'], ['Afficher', 'Mostrar'],
  ['Masquer', 'Ocultar'], ['Activer', 'Activar'], ['Désactiver', 'Desactivar'],
  ['Réglages', 'Ajustes'], ['Outils', 'Herramientas'], ['Avancé', 'Avanzado'], ['Avancés', 'Avanzados'],
  ['Débutant', 'Principiante'], ['Confiance', 'Confianza'], ['Précision', 'Precisión'],
  ['Progrès', 'Progreso'], ['Statistiques', 'Estadísticas'], ['Analytique', 'Analíticas'],
  ['Analyses', 'Analíticas'], ['Aperçu', 'Resumen'], ['Détails', 'Detalles'],
  ['Résultat', 'Resultado'], ['Résultats', 'Resultados'], ['Tentative', 'Intento'],
  ['Tentatives', 'Intentos'], ['Mot', 'Palabra'], ['Mots', 'Palabras'], ['Vers', 'Ayah'],
  ['Versets', 'Ayahs'], ['Verset', 'Ayah'], ['Sourate', 'Surah'], ['Plage', 'Rango'],
  ['Portée', 'Rango'], ['Coran', "Qur'an"], ['Mushaf', 'Mushaf'], ['Tajweed', 'Tajweed'],
  ['Mode', 'Modo'], ['Vue', 'Vista'], ['Page', 'Página'], ['Pages', 'Páginas'],
  ['Joueur', 'Reproductor'], ['Lecteur', 'Reproductor'], ['Mini', 'Mini'], ['Complet', 'Completo'],
  ['Réglage', 'Ajuste'], ['Réglages', 'Ajustes'], ['Aide', 'Ayuda'], ['Apprentissage', 'Aprendizaje'],
  ['Mémoriser', 'Memorizar'], ['Mémorisé', 'Memorizado'], ['Mémorisée', 'Memorizada'],
  ['Mémorisés', 'Memorizados'], ['Mémorisées', 'Memorizadas'], ['Apprentissage', 'Aprendizaje'],
  ['Révision douce', 'Revisión suave'], ['Bienvenue', 'Bienvenido'], ['Bon retour', 'Bienvenido de nuevo'],
  ['Salam', 'La paz sea contigo'], ['Insha\'Allah', "insha'Allah"], ['Masha\'Allah', "Masha'Allah"],
  ['Alhamdulillah', 'Alhamdulillah'], ['Muraja\'ah', "muraja'ah"], ['Hifz', 'hifz'],
  ['Talqin', 'talqin'], ['Mutqin', 'Mutqin'], ['IA', 'IA'], ['Intelligence artificielle', 'Inteligencia artificial'],
  ['Vérification', 'Comprobación'], ['Auto-vérification', 'Autocomprobación'],
  ['Bibliothèque', 'Biblioteca'], ['Notes', 'Notas'], ['Note', 'Nota'],
  ['Réflexion', 'Reflexión'], ['Réflexions', 'Reflexiones'], ['Plan', 'Plan'], ['Plans', 'Planes'],
  ['Objectif', 'Objetivo'], ['Objectifs', 'Objetivos'], ['Cible', 'Meta'], ['Charge', 'Carga'],
  ['Faible', 'Débil'], ['Fort', 'Fuerte'], ['Mixte', 'Mixto'], ['Moyen', 'Medio'],
  ['Restant', 'Restante'], ['Restants', 'Restantes'], ['Restante', 'Restante'],
  ['Terminé', 'Completado'], ['Terminée', 'Completada'], ['Terminés', 'Completados'],
  ['Incomplet', 'Incompleto'], ['Incomplète', 'Incompleta'], ['En cours', 'En curso'],
  ['En pause', 'En pausa'], ['Actif', 'Activo'], ['Active', 'Activa'], ['Activé', 'Activado'],
  ['Désactivé', 'Desactivado'], ['Réessayez', 'Inténtalo de nuevo'], ['Réessayer', 'Reintentar'],
  ['Impossible', 'No se pudo'], ['Indisponible', 'No disponible'], ['Disponible', 'Disponible'],
  ['Veuillez', 'Por favor'], ['Appuyez', 'Pulsa'], ['Touchez', 'Toca'], ['Cliquez', 'Haz clic'],
  ['Ouvrir', 'Abrir'], ['Fermer le', 'Cerrar'], ['Basculer', 'Alternar'], ['Passer à', 'Cambiar a'],
  ['Réduire', 'Reducir'], ['Augmenter', 'Aumentar'], ['Taille de police', 'Tamaño de fuente'],
  ['Taille du texte', 'Tamaño del texto'], ['Visibilité', 'Visibilidad'], ['Vitesse', 'Velocidad'],
  ['Vitesse de lecture', 'Velocidad de reproducción'], ['Comportement', 'Comportamiento'],
  ['Raccourcis clavier', 'Atajos de teclado'], ['Espace', 'Espacio'], ['Entrée', 'Enter'],
  ['Général', 'General'], ['Navigation', 'Navegación'], ['Contrôle', 'Control'], ['Contrôles de session', 'Controles de sesión'],
  ['Fin de session', 'Finalizar sesión'], ['Début de session', 'Iniciar sesión'],
  ['Journée de pratique', 'Racha de práctica'], ['jours d\'affilée', 'días seguidos'],
  ['Cette session', 'Esta sesión'], ['Tout mémorisé', 'Todo memorizado'],
  ['Aucun', 'Ninguno'], ['Aucune', 'Ninguna'], ['Pas encore', 'Aún no'], ['Rien', 'Nada'],
  ['Chargement de', 'Cargando'], ['Préparation', 'Preparación'], ['Traitement', 'Procesando'],
  ['Évaluation', 'Evaluación'], ['Analyse', 'Análisis'], ['Écoute', 'Escucha'],
  ['Écoute en cours', 'Escuchando'], ['Enregistrement en cours', 'Grabando'],
  ['Complet', 'Completado'], ['Étape', 'Paso'], ['Étapes', 'Pasos'], ['de', 'de'],
  ['sur', 'de'], ['sur ', 'de '], [' pour ', ' para '], [' avec ', ' con '],
  [' et ', ' y '], [' ou ', ' o '], [' dans ', ' en '], [' cette ', ' esta '],
  [' ce ', ' este '], [' cette ', ' esta '], [' votre ', ' tu '], [' vos ', ' tus '],
  [' vous ', ' tú '], [' nous ', ' nosotros '], [' les ', ' los '], [' des ', ' '],
  [' du ', ' del '], [' de la ', ' de la '], [' au ', ' al '], [' aux ', ' a los '],
  [' l\'', ' el '], [' d\'', ' de '], [' qu\'', ' que '], [' n\'', ' no '],
  [' à ', ' a '], [' é ', ' es '], [' è ', ' es '], [' ê ', ' es '],
]

function extractConst(name, src) {
  const marker = `const ${name} = `
  const start = src.indexOf(marker)
  if (start === -1) return {}
  const slice = src.slice(start + marker.length)
  let depth = 0
  let end = -1
  for (let i = 0; i < slice.length; i += 1) {
    if (slice[i] === '{') depth += 1
    if (slice[i] === '}') {
      depth -= 1
      if (depth === 0) {
        end = i + 1
        break
      }
    }
  }
  if (end === -1) return {}
  return Function(`return ${slice.slice(0, end)}`)()
}

function flatten(obj, prefix = '') {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, next))
    else out[next] = String(v)
  }
  return out
}

function frToEs(text) {
  let out = text
  for (const [fr, es] of FR_TO_ES) out = out.split(fr).join(es)
  return out
}

function escapeJs(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')
}

// Import translation engine from populate script logic
const { translateText, QURAN_REMINDERS, EXACT } = await import('./_translation-engine.mjs')

function loadSeeds(pending) {
  const syncSrc = fs.readFileSync(FULL_SYNC, 'utf8')
  const bulkSrc = fs.readFileSync(BULK, 'utf8')
  const mem = extractConst('MEMORISATION_PATCH', syncSrc)
  const cov = extractConst('COVERAGE_PATCH', syncSrc)
  const bulk = extractConst('TRANSLATIONS', bulkSrc)
  const seeds = { ar: {}, es: {}, id: {}, tr: {} }
  for (const locale of LOCALES) {
    for (const patch of [mem[locale], cov[locale]]) {
      if (!patch) continue
      for (const [key, value] of Object.entries(patch)) {
        if (pending[locale]?.[key]) seeds[locale][key] = value
      }
    }
    for (const [key, entry] of Object.entries(bulk)) {
      if (!pending[locale]?.[key]) continue
      if (entry[locale]) seeds[locale][key] = entry[locale]
      else if (locale === 'ar' && entry.ar) seeds[locale][key] = entry.ar
    }
  }
  return seeds
}

function loadOverrides() {
  const p = path.resolve('scripts/.i18n-key-overrides.json')
  if (!fs.existsSync(p)) return { ar: {}, es: {}, id: {}, tr: {} }
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

const pending = JSON.parse(fs.readFileSync(PENDING_PATH, 'utf8'))
const seeds = loadSeeds(pending)
const overrides = loadOverrides()
const enFlat = flatten(JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en.json'), 'utf8')))
const frFlat = flatten(JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'fr.json'), 'utf8')))

/** @type {Record<string, Record<string, string>>} */
const patches = { ar: {}, es: {}, id: {}, tr: {} }

for (const locale of LOCALES) {
  for (const [key, english] of Object.entries(pending[locale] || {})) {
    if (overrides[locale]?.[key]) {
      patches[locale][key] = overrides[locale][key]
      continue
    }
    if (seeds[locale]?.[key]) {
      patches[locale][key] = seeds[locale][key]
      continue
    }
    if (locale === 'es' && frFlat[key] && frFlat[key] !== enFlat[key] && frFlat[key] !== english) {
      patches[locale][key] = frToEs(frFlat[key])
      continue
    }
    patches[locale][key] = translateText(english, locale)
  }
}

const lines = [
  '/** Workspace UI translations — ar, es, id, tr. */',
  'export const WORKSPACE_PATCHES = {',
]
for (const locale of LOCALES) {
  lines.push(`  ${locale}: {`)
  for (const key of Object.keys(patches[locale]).sort()) {
    lines.push(`    '${key.replace(/'/g, "\\'")}': '${escapeJs(patches[locale][key])}',`)
  }
  lines.push('  },')
}
lines.push('}', '')
fs.writeFileSync(OUT_PATCHES, lines.join('\n'))

for (const locale of LOCALES) {
  const still = Object.entries(pending[locale]).filter(([k, v]) => patches[locale][k] === v).length
  console.log(`${locale}: ${Object.keys(patches[locale]).length} keys, still English: ${still}`)
}
console.log('Wrote', OUT_PATCHES)
