/**
 * Sync all locale JSON files from en.json, apply missing-key translations,
 * and bootstrap es.json + ur.json.
 * Usage: node scripts/i18n-full-sync.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const LOCALES_DIR = path.resolve('resources/js/locales')
const en = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en.json'), 'utf8'))

function flatten(obj, prefix = '') {
  const keys = []
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) keys.push(...flatten(v, next))
    else keys.push(next)
  }
  return keys
}

function getAt(obj, keyPath) {
  return keyPath.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj)
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

function deepMergeMissing(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) target[key] = {}
      deepMergeMissing(target[key], value)
    } else if (target[key] === undefined) {
      target[key] = value
    }
  }
  return target
}

/** Flat translations for the 58 recently-added memorisation keys. */
const MEMORISATION_PATCH = {
  fr: {
    'memorisation.choose_a_recording': 'Choisir un enregistrement',
    'memorisation.choose_a_recording_desc': 'Sélectionnez une récitation enregistrée pour revoir votre mémorisation.',
    'memorisation.completed_sessions': 'Sessions terminées',
    'memorisation.completed_sessions_desc': 'Sessions où vous avez atteint la fin de votre plage d\'ayahs. Revisitez pour la muraja\'ah.',
    'memorisation.incomplete_sessions': 'Sessions incomplètes',
    'memorisation.incomplete_sessions_desc': 'Sessions de hifz interrompues. Reprenez exactement où vous vous êtes arrêté.',
    'memorisation.last_opened': 'Dernière ouverture {date}',
    'memorisation.no_matching_recording': 'Aucun enregistrement correspondant',
    'memorisation.no_matching_recording_desc': 'Essayez un autre nom de sourate ou numéro d\'ayah.',
    'memorisation.no_recordings_yet_desc': 'Ouvrez l\'auto-vérification, enregistrez votre récitation et sauvegardez la tentative.',
    'memorisation.no_surah_selected': 'Aucune sourate sélectionnée',
    'memorisation.onboarding.playSampleSession': 'Jouer une session d\'exemple',
    'memorisation.onboarding.postSession.kicker': 'Session d\'exemple terminée',
    'memorisation.onboarding.postSession.message': 'Masha\'Allah ! Qu\'Allah bénisse vos efforts et facilite votre parcours coranique.',
    'memorisation.onboarding.postSession.newSession': 'Commencer une nouvelle session',
    'memorisation.onboarding.postSession.repeat': 'Répéter cette session',
    'memorisation.onboarding.postSession.save': 'Enregistrer cette session',
    'memorisation.onboarding.postSession.savedToast': 'Cette session a été enregistrée avec succès.',
    'memorisation.onboarding.postSession.title': 'Masha\'Allah !',
    'memorisation.postSession.kicker': 'Session terminée',
    'memorisation.postSession.message': 'Masha\'Allah ! Qu\'Allah accepte vos efforts et vous accorde la constance.',
    'memorisation.postSession.newSession': 'Commencer une nouvelle session',
    'memorisation.postSession.repeat': 'Répéter cette session',
    'memorisation.postSession.save': 'Enregistrer cette session',
    'memorisation.postSession.savedToast': 'Cette session a été enregistrée avec succès.',
    'memorisation.postSession.title': 'Masha\'Allah !',
    'memorisation.practiceTools.advanced': 'Outils avancés',
    'memorisation.practiceTools.advancedDesc': 'Techniques pour relier les ayahs et mémoriser les mots clés.',
    'memorisation.practiceTools.beginner': 'Outils débutant',
    'memorisation.practiceTools.beginnerDesc': 'Options simples pour lire, écouter et répéter les ayahs.',
    'memorisation.reading.quranicFont': 'Police coranique',
    'memorisation.reading.selectLayout': 'Choisir une mise en page',
    'memorisation.saved_sessions_intro': 'Vos parcours de hifz, marqués avec barakah — reprenez un khatm ou une plage en cours.',
    'memorisation.selfCheckRatings.fair': 'En construction',
    'memorisation.selfCheckRatings.fairHint': 'Presque mémorisé, mais quelques lacunes — une répétition de plus.',
    'memorisation.selfCheckRecorder.aiAyahReady': 'Quand vous êtes prêt, récitez cette ayah de mémoire et laissez l\'IA guider votre révision.',
    'memorisation.selfCheckRecorder.aiListening': 'L\'IA écoute votre récitation',
    'memorisation.selfCheckRecorder.aiSessionReady': 'Quand vous êtes prêt, récitez votre plage d\'ayahs et laissez l\'IA guider votre révision.',
    'memorisation.selfCheckRecorder.assessmentHeading': 'Évaluez votre hifz',
    'memorisation.selfCheckRecorder.idle': 'Enregistrez-vous en récitant cette ayah de mémoire, puis évaluez votre rappel.',
    'memorisation.selfCheckRecorder.preparingMic': 'Préparation du microphone pour un enregistrement clair, insha\'Allah.',
    'memorisation.selfCheckRecorder.recordingActive': 'Votre microphone est actif — récitez avec tajwid, puis appuyez sur arrêter.',
    'memorisation.selfCheckRecorder.reviewDraft': 'Écoutez votre enregistrement, évaluez honnêtement, puis sauvegardez.',
    'memorisation.selfCheckRecorder.reviewHeading': 'Révisez votre récitation',
    'memorisation.selfCheckRecorder.unsupportedBrowser': 'L\'enregistrement nécessite un navigateur avec support du microphone.',
    'memorisation.self_rating_prompt': 'Dans quelle mesure avez-vous rappelé cette ayah de votre hifz ?',
    'memorisation.sessionExit.continueSession': 'Continuer cette session',
    'memorisation.sessionExit.kicker': 'Session en pause',
    'memorisation.sessionExit.repeatSession': 'Répéter la session',
    'memorisation.sessionExit.saveSession': 'Enregistrer cette session',
    'memorisation.sessionExit.startNewSession': 'Commencer une nouvelle session',
    'memorisation.start_reciting_prompt': 'Commencez à réciter',
    'memorisation.view_all_recording_library': 'Voir toute la bibliothèque',
    'memorisation.welcomeBack.continuePreviousSession': 'Continuer la session précédente',
    'memorisation.welcomeBack.kicker': 'Bon retour',
    'memorisation.welcomeBack.startNewSession': 'Commencer une nouvelle session',
    'memorisation.workspaceEmpty.continuePreviousSession': 'Continuer la session précédente',
    'memorisation.workspaceEmpty.startNewSession': 'Commencer une nouvelle session',
  },
  ar: {
    'memorisation.choose_a_recording': 'اختر تسجيلاً',
    'memorisation.choose_a_recording_desc': 'اختر تلاوة محفوظة لمراجعة حفظك.',
    'memorisation.completed_sessions': 'الجلسات المكتملة',
    'memorisation.completed_sessions_desc': 'جلسات وصلت فيها إلى نهاية نطاق الآيات. راجعها للمراجعة وتقوية الحفظ.',
    'memorisation.incomplete_sessions': 'الجلسات غير المكتملة',
    'memorisation.incomplete_sessions_desc': 'جلسات حفظ متوقفة في منتصف النطاق. تابع من حيث توقفت.',
    'memorisation.last_opened': 'آخر فتح {date}',
    'memorisation.no_matching_recording': 'لا يوجد تسجيل مطابق',
    'memorisation.no_matching_recording_desc': 'جرّب اسم سورة أو رقم آية مختلفاً.',
    'memorisation.no_recordings_yet_desc': 'افتح التحقق الذاتي، سجّل تلاوتك، واحفظ المحاولة.',
    'memorisation.no_surah_selected': 'لم تُختر سورة',
    'memorisation.onboarding.playSampleSession': 'تشغيل جلسة نموذجية',
    'memorisation.onboarding.postSession.kicker': 'اكتملت الجلسة النموذجية',
    'memorisation.onboarding.postSession.message': 'ما شاء الله! بارك الله في جهدك وسهّل عليك رحلتك مع القرآن.',
    'memorisation.onboarding.postSession.newSession': 'بدء جلسة جديدة',
    'memorisation.onboarding.postSession.repeat': 'إعادة هذه الجلسة',
    'memorisation.onboarding.postSession.save': 'حفظ هذه الجلسة',
    'memorisation.onboarding.postSession.savedToast': 'تم حفظ هذه الجلسة بنجاح.',
    'memorisation.onboarding.postSession.title': 'ما شاء الله!',
    'memorisation.postSession.kicker': 'اكتملت الجلسة',
    'memorisation.postSession.message': 'ما شاء الله! تقبل الله جهدك ووفقك للاستمرار في الحفظ.',
    'memorisation.postSession.newSession': 'بدء جلسة جديدة',
    'memorisation.postSession.repeat': 'إعادة هذه الجلسة',
    'memorisation.postSession.save': 'حفظ هذه الجلسة',
    'memorisation.postSession.savedToast': 'تم حفظ هذه الجلسة بنجاح.',
    'memorisation.postSession.title': 'ما شاء الله!',
    'memorisation.practiceTools.advanced': 'أدوات متقدمة',
    'memorisation.practiceTools.advancedDesc': 'تقنيات لربط الآيات وتذكر الكلمات المفتاحية.',
    'memorisation.practiceTools.beginner': 'أدوات للمبتدئين',
    'memorisation.practiceTools.beginnerDesc': 'خيارات بسيطة للقراءة والاستماع وتكرار الآيات.',
    'memorisation.reading.quranicFont': 'خط القرآن',
    'memorisation.reading.selectLayout': 'اختر التخطيط',
    'memorisation.saved_sessions_intro': 'رحلات حفظك المحفوظة — تابع ختمًا مكتملًا أو نطاقًا قيد التقدم.',
    'memorisation.selfCheckRatings.fair': 'ما زال قيد البناء',
    'memorisation.selfCheckRatings.fairHint': 'قريب من الحفظ لكن بفجوات — يستحق تكرارًا آخر.',
    'memorisation.selfCheckRecorder.aiAyahReady': 'عندما تكون مستعدًا، أَتِ الآية من الحفظ ودع الذكاء الاصطناعي يوجّه مراجعتك.',
    'memorisation.selfCheckRecorder.aiListening': 'الذكاء الاصطناعي يستمع لتلاوتك',
    'memorisation.selfCheckRecorder.aiSessionReady': 'عندما تكون مستعدًا، أَتِ نطاق الآيات ودع الذكاء الاصطناعي يوجّه مراجعتك.',
    'memorisation.selfCheckRecorder.assessmentHeading': 'قيّم حفظك',
    'memorisation.selfCheckRecorder.idle': 'سجّل تلاوتك لهذه الآية من الحفظ ثم قيّم مدى ثباتها في الذاكرة.',
    'memorisation.selfCheckRecorder.preparingMic': 'جارٍ تجهيز الميكروفون لتسجيل واضح، إن شاء الله.',
    'memorisation.selfCheckRecorder.recordingActive': 'الميكروفون نشط — أَتِ بالتجويد ثم اضغط إيقاف عند الانتهاء.',
    'memorisation.selfCheckRecorder.reviewDraft': 'استمع لتسجيلك، قيّم بصدق، ثم احفظ المحاولة.',
    'memorisation.selfCheckRecorder.reviewHeading': 'راجع تلاوتك',
    'memorisation.selfCheckRecorder.unsupportedBrowser': 'التسجيل يتطلب متصفحًا يدعم الميكروفون.',
    'memorisation.self_rating_prompt': 'ما مدى تذكّرك لهذه الآية من الحفظ؟',
    'memorisation.sessionExit.continueSession': 'متابعة هذه الجلسة',
    'memorisation.sessionExit.kicker': 'الجلسة متوقفة',
    'memorisation.sessionExit.repeatSession': 'إعادة الجلسة',
    'memorisation.sessionExit.saveSession': 'حفظ هذه الجلسة',
    'memorisation.sessionExit.startNewSession': 'بدء جلسة جديدة',
    'memorisation.start_reciting_prompt': 'ابدأ التلاوة',
    'memorisation.view_all_recording_library': 'عرض كل مكتبة التسجيلات',
    'memorisation.welcomeBack.continuePreviousSession': 'متابعة الجلسة السابقة',
    'memorisation.welcomeBack.kicker': 'مرحبًا بعودتك',
    'memorisation.welcomeBack.startNewSession': 'بدء جلسة جديدة',
    'memorisation.workspaceEmpty.continuePreviousSession': 'متابعة الجلسة السابقة',
    'memorisation.workspaceEmpty.startNewSession': 'بدء جلسة جديدة',
  },
  id: {
    'memorisation.choose_a_recording': 'Pilih rekaman',
    'memorisation.choose_a_recording_desc': 'Pilih tilawah tersimpan untuk meninjau hafalan Anda.',
    'memorisation.completed_sessions': 'Sesi selesai',
    'memorisation.completed_sessions_desc': 'Sesi di mana Anda mencapai akhir rentang ayat. Kunjungi kembali untuk muraja\'ah.',
    'memorisation.incomplete_sessions': 'Sesi belum selesai',
    'memorisation.incomplete_sessions_desc': 'Sesi hafalan yang dijeda. Lanjutkan tepat dari tempat Anda berhenti.',
    'memorisation.last_opened': 'Terakhir dibuka {date}',
    'memorisation.no_matching_recording': 'Tidak ada rekaman yang cocok',
    'memorisation.no_matching_recording_desc': 'Coba nama surah atau nomor ayat lain.',
    'memorisation.no_recordings_yet_desc': 'Buka Pemeriksaan Diri, rekam tilawah Anda, dan simpan percobaan.',
    'memorisation.no_surah_selected': 'Belum ada surah dipilih',
    'memorisation.onboarding.playSampleSession': 'Putar sesi contoh',
    'memorisation.onboarding.postSession.kicker': 'Sesi contoh selesai',
    'memorisation.onboarding.postSession.message': 'Masha\'Allah! Semoga Allah memberkahi usaha Anda dan memudahkan perjalanan Quran.',
    'memorisation.onboarding.postSession.newSession': 'Mulai sesi baru',
    'memorisation.onboarding.postSession.repeat': 'Ulangi sesi ini',
    'memorisation.onboarding.postSession.save': 'Simpan sesi ini',
    'memorisation.onboarding.postSession.savedToast': 'Sesi ini berhasil disimpan.',
    'memorisation.onboarding.postSession.title': 'Masha\'Allah!',
    'memorisation.postSession.kicker': 'Sesi selesai',
    'memorisation.postSession.message': 'Masha\'Allah! Semoga Allah menerima usaha Anda dan memberi ketekunan.',
    'memorisation.postSession.newSession': 'Mulai sesi baru',
    'memorisation.postSession.repeat': 'Ulangi sesi ini',
    'memorisation.postSession.save': 'Simpan sesi ini',
    'memorisation.postSession.savedToast': 'Sesi ini berhasil disimpan.',
    'memorisation.postSession.title': 'Masha\'Allah!',
    'memorisation.practiceTools.advanced': 'Alat lanjutan',
    'memorisation.practiceTools.advancedDesc': 'Teknik untuk menghubungkan ayat dan mengingat kata kunci.',
    'memorisation.practiceTools.beginner': 'Alat pemula',
    'memorisation.practiceTools.beginnerDesc': 'Opsi sederhana untuk membaca, mendengar, dan mengulang ayat.',
    'memorisation.reading.quranicFont': 'Font Quran',
    'memorisation.reading.selectLayout': 'Pilih tata letak',
    'memorisation.saved_sessions_intro': 'Perjalanan hafiz Anda — lanjutkan khatam selesai atau rentang yang sedang berjalan.',
    'memorisation.selfCheckRatings.fair': 'Masih dibangun',
    'memorisation.selfCheckRatings.fairHint': 'Hampir hafal tetapi masih ada celah — ulangi sekali lagi.',
    'memorisation.selfCheckRecorder.aiAyahReady': 'Saat siap, tilawah ayat ini dari hafalan dan biarkan AI memandu tinjauan Anda.',
    'memorisation.selfCheckRecorder.aiListening': 'AI mendengarkan tilawah Anda',
    'memorisation.selfCheckRecorder.aiSessionReady': 'Saat siap, tilawah rentang ayat Anda dan biarkan AI memandu tinjauan.',
    'memorisation.selfCheckRecorder.assessmentHeading': 'Nilai hafalan Anda',
    'memorisation.selfCheckRecorder.idle': 'Rekam diri Anda menilawah ayat ini dari hafalan, lalu nilai ingatan Anda.',
    'memorisation.selfCheckRecorder.preparingMic': 'Menyiapkan mikrofon untuk rekaman yang jelas, insya Allah.',
    'memorisation.selfCheckRecorder.recordingActive': 'Mikrofon aktif — tilawah dengan tajwid, lalu tekan berhenti.',
    'memorisation.selfCheckRecorder.reviewDraft': 'Dengarkan rekaman Anda, nilai dengan jujur, lalu simpan percobaan.',
    'memorisation.selfCheckRecorder.reviewHeading': 'Tinjau tilawah Anda',
    'memorisation.selfCheckRecorder.unsupportedBrowser': 'Rekaman membutuhkan browser dengan dukungan mikrofon.',
    'memorisation.self_rating_prompt': 'Seberapa baik Anda mengingat ayat ini dari hafalan?',
    'memorisation.sessionExit.continueSession': 'Lanjutkan sesi ini',
    'memorisation.sessionExit.kicker': 'Sesi dijeda',
    'memorisation.sessionExit.repeatSession': 'Ulangi sesi',
    'memorisation.sessionExit.saveSession': 'Simpan sesi ini',
    'memorisation.sessionExit.startNewSession': 'Mulai sesi baru',
    'memorisation.start_reciting_prompt': 'Mulai tilawah',
    'memorisation.view_all_recording_library': 'Lihat semua perpustakaan rekaman',
    'memorisation.welcomeBack.continuePreviousSession': 'Lanjutkan sesi sebelumnya',
    'memorisation.welcomeBack.kicker': 'Selamat datang kembali',
    'memorisation.welcomeBack.startNewSession': 'Mulai sesi baru',
    'memorisation.workspaceEmpty.continuePreviousSession': 'Lanjutkan sesi sebelumnya',
    'memorisation.workspaceEmpty.startNewSession': 'Mulai sesi baru',
  },
  tr: {
    'memorisation.choose_a_recording': 'Kayıt seç',
    'memorisation.choose_a_recording_desc': 'Hıfznızı gözden geçirmek için kayıtlı bir tilavet seçin.',
    'memorisation.completed_sessions': 'Tamamlanan oturumlar',
    'memorisation.completed_sessions_desc': 'Ayet aralığının sonuna ulaştığınız oturumlar. Muraja\'ah için tekrar ziyaret edin.',
    'memorisation.incomplete_sessions': 'Tamamlanmayan oturumlar',
    'memorisation.incomplete_sessions_desc': 'Yarıda kalan hıfz oturumları. Kaldığınız yerden devam edin.',
    'memorisation.last_opened': 'Son açılış {date}',
    'memorisation.no_matching_recording': 'Eşleşen kayıt yok',
    'memorisation.no_matching_recording_desc': 'Farklı bir sure adı veya ayet numarası deneyin.',
    'memorisation.no_recordings_yet_desc': 'Öz kontrolü açın, tilavetinizi kaydedin ve denemeyi saklayın.',
    'memorisation.no_surah_selected': 'Sure seçilmedi',
    'memorisation.onboarding.playSampleSession': 'Örnek oturumu oynat',
    'memorisation.onboarding.postSession.kicker': 'Örnek oturum tamamlandı',
    'memorisation.onboarding.postSession.message': 'Maşaallah! Allah çabanızı bereketlendirsin ve Kuran yolculuğunuzu kolaylaştırsın.',
    'memorisation.onboarding.postSession.newSession': 'Yeni oturum başlat',
    'memorisation.onboarding.postSession.repeat': 'Bu oturumu tekrarla',
    'memorisation.onboarding.postSession.save': 'Bu oturumu kaydet',
    'memorisation.onboarding.postSession.savedToast': 'Bu oturum başarıyla kaydedildi.',
    'memorisation.onboarding.postSession.title': 'Maşaallah!',
    'memorisation.postSession.kicker': 'Oturum tamamlandı',
    'memorisation.postSession.message': 'Maşaallah! Allah çabanızı kabul etsin ve istikrar versin.',
    'memorisation.postSession.newSession': 'Yeni oturum başlat',
    'memorisation.postSession.repeat': 'Bu oturumu tekrarla',
    'memorisation.postSession.save': 'Bu oturumu kaydet',
    'memorisation.postSession.savedToast': 'Bu oturum başarıyla kaydedildi.',
    'memorisation.postSession.title': 'Maşaallah!',
    'memorisation.practiceTools.advanced': 'Gelişmiş araçlar',
    'memorisation.practiceTools.advancedDesc': 'Ayetleri bağlama ve anahtar kelimeleri hatırlama teknikleri.',
    'memorisation.practiceTools.beginner': 'Başlangıç araçları',
    'memorisation.practiceTools.beginnerDesc': 'Ayetleri okuma, dinleme ve tekrar için basit seçenekler.',
    'memorisation.reading.quranicFont': 'Kuran yazı tipi',
    'memorisation.reading.selectLayout': 'Düzen seç',
    'memorisation.saved_sessions_intro': 'Hıfz yolculuklarınız — tamamlanan hatim veya devam eden aralığa dönün.',
    'memorisation.selfCheckRatings.fair': 'Hâlâ gelişiyor',
    'memorisation.selfCheckRatings.fairHint': 'Çoğunlukla hazır ama boşluklar var — bir tekrar daha değer.',
    'memorisation.selfCheckRecorder.aiAyahReady': 'Hazır olduğunuzda bu ayeti hıfızdan tilavet edin ve AI incelemenizi yönlendirsin.',
    'memorisation.selfCheckRecorder.aiListening': 'AI tilavetinizi dinliyor',
    'memorisation.selfCheckRecorder.aiSessionReady': 'Hazır olduğunuzda ayet aralığınızı tilavet edin ve AI incelemenizi yönlendirsin.',
    'memorisation.selfCheckRecorder.assessmentHeading': 'Hıfznızı değerlendirin',
    'memorisation.selfCheckRecorder.idle': 'Bu ayeti hıfızdan tilavet ederek kaydedin, sonra hatırlamayı değerlendirin.',
    'memorisation.selfCheckRecorder.preparingMic': 'Net bir kayıt için mikrofon hazırlanıyor, inşaallah.',
    'memorisation.selfCheckRecorder.recordingActive': 'Mikrofonunuz açık — tecvidle tilavet edin, bitince durdurun.',
    'memorisation.selfCheckRecorder.reviewDraft': 'Kaydınızı dinleyin, dürüstçe değerlendirin ve kaydedin.',
    'memorisation.selfCheckRecorder.reviewHeading': 'Tilavetinizi gözden geçirin',
    'memorisation.selfCheckRecorder.unsupportedBrowser': 'Kayıt için mikrofon destekli bir tarayıcı gerekir.',
    'memorisation.self_rating_prompt': 'Bu ayeti hıfızdan ne kadar iyi hatırladınız?',
    'memorisation.sessionExit.continueSession': 'Bu oturuma devam et',
    'memorisation.sessionExit.kicker': 'Oturum duraklatıldı',
    'memorisation.sessionExit.repeatSession': 'Oturumu tekrarla',
    'memorisation.sessionExit.saveSession': 'Bu oturumu kaydet',
    'memorisation.sessionExit.startNewSession': 'Yeni oturum başlat',
    'memorisation.start_reciting_prompt': 'Tilavete başla',
    'memorisation.view_all_recording_library': 'Tüm kayıt kütüphanesini gör',
    'memorisation.welcomeBack.continuePreviousSession': 'Önceki oturuma devam et',
    'memorisation.welcomeBack.kicker': 'Tekrar hoş geldiniz',
    'memorisation.welcomeBack.startNewSession': 'Yeni oturum başlat',
    'memorisation.workspaceEmpty.continuePreviousSession': 'Önceki oturuma devam et',
    'memorisation.workspaceEmpty.startNewSession': 'Yeni oturum başlat',
  },
  es: {
    'memorisation.choose_a_recording': 'Elegir una grabación',
    'memorisation.choose_a_recording_desc': 'Selecciona una recitación guardada para revisar tu memorización.',
    'memorisation.completed_sessions': 'Sesiones completadas',
    'memorisation.completed_sessions_desc': 'Sesiones en las que llegaste al final del rango de ayahs. Repasa para muraja\'ah.',
    'memorisation.incomplete_sessions': 'Sesiones incompletas',
    'memorisation.incomplete_sessions_desc': 'Sesiones de hifz pausadas. Continúa exactamente donde lo dejaste.',
    'memorisation.last_opened': 'Última apertura {date}',
    'memorisation.no_matching_recording': 'Sin grabación coincidente',
    'memorisation.no_matching_recording_desc': 'Prueba otro nombre de sura o número de ayah.',
    'memorisation.no_recordings_yet_desc': 'Abre la autoevaluación, graba tu recitación y guarda el intento.',
    'memorisation.no_surah_selected': 'Ninguna sura seleccionada',
    'memorisation.onboarding.playSampleSession': 'Reproducir sesión de ejemplo',
    'memorisation.onboarding.postSession.kicker': 'Sesión de ejemplo completada',
    'memorisation.onboarding.postSession.message': '¡Masha\'Allah! Que Allah bendiga tus esfuerzos y facilite tu camino con el Corán.',
    'memorisation.onboarding.postSession.newSession': 'Iniciar nueva sesión',
    'memorisation.onboarding.postSession.repeat': 'Repetir esta sesión',
    'memorisation.onboarding.postSession.save': 'Guardar esta sesión',
    'memorisation.onboarding.postSession.savedToast': 'Esta sesión se guardó correctamente.',
    'memorisation.onboarding.postSession.title': '¡Masha\'Allah!',
    'memorisation.postSession.kicker': 'Sesión completada',
    'memorisation.postSession.message': '¡Masha\'Allah! Que Allah acepte tus esfuerzos y te conceda constancia.',
    'memorisation.postSession.newSession': 'Iniciar nueva sesión',
    'memorisation.postSession.repeat': 'Repetir esta sesión',
    'memorisation.postSession.save': 'Guardar esta sesión',
    'memorisation.postSession.savedToast': 'Esta sesión se guardó correctamente.',
    'memorisation.postSession.title': '¡Masha\'Allah!',
    'memorisation.practiceTools.advanced': 'Herramientas avanzadas',
    'memorisation.practiceTools.advancedDesc': 'Técnicas para enlazar ayahs y recordar palabras clave.',
    'memorisation.practiceTools.beginner': 'Herramientas para principiantes',
    'memorisation.practiceTools.beginnerDesc': 'Opciones simples para leer, escuchar y repetir ayahs.',
    'memorisation.reading.quranicFont': 'Fuente coránica',
    'memorisation.reading.selectLayout': 'Seleccionar diseño',
    'memorisation.saved_sessions_intro': 'Tus viajes de hifz — retoma un khatm completado o un rango en progreso.',
    'memorisation.selfCheckRatings.fair': 'Aún en construcción',
    'memorisation.selfCheckRatings.fairHint': 'Casi memorizado, pero con lagunas — merece otra repetición.',
    'memorisation.selfCheckRecorder.aiAyahReady': 'Cuando estés listo, recita este ayah de memoria y deja que la IA guíe tu revisión.',
    'memorisation.selfCheckRecorder.aiListening': 'La IA está escuchando tu recitación',
    'memorisation.selfCheckRecorder.aiSessionReady': 'Cuando estés listo, recita tu rango de ayahs y deja que la IA guíe tu revisión.',
    'memorisation.selfCheckRecorder.assessmentHeading': 'Evalúa tu hifz',
    'memorisation.selfCheckRecorder.idle': 'Grábate recitando este ayah de memoria y evalúa tu recuerdo.',
    'memorisation.selfCheckRecorder.preparingMic': 'Preparando el micrófono para una grabación clara, insha\'Allah.',
    'memorisation.selfCheckRecorder.recordingActive': 'Tu micrófono está activo — recita con tajwid y pulsa detener al terminar.',
    'memorisation.selfCheckRecorder.reviewDraft': 'Escucha tu grabación, evalúa con honestidad y guarda el intento.',
    'memorisation.selfCheckRecorder.reviewHeading': 'Revisa tu recitación',
    'memorisation.selfCheckRecorder.unsupportedBrowser': 'La grabación requiere un navegador con soporte de micrófono.',
    'memorisation.self_rating_prompt': '¿Qué tan bien recordaste este ayah de tu hifz?',
    'memorisation.sessionExit.continueSession': 'Continuar esta sesión',
    'memorisation.sessionExit.kicker': 'Sesión en pausa',
    'memorisation.sessionExit.repeatSession': 'Repetir sesión',
    'memorisation.sessionExit.saveSession': 'Guardar esta sesión',
    'memorisation.sessionExit.startNewSession': 'Iniciar nueva sesión',
    'memorisation.start_reciting_prompt': 'Empieza a recitar',
    'memorisation.view_all_recording_library': 'Ver toda la biblioteca',
    'memorisation.welcomeBack.continuePreviousSession': 'Continuar sesión anterior',
    'memorisation.welcomeBack.kicker': 'Bienvenido de nuevo',
    'memorisation.welcomeBack.startNewSession': 'Iniciar nueva sesión',
    'memorisation.workspaceEmpty.continuePreviousSession': 'Continuar sesión anterior',
    'memorisation.workspaceEmpty.startNewSession': 'Iniciar nueva sesión',
    'common.loading': 'Cargando…',
    'common.on': 'Activado',
    'common.off': 'Desactivado',
    'common.reset': 'Restablecer',
    'common.close': 'Cerrar',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.continue': 'Continuar',
    'common.back': 'Atrás',
    'common.download': 'Descargar',
    'common.tajweed': 'Tajwid',
    'nav.home': 'Inicio',
    'nav.memorisation': 'Memorización',
    'sessionSetup.tajweed': 'Tajwid',
    'sessionSetup.wordAudio': 'Audio por palabra',
    'sessionSetup.wordAudioDesc': 'Resalta cada palabra mientras se reproduce el audio del ayah.',
    'homepage.hero.badge': 'Memorización del Corán con IA',
  },
  ur: {
    'common.loading': 'لوڈ ہو رہا ہے…',
    'common.on': 'آن',
    'common.off': 'آف',
    'common.reset': 'ری سیٹ',
    'common.close': 'بند کریں',
    'common.save': 'محفوظ کریں',
    'common.cancel': 'منسوخ',
    'common.continue': 'جاری رکھیں',
    'common.back': 'واپس',
    'common.download': 'ڈاؤن لوڈ',
    'common.tajweed': 'تجوید',
    'nav.home': 'ہوم',
    'nav.memorisation': 'حفظ',
    'sessionSetup.tajweed': 'تجوید',
    'sessionSetup.wordAudio': 'لفظی آڈیو',
    'sessionSetup.wordAudioDesc': 'آیت کی آڈیو چلتے ہوئے ہر لفظ کو نمایاں کریں۔',
    'homepage.hero.badge': 'اے آئی کے ساتھ قرآن حفظ',
    'memorisation.choose_a_recording': 'ریکارڈنگ منتخب کریں',
    'memorisation.start_reciting_prompt': 'تلاوت شروع کریں',
    'memorisation.view_all_recording_library': 'تمام ریکارڈنگ لائبریری دیکھیں',
    'memorisation.welcomeBack.kicker': 'خوش آمدید',
    'memorisation.sessionExit.kicker': 'سیشن روکا گیا',
    'memorisation.practiceTools.beginner': 'ابتدائی ٹولز',
    'memorisation.practiceTools.advanced': 'اعلیٰ ٹولز',
    'memorisation.reading.quranicFont': 'قرآنی فونٹ',
    'memorisation.reading.selectLayout': 'لے آؤٹ منتخب کریں',
    'memorisation.selfCheckRecorder.aiListening': 'اے آئی آپ کی تلاوت سن رہا ہے',
    'memorisation.selfCheckRecorder.recordingActive': 'مائیکروفون فعال ہے — تجوید کے ساتھ تلاوت کریں، پھر روک دبائیں۔',
  },
}

/** Keep Blade shell labels aligned with Vue JSON nav/common keys. */
const SHELL_KEY_MAP = {
  home: 'common.home',
  memorisation: 'common.memorisation',
  login: 'common.login',
  register: 'common.register',
  logout: 'common.logout',
  profile: 'nav.profile',
  subscription: 'nav.subscription',
  settings: 'nav.settings',
}

/** Translations for newly added memorisation i18n keys (player, modals, progress, AI). */
const COVERAGE_PATCH = {
  fr: {
    'memorisation.onboardingLabel': 'Intégration',
    'memorisation.player.previous': 'Précédent',
    'memorisation.player.next': 'Suivant',
    'memorisation.player.previousAyah': 'Ayah précédente',
    'memorisation.player.nextAyah': 'Ayah suivante',
    'memorisation.player.playAudio': 'Lire l\'audio',
    'memorisation.player.pauseAudio': 'Mettre en pause',
    'memorisation.player.playPause': 'Lecture/Pause',
    'memorisation.player.remaining': '{eta} restant',
    'memorisation.player.audioPlayer': 'Lecteur audio',
    'memorisation.player.audioProgress': 'Progression audio',
    'memorisation.player.miniPlayer': 'Mini lecteur',
    'memorisation.player.fullPlayer': 'Lecteur complet',
    'memorisation.player.closePlayer': 'Fermer le lecteur',
    'memorisation.player.switchMini': 'Passer au mini lecteur',
    'memorisation.player.switchFull': 'Passer au lecteur complet',
    'memorisation.player.closeAudioPlayer': 'Fermer le lecteur audio',
    'memorisation.player.quranFallback': 'Coran',
    'memorisation.confirmModals.defaultTitle': 'Confirmer l\'action',
    'memorisation.confirmModals.confirm': 'Confirmer',
    'memorisation.confirmModals.cancel': 'Annuler',
    'memorisation.confirmModals.delete': 'Supprimer',
    'memorisation.confirmModals.keep': 'Conserver',
    'memorisation.confirmModals.discard': 'Abandonner',
    'memorisation.confirmModals.remove': 'Retirer',
    'memorisation.confirmModals.reset': 'Réinitialiser',
    'memorisation.confirmModals.deleteSession.title': 'Supprimer la session enregistrée ?',
    'memorisation.confirmModals.deleteSession.confirm': 'Supprimer la session',
    'memorisation.confirmModals.deleteSession.cancel': 'Conserver la session',
    'memorisation.confirmModals.deleteRecording.title': 'Supprimer l\'enregistrement ?',
    'memorisation.confirmModals.deleteRecording.titleReciteCheck': 'Supprimer Recite Check ?',
    'memorisation.renameRecording.title': 'Renommer l\'enregistrement',
    'memorisation.renameRecording.saveName': 'Enregistrer le nom',
    'memorisation.talqinMode.title': 'Mode talqin',
    'memorisation.workspaceProgress.complete': 'Terminé',
    'memorisation.workspaceProgress.remaining': 'Restant',
    'memorisation.workspaceProgress.readyToComplete': 'Prêt à terminer',
    'memorisation.plannerUi.todayTarget': 'Objectif du jour',
    'memorisation.plannerUi.tomorrow': 'Demain',
    'memorisation.meta.previousSession': 'Session précédente',
    'memorisation.a11y.closeHelpLearning': 'Fermer l\'aide et l\'apprentissage',
    'memorisation.a11y.helpTopics': 'Sujets d\'aide',
    'memorisation.a11y.tajweedLabel': 'Tajweed',
  },
  ar: {
    'memorisation.onboardingLabel': 'البدء',
    'memorisation.player.previous': 'السابق',
    'memorisation.player.next': 'التالي',
    'memorisation.player.previousAyah': 'الآية السابقة',
    'memorisation.player.nextAyah': 'الآية التالية',
    'memorisation.player.playAudio': 'تشغيل الصوت',
    'memorisation.player.pauseAudio': 'إيقاف الصوت',
    'memorisation.player.playPause': 'تشغيل/إيقاف',
    'memorisation.player.remaining': '{eta} متبقٍ',
    'memorisation.player.audioPlayer': 'مشغّل الصوت',
    'memorisation.player.audioProgress': 'تقدّم الصوت',
    'memorisation.player.miniPlayer': 'مشغّل مصغّر',
    'memorisation.player.fullPlayer': 'مشغّل كامل',
    'memorisation.player.closePlayer': 'إغلاق المشغّل',
    'memorisation.player.quranFallback': 'القرآن',
    'memorisation.confirmModals.defaultTitle': 'تأكيد الإجراء',
    'memorisation.confirmModals.confirm': 'تأكيد',
    'memorisation.confirmModals.cancel': 'إلغاء',
    'memorisation.confirmModals.delete': 'حذف',
    'memorisation.confirmModals.keep': 'إبقاء',
    'memorisation.confirmModals.discard': 'تجاهل',
    'memorisation.confirmModals.remove': 'إزالة',
    'memorisation.confirmModals.reset': 'إعادة ضبط',
    'memorisation.confirmModals.deleteSession.title': 'حذف الجلسة المحفوظة؟',
    'memorisation.confirmModals.deleteSession.confirm': 'حذف الجلسة',
    'memorisation.confirmModals.deleteSession.cancel': 'إبقاء الجلسة',
    'memorisation.renameRecording.title': 'إعادة تسمية التسجيل',
    'memorisation.renameRecording.saveName': 'حفظ الاسم',
    'memorisation.talqinMode.title': 'وضع التلقين',
    'memorisation.workspaceProgress.complete': 'مكتمل',
    'memorisation.workspaceProgress.remaining': 'متبقٍ',
    'memorisation.workspaceProgress.readyToComplete': 'جاهز للإكمال',
    'memorisation.plannerUi.todayTarget': 'هدف اليوم',
    'memorisation.plannerUi.tomorrow': 'غدًا',
    'memorisation.meta.previousSession': 'الجلسة السابقة',
    'memorisation.a11y.closeHelpLearning': 'إغلاق المساعدة والتعلّم',
    'memorisation.a11y.helpTopics': 'مواضيع المساعدة',
    'memorisation.a11y.tajweedLabel': 'التجويد',
  },
  id: {
    'memorisation.onboardingLabel': 'Panduan awal',
    'memorisation.player.previous': 'Sebelumnya',
    'memorisation.player.next': 'Berikutnya',
    'memorisation.player.previousAyah': 'Ayah sebelumnya',
    'memorisation.player.nextAyah': 'Ayah berikutnya',
    'memorisation.player.playAudio': 'Putar audio',
    'memorisation.player.pauseAudio': 'Jeda audio',
    'memorisation.player.playPause': 'Putar/Jeda',
    'memorisation.player.remaining': '{eta} tersisa',
    'memorisation.player.audioPlayer': 'Pemutar audio',
    'memorisation.player.quranFallback': 'Al-Quran',
    'memorisation.confirmModals.confirm': 'Konfirmasi',
    'memorisation.confirmModals.cancel': 'Batal',
    'memorisation.confirmModals.delete': 'Hapus',
    'memorisation.confirmModals.keep': 'Simpan',
    'memorisation.renameRecording.title': 'Ubah nama rekaman',
    'memorisation.talqinMode.title': 'Mode talqin',
    'memorisation.workspaceProgress.complete': 'Selesai',
    'memorisation.workspaceProgress.remaining': 'Tersisa',
    'memorisation.workspaceProgress.readyToComplete': 'Siap diselesaikan',
    'memorisation.plannerUi.todayTarget': 'Target hari ini',
    'memorisation.meta.previousSession': 'Sesi sebelumnya',
  },
  tr: {
    'memorisation.onboardingLabel': 'Başlangıç',
    'memorisation.player.previous': 'Önceki',
    'memorisation.player.next': 'Sonraki',
    'memorisation.player.previousAyah': 'Önceki ayet',
    'memorisation.player.nextAyah': 'Sonraki ayet',
    'memorisation.player.playAudio': 'Sesi oynat',
    'memorisation.player.pauseAudio': 'Sesi duraklat',
    'memorisation.player.playPause': 'Oynat/Duraklat',
    'memorisation.player.remaining': '{eta} kaldı',
    'memorisation.player.audioPlayer': 'Ses oynatıcı',
    'memorisation.player.quranFallback': 'Kur\'an',
    'memorisation.confirmModals.confirm': 'Onayla',
    'memorisation.confirmModals.cancel': 'İptal',
    'memorisation.confirmModals.delete': 'Sil',
    'memorisation.confirmModals.keep': 'Koru',
    'memorisation.renameRecording.title': 'Kaydı yeniden adlandır',
    'memorisation.talqinMode.title': 'Talqin modu',
    'memorisation.workspaceProgress.complete': 'Tamamlandı',
    'memorisation.workspaceProgress.remaining': 'Kalan',
    'memorisation.workspaceProgress.readyToComplete': 'Tamamlamaya hazır',
    'memorisation.plannerUi.todayTarget': 'Bugünün hedefi',
    'memorisation.meta.previousSession': 'Önceki oturum',
  },
}

function mergePatches(...patches) {
  const merged = {}
  for (const patch of patches) {
    if (!patch) continue
    Object.assign(merged, patch)
  }
  return merged
}

function syncShellLabels() {
  const locales = ['en', 'ar', 'fr', 'id', 'tr', 'es', 'ur']
  for (const locale of locales) {
    const jsonFile = path.join(LOCALES_DIR, `${locale}.json`)
    if (!fs.existsSync(jsonFile)) continue
    const json = JSON.parse(fs.readFileSync(jsonFile, 'utf8'))
    const phpFile = path.resolve(`lang/${locale}/ui.php`)
    if (!fs.existsSync(phpFile)) continue
    let content = fs.readFileSync(phpFile, 'utf8')
    let updated = 0
    for (const [phpKey, jsonKey] of Object.entries(SHELL_KEY_MAP)) {
      const value = getAt(json, jsonKey)
      if (typeof value !== 'string' || !value) continue
      const escaped = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
      const re = new RegExp(`('${phpKey}'\\s*=>\\s*)'(?:\\\\'|[^'])*'`, 'm')
      if (re.test(content)) {
        content = content.replace(re, `$1'${escaped}'`)
        updated += 1
      }
    }
    if (updated) fs.writeFileSync(phpFile, content)
    console.log(`shell ${locale}: synced ${updated} ui.php keys from JSON`)
  }
}

function applyPatch(localeData, patch) {
  if (!patch) return localeData
  for (const [keyPath, value] of Object.entries(patch)) {
    setAt(localeData, keyPath, value)
  }
  return localeData
}

function syncLocale(locale, { baseClone = null, patch = null } = {}) {
  const file = path.join(LOCALES_DIR, `${locale}.json`)
  let data = baseClone
    ? JSON.parse(JSON.stringify(baseClone))
    : JSON.parse(fs.readFileSync(file, 'utf8'))
  deepMergeMissing(data, en)
  applyPatch(data, patch)
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
  const keys = flatten(data)
  const missing = flatten(en).filter(k => !keys.includes(k))
  console.log(`${locale}: ${keys.length} keys, missing ${missing.length}`)
}

// Existing locales
for (const locale of ['fr', 'ar', 'id', 'tr']) {
  syncLocale(locale, { patch: mergePatches(MEMORISATION_PATCH[locale], COVERAGE_PATCH[locale]) })
}

// New locales: es from en, ur from ar (RTL-friendly baseline)
syncLocale('es', { baseClone: en, patch: mergePatches(MEMORISATION_PATCH.es, COVERAGE_PATCH.fr) })
syncLocale('ur', { baseClone: JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'ar.json'), 'utf8')), patch: { ...MEMORISATION_PATCH.ar, ...MEMORISATION_PATCH.ur, ...COVERAGE_PATCH.ar } })

syncShellLabels()

console.log('Locale sync complete.')
