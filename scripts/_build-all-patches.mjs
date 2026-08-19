/**
 * Generate .i18n-exact-extended.json from manual translations + fr bridge.
 * Then build i18n-workspace-patches.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { translateText } from './_translation-engine.mjs'
import { wordFallback } from './_word-fallback.mjs'

const PENDING_PATH = path.resolve('scripts/.i18n-workspace-pending.json')
const MANUAL_PATH = path.resolve('scripts/.i18n-manual-translations.json')
const OVERRIDES_PATH = path.resolve('scripts/.i18n-key-overrides.json')
const REMAINING_PATH = path.resolve('scripts/.i18n-remaining-en-translations.json')
const EXT_PATH = path.resolve('scripts/.i18n-exact-extended.json')
const OUT_PATCHES = path.resolve('scripts/i18n-workspace-patches.mjs')
const LOCALES_DIR = path.resolve('resources/js/locales')
const LOCALES = ['ar', 'es', 'id', 'tr']

/** Common UI single-word / short phrase translations. */
const COMMON_UI = {
  Reset: { ar: 'إعادة تعيين', es: 'Restablecer', id: 'Atur ulang', tr: 'Sıfırla' },
  Controls: { ar: 'عناصر التحكم', es: 'Controles', id: 'Kontrol', tr: 'Kontroller' },
  Language: { ar: 'اللغة', es: 'Idioma', id: 'Bahasa', tr: 'Dil' },
  Login: { ar: 'تسجيل الدخول', es: 'Iniciar sesión', id: 'Masuk', tr: 'Giriş yap' },
  Register: { ar: 'إنشاء حساب', es: 'Registrarse', id: 'Daftar', tr: 'Kayıt ol' },
  Logout: { ar: 'تسجيل الخروج', es: 'Cerrar sesión', id: 'Keluar', tr: 'Çıkış yap' },
  Yes: { ar: 'نعم', es: 'Sí', id: 'Ya', tr: 'Evet' },
  No: { ar: 'لا', es: 'No', id: 'Tidak', tr: 'Hayır' },
  Home: { ar: 'الرئيسية', es: 'Inicio', id: 'Beranda', tr: 'Ana sayfa' },
  Filter: { ar: 'تصفية', es: 'Filtrar', id: 'Filter', tr: 'Filtrele' },
  Dismiss: { ar: 'إغلاق', es: 'Descartar', id: 'Tutup', tr: 'Kapat' },
  'Pausing…': { ar: 'جارٍ الإيقاف المؤقت…', es: 'Pausando…', id: 'Menjeda…', tr: 'Duraklatılıyor…' },
  'No matches found': { ar: 'لا توجد نتائج مطابقة', es: 'No se encontraron coincidencias', id: 'Tidak ada yang cocok', tr: 'Eşleşme bulunamadı' },
  'Something went wrong': { ar: 'حدث خطأ ما', es: 'Algo salió mal', id: 'Terjadi kesalahan', tr: 'Bir şeyler ters gitti' },
  General: { ar: 'عام', es: 'General', id: 'Umum', tr: 'Genel' },
  'Clear filters': { ar: 'مسح عوامل التصفية', es: 'Borrar filtros', id: 'Hapus filter', tr: 'Filtreleri temizle' },
  Metadata: { ar: 'البيانات الوصفية', es: 'Metadatos', id: 'Metadata', tr: 'Meta veri' },
  Download: { ar: 'تنزيل', es: 'Descargar', id: 'Unduh', tr: 'İndir' },
  Method: { ar: 'الطريقة', es: 'Método', id: 'Metode', tr: 'Yöntem' },
  'Font size': { ar: 'حجم الخط', es: 'Tamaño de fuente', id: 'Ukuran font', tr: 'Yazı boyutu' },
  Tajweed: { ar: 'Tajweed', es: 'Tajweed', id: 'Tajweed', tr: 'Tajweed' },
  Enter: { ar: 'Enter', es: 'Enter', id: 'Enter', tr: 'Enter' },
  'Ctrl/Cmd + S': { ar: 'Ctrl/Cmd + S', es: 'Ctrl/Cmd + S', id: 'Ctrl/Cmd + S', tr: 'Ctrl/Cmd + S' },
  Alhamdulillah: { ar: 'Alhamdulillah', es: 'Alhamdulillah', id: 'Alhamdulillah', tr: 'Alhamdulillah' },
  Available: { ar: 'متاح', es: 'Disponible', id: 'Tersedia', tr: 'Kullanılabilir' },
  Private: { ar: 'خاص', es: 'Privado', id: 'Pribadi', tr: 'Özel' },
  Expand: { ar: 'توسيع', es: 'Expandir', id: 'Perluas', tr: 'Genişlet' },
  Collapse: { ar: 'طي', es: 'Contraer', id: 'Perkecil', tr: 'Daralt' },
  Edit: { ar: 'تعديل', es: 'Editar', id: 'Edit', tr: 'Düzenle' },
  Editing: { ar: 'جارٍ التعديل', es: 'Editando', id: 'Mengedit', tr: 'Düzenleniyor' },
  "Don't save": { ar: 'لا تحفظ', es: 'No guardar', id: 'Jangan simpan', tr: 'Kaydetme' },
  Reflection: { ar: 'تأمل', es: 'Reflexión', id: 'Refleksi', tr: 'Yansıma' },
  Question: { ar: 'سؤال', es: 'Pregunta', id: 'Pertanyaan', tr: 'Soru' },
  Score: { ar: 'النتيجة', es: 'Puntuación', id: 'Skor', tr: 'Puan' },
  Source: { ar: 'المصدر', es: 'Fuente', id: 'Sumber', tr: 'Kaynak' },
  Why: { ar: 'لماذا', es: 'Por qué', id: 'Mengapa', tr: 'Neden' },
  Revisit: { ar: 'أعد الزيارة', es: 'Revisar', id: 'Kunjungi lagi', tr: 'Yeniden göz at' },
  Correct: { ar: 'صحيح', es: 'Correcto', id: 'Benar', tr: 'Doğru' },
  Incorrect: { ar: 'غير صحيح', es: 'Incorrecto', id: 'Salah', tr: 'Yanlış' },
  Skipped: { ar: 'تم التخطي', es: 'Omitido', id: 'Dilewati', tr: 'Atlandı' },
  Waiting: { ar: 'انتظار', es: 'Esperando', id: 'Menunggu', tr: 'Bekleniyor' },
  Mushaf: { ar: 'مصحف', es: 'Mushaf', id: 'Mushaf', tr: 'Mushaf' },
  Match: { ar: 'تطابق', es: 'Coincidencia', id: 'Cocok', tr: 'Eşleşme' },
  Covered: { ar: 'مغطى', es: 'Cubierto', id: 'Tercakup', tr: 'Kapsanan' },
  'Change set': { ar: 'تغيير المجموعة', es: 'Cambiar conjunto', id: 'Ubah set', tr: 'Seti değiştir' },
  'Revision due': { ar: 'مراجعة مستحقة', es: 'Revisión pendiente', id: 'Revisi jatuh tempo', tr: 'Tekrar zamanı' },
  'Quick tour': { ar: 'جولة سريعة', es: 'Tour rápido', id: 'Tur singkat', tr: 'Hızlı tur' },
  'Adjust tools': { ar: 'ضبط الأدوات', es: 'Ajustar herramientas', id: 'Sesuaikan alat', tr: 'Araçları ayarla' },
  'New reflection': { ar: 'تأمل جديد', es: 'Nueva reflexión', id: 'Refleksi baru', tr: 'Yeni yansıma' },
  'Title (optional)': { ar: 'العنوان (اختياري)', es: 'Título (opcional)', id: 'Judul (opsional)', tr: 'Başlık (isteğe bağlı)' },
  '{count} left': { ar: 'متبقٍ {count}', es: 'Quedan {count}', id: '{count} tersisa', tr: '{count} kaldı' },
  '{n}% of Qur\'an': { ar: '{n}% من القرآن', es: '{n}% del Qur\'an', id: '{n}% Al-Qur\'an', tr: "Qur'an'ın %{n}'i" },
  '{surah} · Ayah {ayah}': { ar: '{surah} · آية {ayah}', es: '{surah} · ayah {ayah}', id: '{surah} · ayah {ayah}', tr: '{surah} · ayah {ayah}' },
  '{surah} · Ayahs {start}–{end}': { ar: '{surah} · آيات {start}–{end}', es: '{surah} · ayahs {start}–{end}', id: '{surah} · ayahs {start}–{end}', tr: '{surah} · ayahs {start}–{end}' },
  '{chapter}, {name}': { ar: '{chapter}، {name}', es: '{chapter}, {name}', id: '{chapter}, {name}', tr: '{chapter}, {name}' },
  '{chapter}, ayah {number}': { ar: '{chapter}، آية {number}', es: '{chapter}, ayah {number}', id: '{chapter}, ayah {number}', tr: '{chapter}, ayah {number}' },
  'Stopped at ayah {ayah}': { ar: 'توقف عند آية {ayah}', es: 'Detenido en ayah {ayah}', id: 'Berhenti di ayah {ayah}', tr: 'Ayah {ayah} durduruldu' },
  'Surah {number}': { ar: 'سورة {number}', es: 'Surah {number}', id: 'Surah {number}', tr: 'Surah {number}' },
  'Match {percent} percent': { ar: 'تطابق {percent} بالمئة', es: 'Coincidencia {percent} por ciento', id: 'Kecocokan {percent} persen', tr: 'Eşleşme yüzde {percent}' },
  'Āyah {ayah}': { ar: 'آية {ayah}', es: 'Ayah {ayah}', id: 'Ayah {ayah}', tr: 'Ayah {ayah}' },
  'Muhammad Asad': { ar: 'محمد أسد', es: 'Muhammad Asad', id: 'Muhammad Asad', tr: 'Muhammad Asad' },
  '{current} / {total}': { ar: '{current} / {total}', es: '{current} / {total}', id: '{current} / {total}', tr: '{current} / {total}' },
}

const FR_TO_ES = [
  ['Paramètres', 'Ajustes'], ['Contrôles', 'Controles'], ['Déconnexion', 'Cerrar sesión'],
  ['Mémorisation', 'Memorización'], ['Métadonnées', 'Metadatos'], ['Annuler', 'Cancelar'],
  ['Enregistrer', 'Guardar'], ['Fermer', 'Cerrar'], ['Supprimer', 'Eliminar'],
  ['Reprendre', 'Reanudar'], ['Abandonner', 'Descartar'], ['Retour', 'Volver'],
  ['Continuer', 'Continuar'], ['Filtrer', 'Filtrar'], ['Télécharger', 'Descargar'],
  ['Réinitialiser', 'Restablecer'], ['Chargement', 'Cargando'], ['Session', 'Sesión'],
  ['Précédent', 'Anterior'], ['Suivant', 'Siguiente'], ['Suivante', 'Siguiente'],
  ['Précédente', 'Anterior'], ['Lecture', 'Reproducción'], ['Pause', 'Pausa'],
  ['Enregistrement', 'Grabación'], ['Récitation', 'Recitación'], ['Révision', 'Revisión'],
  ['Revoir', 'Revisar'], ['Pratique', 'Práctica'], ['Pratiquer', 'Practicar'],
  ['Répéter', 'Repetir'], ['Répétition', 'Repetición'], ['Écouter', 'Escuchar'],
  ['Commencer', 'Comenzar'], ['Démarrer', 'Iniciar'], ['Terminer', 'Terminar'],
  ['Choisir', 'Elegir'], ['Sélectionner', 'Seleccionar'], ['Confirmer', 'Confirmar'],
  ['Conserver', 'Conservar'], ['Erreur', 'Error'], ['Chargement…', 'Cargando…'],
  ['Synchronisation', 'Sincronización'], ['Synchronisé', 'Sincronizado'],
  ['Hors ligne', 'Sin conexión'], ['Microphone', 'Micrófono'], ['Afficher', 'Mostrar'],
  ['Masquer', 'Ocultar'], ['Outils', 'Herramientas'], ['Avancé', 'Avanzado'],
  ['Confiance', 'Confianza'], ['Précision', 'Precisión'], ['Progrès', 'Progreso'],
  ['Analytique', 'Analíticas'], ['Analyses', 'Analíticas'], ['Résultat', 'Resultado'],
  ['Tentative', 'Intento'], ['Tentatives', 'Intentos'], ['Mot', 'Palabra'],
  ['Mots', 'Palabras'], ['Vers', 'Ayah'], ['Versets', 'Ayahs'], ['Verset', 'Ayah'],
  ['Sourate', 'Surah'], ['Plage', 'Rango'], ['Coran', "Qur'an"], ['Mode', 'Modo'],
  ['Vue', 'Vista'], ['Page', 'Página'], ['Joueur', 'Reproductor'], ['Lecteur', 'Reproductor'],
  ['Aide', 'Ayuda'], ['Mémoriser', 'Memorizar'], ['Mémorisé', 'Memorizado'],
  ['Bon retour', 'Bienvenido de nuevo'], ['Vérification', 'Comprobación'],
  ['Bibliothèque', 'Biblioteca'], ['Notes', 'Notas'], ['Objectif', 'Objetivo'],
  ['Faible', 'Débil'], ['Fort', 'Fuerte'], ['Mixte', 'Mixto'], ['Restant', 'Restante'],
  ['Terminé', 'Completado'], ['En cours', 'En curso'], ['En pause', 'En pausa'],
  ['Actif', 'Activo'], ['Active', 'Activa'], ['Activé', 'Activado'], ['Désactivé', 'Desactivado'],
  ['Réessayez', 'Inténtalo de nuevo'], ['Indisponible', 'No disponible'],
  ['Veuillez', 'Por favor'], ['Appuyez', 'Pulsa'], ['Touchez', 'Toca'],
  ['Ouvrir', 'Abrir'], ['Taille de police', 'Tamaño de fuente'],
  ['Visibilité', 'Visibilidad'], ['Vitesse', 'Velocidad'],
  ['Raccourcis clavier', 'Atajos de teclado'], ['Navigation', 'Navegación'],
  ['Fin de session', 'Finalizar sesión'], ['Aucun', 'Ninguno'], ['Aucune', 'Ninguna'],
  ['Pas encore', 'Aún no'], ['Préparation', 'Preparación'], ['Traitement', 'Procesando'],
  ['Évaluation', 'Evaluación'], ['Écoute', 'Escucha'], ['Étape', 'Paso'],
  [' pour ', ' para '], [' avec ', ' con '], [' et ', ' y '], [' ou ', ' o '],
  [' cette ', ' esta '], [' votre ', ' tu '], [' vos ', ' tus '], [' des ', ' '],
  [" d'", ' de '], [" l'", ' el '], [" n'", ' no '], [' à ', ' a '],
]

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

const pending = JSON.parse(fs.readFileSync(PENDING_PATH, 'utf8'))
const manual = fs.existsSync(MANUAL_PATH)
  ? JSON.parse(fs.readFileSync(MANUAL_PATH, 'utf8'))
  : { ar: {}, es: {}, id: {}, tr: {} }
const keyOverrides = fs.existsSync(OVERRIDES_PATH)
  ? JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8'))
  : { ar: {}, es: {}, id: {}, tr: {} }
const remainingByEn = fs.existsSync(REMAINING_PATH)
  ? JSON.parse(fs.readFileSync(REMAINING_PATH, 'utf8'))
  : {}
const enFlat = flatten(JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en.json'), 'utf8')))
const frFlat = flatten(JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'fr.json'), 'utf8')))

/** @type {Record<string, Record<string, string>>} */
const extended = { ar: {}, es: {}, id: {}, tr: {} }

// English -> frToEs(fr) lookup via en.json keys
/** @type {Record<string, string>} */
const enToEsViaFr = {}
for (const [key, enVal] of Object.entries(enFlat)) {
  const frVal = frFlat[key]
  if (frVal && frVal !== enVal) {
    const es = frToEs(frVal)
    if (es && es !== enVal && !enToEsViaFr[enVal]) enToEsViaFr[enVal] = es
  }
}
for (const locale of LOCALES) {
  for (const [key, english] of Object.entries(pending[locale] || {})) {
    const t = manual[locale]?.[key]
    if (t && t !== english) {
      if (locale === 'ar' && /[A-Za-z]{4,}/.test(t) && !/\b(Mutqin|Tajweed|Enter|Ctrl|Alhamdulillah|Safari|iPhone|iPad|Beta|Settings|muraja|hifz|talqin|Masha|insha)\b/.test(t)) {
        continue
      }
      extended[locale][english] = t
    }
  }
}

// ES: map English -> frToEs(fr) for all en/fr pairs
for (const [key, enVal] of Object.entries(enFlat)) {
  const frVal = frFlat[key]
  if (frVal && frVal !== enVal) {
    const es = frToEs(frVal)
    if (es && es !== enVal) extended.es[enVal] = extended.es[enVal] || es
  }
}

// Fill gaps with translateText engine (skip partial English for ar extended cache)
for (const locale of LOCALES) {
  const englishSet = new Set(Object.values(pending[locale] || {}))
  for (const english of englishSet) {
    if (!extended[locale][english]) {
      const t = translateText(english, locale)
      if (t !== english) {
        if (locale === 'ar' && /[A-Za-z]{4,}/.test(t) && !/\b(Mutqin|Tajweed|Enter|Ctrl|Alhamdulillah|Safari|iPhone|iPad|Beta|Settings|muraja|hifz|talqin|Masha|insha)\b/.test(t)) {
          continue
        }
        extended[locale][english] = t
      }
    }
  }
}

fs.writeFileSync(EXT_PATH, `${JSON.stringify(extended, null, 2)}\n`)

/** @type {Record<string, Record<string, string>>} */
const patches = { ar: {}, es: {}, id: {}, tr: {} }

for (const locale of LOCALES) {
  for (const [key, english] of Object.entries(pending[locale] || {})) {
    if (keyOverrides[locale]?.[key]) {
      patches[locale][key] = keyOverrides[locale][key]
      continue
    }
    let t
    if (locale === 'ar') {
      t = COMMON_UI[english]?.ar || translateText(english, locale)
      if (t === english && remainingByEn[english]?.ar) t = remainingByEn[english].ar
    } else {
      t = extended[locale][english] || COMMON_UI[english]?.[locale] || translateText(english, locale)
      if (t === english && remainingByEn[english]?.[locale]) t = remainingByEn[english][locale]
      if (t === english && locale === 'es' && enToEsViaFr[english]) t = enToEsViaFr[english]
      if (t === english) t = wordFallback(english, locale)
    }
    patches[locale][key] = t
  }
  const still = Object.entries(pending[locale]).filter(([k, v]) => patches[locale][k] === v).length
  console.log(`${locale}: ${Object.keys(patches[locale]).length} keys, still English: ${still}`)
}

const lines = [
  '/** Workspace UI translations for ar, es, id, tr. */',
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
console.log('Wrote', OUT_PATCHES)
