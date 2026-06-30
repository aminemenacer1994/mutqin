/**
 * Build resources/js/locales/{en,fr,ar}.json from inline trilingual source.
 * Usage: node scripts/build-locale-json.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { applyBulkSets } from './.i18n-bulk-sets.mjs'

const outDir = path.resolve('resources/js/locales')

/** @type {Record<string, Record<string, unknown>>} */
const packs = { en: {}, fr: {}, ar: {} }

function set(pathKeys, en, fr, ar) {
  for (const [locale, val] of [['en', en], ['fr', fr], ['ar', ar]]) {
    let cur = packs[locale]
    const parts = pathKeys.split('.')
    for (let i = 0; i < parts.length - 1; i++) {
      cur[parts[i]] = cur[parts[i]] || {}
      cur = cur[parts[i]]
    }
    cur[parts[parts.length - 1]] = val
  }
}

// --- common (existing + nav) ---
set('common.on', 'On', 'Activé', 'تشغيل')
set('common.off', 'Off', 'Désactivé', 'إيقاف')
set('common.reset', 'Reset', 'Réinitialiser', 'إعادة ضبط')
set('common.startSession', 'Start Session', 'Démarrer la session', 'بدء الجلسة')
set('common.pause', 'Pause', 'Pause', 'إيقاف مؤقت')
set('common.settings', 'Settings', 'Paramètres', 'الإعدادات')
set('common.controls', 'Controls', 'Contrôles', 'عناصر التحكم')
set('common.language', 'Language', 'Langue', 'اللغة')
set('common.login', 'Login', 'Connexion', 'تسجيل الدخول')
set('common.register', 'Register', 'Inscription', 'إنشاء حساب')
set('common.logout', 'Logout', 'Déconnexion', 'تسجيل الخروج')
set('common.loading', 'Loading...', 'Chargement...', 'جاري التحميل...')
set('common.cancel', 'Cancel', 'Annuler', 'إلغاء')
set('common.save', 'Save', 'Enregistrer', 'حفظ')
set('common.close', 'Close', 'Fermer', 'إغلاق')
set('common.yes', 'Yes', 'Oui', 'نعم')
set('common.no', 'No', 'Non', 'لا')
set('common.home', 'Home', 'Accueil', 'الرئيسية')
set('common.memorisation', 'Memorisation', 'Mémorisation', 'الحفظ')

// --- nav ---
set('nav.home', 'Home', 'Accueil', 'الرئيسية')
set('nav.memorisation', 'Memorisation', 'Mémorisation', 'الحفظ')
set('nav.profile', 'Profile', 'Profil', 'الملف الشخصي')
set('nav.subscription', 'Subscription', 'Abonnement', 'الاشتراك')
set('nav.settings', 'Settings', 'Paramètres', 'الإعدادات')

// --- session (existing keys) ---
set('resume.kicker', 'Smart Resume', 'Reprise intelligente', 'استئناف ذكي')
set('resume.title', 'Pick up exactly where you left off', 'Reprenez exactement où vous vous êtes arrêté', 'تابع من حيث توقفت بالضبط')
set('resume.resumeNow', 'Resume Now', 'Reprendre maintenant', 'استئناف الآن')
set('sessionStatus.completed', 'Session completed', 'Session terminée', 'اكتملت الجلسة')
set('sessionStatus.active', 'Active session', 'Session active', 'جلسة نشطة')
set('sessionStatus.ready', 'Session ready', 'Session prête', 'الجلسة جاهزة')
set('sessionStatus.progress', '{current} of {total} ayahs · {percent}% complete', '{current} sur {total} ayahs · {percent}% terminé', '{current} من {total} آية · {percent}% مكتمل')
set('sessionStatus.left', '{eta} left', '{eta} restant', 'متبقٍ {eta}')
set('sessionStatus.end', 'End Session', 'Terminer la session', 'إنهاء الجلسة')
set('recordings.viewAll', 'View All Recordings', 'Voir tous les enregistrements', 'عرض كل التسجيلات')
set('shortcuts.title', 'Keyboard Shortcuts', 'Raccourcis clavier', 'اختصارات لوحة المفاتيح')
set('shortcuts.navigation', 'Navigation', 'Navigation', 'التنقل')

set('home.startKicker', 'Start a new session', 'Démarrer une nouvelle session', 'بدء جلسة جديدة')
set('home.startTitle', 'Choose a surah, set your range, then practise.', 'Choisissez une sourate, définissez votre plage, puis pratiquez.', 'اختر سورة، حدد النطاق، ثم تدرّب.')
set('home.selectSurah', 'Select surah', 'Choisir une sourate', 'اختر السورة')
set('home.pickRange', 'Pick range', 'Choisir la plage', 'اختر النطاق')
set('home.setRepeats', 'Set repeats', 'Définir les répétitions', 'حدد التكرار')
set('home.openControls', 'Open Session Controls', 'Ouvrir les contrôles de session', 'فتح عناصر تحكم الجلسة')
set('home.controlsHint', 'You can tweak audio, focus tools, and saved sessions any time.', 'Ajustez l\'audio, les outils de focus et les sessions enregistrées à tout moment.', 'يمكنك تعديل الصوت وأدوات التركيز والجلسات المحفوظة في أي وقت.')
set('home.guestKicker', 'Calm Quran memorisation', 'Hifz du Coran en calme', 'حفظ قرآن بهدوء')
set('home.guestTitle', 'Memorise with a quieter, more deliberate session flow.', 'Mémorisez avec un flux de session plus calme et réfléchi.', 'احفظ بجلسة أكثر هدوءاً وتركيزاً.')
set('home.guestSubtitle', 'Build each session around a small ayah range, steady repetition, and clear recall.', 'Construisez chaque session autour d\'une petite plage d\'ayahs, d\'une répétition régulière et d\'un rappel clair.', 'ابنِ كل جلسة حول نطاق آيات صغير وتكرار ثابت واستذكار واضح.')
set('home.guestSupport', 'Mutqin keeps the Quran central while playback, progress, and saved sessions stay quietly organised around it.', 'Mutqin garde le Coran au centre tandis que la lecture, la progression et les sessions restent organisées.', 'متقن يبقي القرآن في المركز بينما تبقى التشغيل والتقدم والجلسات منظمة حوله.')
set('home.guestNote', 'Login keeps your sessions, insights, and exact memorisation position in sync.', 'La connexion synchronise vos sessions, insights et position de mémorisation.', 'تسجيل الدخول يزامن جلساتك ورؤاك وموضع حفظك.')

// sessionSetup (existing)
const sessionSetupKeys = [
  ['title', 'Session Setup', 'Configuration de session', 'إعداد الجلسة'],
  ['subtitle', 'Choose what you memorise', 'Choisissez ce que vous mémorisez', 'اختر ما تحفظ'],
  ['defaults', 'Defaults', 'Par défaut', 'الافتراضي'],
  ['chooseSurah', 'Choose a surah...', 'Choisissez une sourate...', 'اختر سورة...'],
  ['surahHint', 'Pick the surah you want to work on.', 'Choisissez la sourate sur laquelle travailler.', 'اختر السورة التي تريد العمل عليها.'],
  ['noAudioPlayed', 'No ayah audio played yet for this session.', 'Aucun audio d\'ayah joué pour cette session.', 'لم يُشغَّل صوت آية بعد في هذه الجلسة.'],
  ['to', 'to', 'à', 'إلى'],
  ['rangeHint', 'Keep ranges small for focused memorisation.', 'Gardez des plages courtes pour un hifz ciblé.', 'اجعل النطاقات صغيرة لحفظ مركّز.'],
  ['reciterHint', 'Changes the audio voice for the session.', 'Change la voix audio de la session.', 'يغيّر صوت القارئ للجلسة.'],
  ['repeatHint', 'Repeat each verse {count} time(s) before moving on.', 'Répétez chaque verset {count} fois avant de continuer.', 'كرّر كل آية {count} مرة/مرات قبل المتابعة.'],
  ['surah', 'Surah', 'Sourate', 'السورة'],
  ['ayahRange', 'Ayah range', 'Plage d\'ayahs', 'نطاق الآيات'],
  ['reciter', 'Reciter', 'Récitateur', 'القارئ'],
  ['repetitions', 'Repetitions', 'Répétitions', 'التكرار'],
  ['display', 'Display', 'Affichage', 'العرض'],
  ['displaySub', 'Customize how the Quran appears', 'Personnalisez l\'apparence du Coran', 'خصّص طريقة ظهور القرآن'],
  ['readingAids', 'Reading Aids', 'Aides de lecture', 'مساعدات القراءة'],
  ['readingAidsSub', 'Translations and word helpers', 'Traductions et aides mot par mot', 'الترجمات ومساعدات الكلمات'],
  ['tajweed', 'Tajweed', 'Tajwid', 'التجويد'],
  ['tajweedDesc', 'Recitation color rules (Idgham, Ikhfa, Madd, etc.)', 'Règles de couleur de récitation (Idgham, Ikhfa, Madd, etc.)', 'قواعد ألوان التلاوة (إدغام، إخفاء، مد، إلخ)'],
  ['fontSize', 'Font size', 'Taille de police', 'حجم الخط'],
  ['fontSizeDesc', 'Adjust the Arabic text size for better readability', 'Ajustez la taille du texte arabe', 'اضبط حجم النص العربي لقراءة أفضل'],
  ['translation', 'Translation', 'Traduction', 'الترجمة'],
  ['translationDesc', 'English meaning of each verse', 'Sens anglais de chaque verset', 'معنى كل آية بالإنجليزية'],
  ['transliteration', 'Transliteration', 'Translittération', 'النسخ الصوتي'],
  ['transliterationDesc', 'Latin script pronunciation aid', 'Aide à la prononciation en alphabet latin', 'مساعدة نطق بالحروف اللاتينية'],
  ['wordByWord', 'Word by word', 'Mot par mot', 'كلمة بكلمة'],
  ['wordByWordDesc', 'Individual word chips with meanings', 'Jetons de mots individuels avec significations', 'شرائح كلمات فردية مع المعاني'],
  ['wordAudio', 'Word audio', 'Audio des mots', 'صوت الكلمات'],
  ['wordAudioDesc', 'Audio playback with word highlighting', 'Lecture audio avec surlignage des mots', 'تشغيل صوتي مع تمييز الكلمات'],
]
for (const [k, en, fr, ar] of sessionSetupKeys) set(`sessionSetup.${k}`, en, fr, ar)

// --- homepage marketing ---
set('homepage.hero.badge', 'AI-Powered Quran Learning', 'Apprentissage du Coran par IA', 'تعلّم القرآن بالذكاء الاصطناعي')
set('homepage.hero.title', 'Memorise the Quran with a calmer, sharper practice loop.', 'Mémorisez le Coran avec une boucle de pratique plus calme et précise.', 'احفظ القرآن بحلقة تدريب أكثر هدوءاً ودقة.')
set('homepage.hero.desc', 'Mutqin brings your ayahs, recordings, AI checks, revision flow, and weak-spot insights into one focused workspace so every session ends with a clear next step.', 'Mutqin réunit ayahs, enregistrements, vérifications IA, révision et points faibles dans un espace focalisé.', 'متقن يجمع آياتك وتسجيلاتك وفحوص الذكاء الاصطناعي والمراجعة ورؤى نقاط الضعف في مساحة واحدة.')
set('homepage.hero.problem', 'The problem:', 'Le problème :', 'المشكلة:')
set('homepage.hero.problemText', 'Memorisation breaks down when weak ayahs, recordings, and review plans live in separate places.', 'Le hifz se fragmente quand ayahs faibles, enregistrements et plans de révision sont séparés.', 'ينهار الحفظ عندما تعيش الآيات الضعيفة والتسجيلات وخطط المراجعة في أماكن منفصلة.')
set('homepage.hero.solution', 'The solution:', 'La solution :', 'الحل:')
set('homepage.hero.solutionText', 'Practise in small ranges, check recitation and recall, then review the exact ayahs that need attention.', 'Pratiquez par petites plages, vérifiez récitation et rappel, puis révisez les ayahs exactes à retravailler.', 'تدرّب على نطاقات صغيرة، افحص التلاوة والاستذكار، ثم راجع الآيات التي تحتاج اهتماماً.')
set('homepage.hero.startFree', 'Start Free', 'Commencer gratuitement', 'ابدأ مجاناً')
set('homepage.hero.seeFeatures', 'See Features', 'Voir les fonctionnalités', 'عرض الميزات')
set('homepage.demo.title', 'Live AI Analysis', 'Analyse IA en direct', 'تحليل مباشر بالذكاء الاصطناعي')
set('homepage.demo.quote', "Ikhfa' weak — hold nasalization 2 beats.", 'Ikhfa faible — maintenir la nasalisation 2 temps.', 'إخفاء ضعيف — أبقِ الغنة لمدة حركتين.')
set('homepage.demo.recording', 'Recording... → 96% accuracy', 'Enregistrement... → 96% de précision', 'جاري التسجيل... → دقة 96%')

set('homepage.features.kicker', 'Built for daily recitation', 'Conçu pour la récitation quotidienne', 'مصمم للتلاوة اليومية')
set('homepage.features.title', 'Everything you need to master recitation', 'Tout ce qu\'il faut pour maîtriser la récitation', 'كل ما تحتاجه لإتقان التلاوة')
set('homepage.features.subtitle', 'From first recording to long-term revision, each tool closes a real feedback gap.', 'Du premier enregistrement à la révision long terme, chaque outil comble un vrai manque.', 'من أول تسجيل إلى المراجعة طويلة المدى، كل أداة تسد فجوة حقيقية.')
set('homepage.steps.kicker', 'The practice loop', 'La boucle de pratique', 'حلقة التدريب')
set('homepage.steps.title', 'Three steps to fluent recitation', 'Trois étapes vers une récitation fluide', 'ثلاث خطوات نحو تلاوة fluent')
set('homepage.steps.subtitle', 'A short loop you can repeat every day: recite, diagnose, review exactly what needs work.', 'Une boucle courte à répéter chaque jour : réciter, diagnostiquer, réviser ce qui doit l\'être.', 'حلقة قصيرة تكررها يومياً: تلاوة، تشخيص، مراجعة ما يحتاج عملاً.')
set('homepage.testimonials.kicker', 'Real learning signals', 'Signaux d\'apprentissage réels', 'إشارات تعلم حقيقية')
set('homepage.testimonials.title', 'Trusted by focused students and teachers', 'Approuvé par des étudiants et enseignants concentrés', 'موثوق من طلاب ومعلمين مركزين')
set('homepage.pricing.kicker', 'Pricing that scales with practice', 'Tarifs qui évoluent avec la pratique', 'أسعار تتناسب مع التدريب')
set('homepage.pricing.title', 'Simple, transparent pricing', 'Tarification simple et transparente', 'تسعير بسيط وشفاف')
set('homepage.pricing.subtitle', 'Start free. Upgrade only when you need deeper recitation feedback, history, and coaching tools.', 'Commencez gratuitement. Passez à la version supérieure seulement si besoin.', 'ابدأ مجاناً. ترقّ فقط عند الحاجة لتغذية راجعة أعمق.')
set('homepage.faq.kicker', 'Common questions', 'Questions fréquentes', 'أسئلة شائعة')
set('homepage.faq.title', 'Answers before you start', 'Réponses avant de commencer', 'إجابات قبل أن تبدأ')
set('homepage.faq.subtitle', 'A quick overview of how Mutqin supports recitation, memorisation, and long-term retention.', 'Aperçu rapide de la façon dont Mutqin soutient récitation, mémorisation et rétention.', 'نظرة سريعة على كيف يدعم متقن التلاوة والحفظ والاست retention.')
set('homepage.contact.title', 'Tell us what you need help with', 'Dites-nous ce dont vous avez besoin', 'أخبرنا بما تحتاج مساعدة فيه')
set('homepage.contact.subtitle', 'Questions about billing, memorisation workflows, or product feedback can come through here.', 'Questions sur facturation, workflows de mémorisation ou retours produit.', 'أسئلة الفوترة وسير الحفظ أو ملاحظات المنتج هنا.')
set('homepage.cta.title', 'Turn weak ayahs into a clear review path.', 'Transformez les ayahs faibles en parcours de révision clair.', 'حوّل الآيات الضعيفة إلى مسار مراجعة واضح.')
set('homepage.cta.subtitle', 'Record a verse, review the highlighted issues, and keep the next session focused on what actually needs work.', 'Enregistrez un verset, révisez les points signalés, et concentrez la prochaine session.', 'سجّل آية، راجع المشكلات المميزة، وركّز الجلسة التالية على ما يحتاج عملاً.')
set('homepage.cta.button', 'Create Free Account', 'Créer un compte gratuit', 'إنشاء حساب مجاني')
set('homepage.cta.note', 'No card needed for Free.', 'Aucune carte requise pour Free.', 'لا حاجة لبطاقة للخطة المجانية.')

// memorisation common UI
set('memorisation.workspaceEmpty.kicker', 'Ready to begin', 'Prêt à commencer', 'جاهز للبدء')
set('memorisation.workspaceEmpty.title', 'Choose a surah and range', 'Choisissez une sourate et une plage', 'اختر سورة ونطاقاً')
set('memorisation.workspaceEmpty.desc', 'Use session controls to set up a new range. The main workspace will stay in view once you start.', 'Utilisez les contrôles pour configurer une nouvelle plage.', 'استخدم عناصر التحكم لإعداد نطاق جديد.')
set('memorisation.sessionOverview.kicker', 'Session Overview', 'Aperçu de session', 'نظرة على الجلسة')
set('memorisation.view.stacked', 'Stacked', 'Empilé', 'مكدّس')
set('memorisation.view.mushaf', 'Mushaf', 'Mushaf', 'مصحف')
set('memorisation.actions.newSession', 'New Session', 'Nouvelle session', 'جلسة جديدة')
set('memorisation.actions.repeatRange', 'Repeat Range', 'Répéter la plage', 'تكرار النطاق')
set('memorisation.actions.saveSession', 'Save This Session', 'Enregistrer cette session', 'حفظ هذه الجلسة')
set('memorisation.actions.resumeSession', 'Resume Previous Played Session?', 'Reprendre la session précédente ?', 'استئناف الجلسة السابقة؟')
set('memorisation.sessionComplete.title', 'Session Complete', 'Session terminée', 'اكتملت الجلسة')
set('memorisation.sessionEnded.title', 'Session Ended', 'Session terminée', 'انتهت الجلسة')
set('memorisation.meta.graceKicker', 'By The Grace Of Allah', 'Par la grâce d\'Allah', 'بفضل الله')
set('memorisation.meta.steadinessKicker', 'With Steadiness', 'Avec constance', 'بثبات')
set('memorisation.meta.nextKicker', 'For The Next Step', 'Pour la prochaine étape', 'للخطوة التالية')
set('memorisation.meta.completedTitle', 'This range was completed.', 'Cette plage est terminée.', 'اكتمل هذا النطاق.')
set('memorisation.meta.forwardTitle', 'This range moved forward.', 'Cette plage a avancé.', 'تقدم هذا النطاق.')
set('memorisation.meta.studiedTitle', 'This is how you studied.', 'Voici comment vous avez étudié.', 'هكذا درست.')
set('memorisation.meta.advanceTitle', 'Advance or reinforce.', 'Avancer ou renforcer.', 'تقدم أو عزّز.')
set('memorisation.meta.continueTitle', 'Continue or begin again.', 'Continuer ou recommencer.', 'تابع أو ابدأ من جديد.')
set('memorisation.summary.default', 'You can start a new range, save this one, or repeat it now.', 'Vous pouvez démarrer une nouvelle plage, enregistrer ou répéter.', 'يمكنك بدء نطاق جديد أو حفظ هذا أو تكراره الآن.')
set('memorisation.reading.translation', 'Translation', 'Traduction', 'الترجمة')
set('memorisation.reading.transliteration', 'Transliteration', 'Translittération', 'النسخ الصوتي')
set('memorisation.reading.wordByWord', 'Word by word', 'Mot par mot', 'كلمة بكلمة')
set('memorisation.reading.wordAudio', 'Word audio', 'Audio des mots', 'صوت الكلمات')
set('memorisation.reading.tajweed', 'Tajweed', 'Tajwid', 'التجويد')
set('memorisation.reading.controls', 'Controls', 'Contrôles', 'عناصر التحكم')
set('memorisation.reading.fullScreen', 'Full Screen', 'Plein écran', 'ملء الشاشة')
set('memorisation.reading.font', 'Font', 'Police', 'الخط')
set('memorisation.reading.theme', 'Theme', 'Thème', 'السمة')
set('memorisation.reading.border', 'Border', 'Bordure', 'الإطار')
set('memorisation.reading.aiRecite', 'AI Recite', 'Récitation IA', 'تلاوة بالذكاء الاصطناعي')
set('memorisation.reading.aiMemory', 'AI Memory', 'Mémorisation IA', 'حفظ بالذكاء الاصطناعي')
set('memorisation.badges.new', 'New', 'Nouveau', 'جديد')
set('memorisation.badges.due', 'Due', 'À réviser', 'مستحق')
set('memorisation.badges.weak', 'Needs Review', 'À réviser', 'يحتاج مراجعة')
set('memorisation.badges.steady', 'Steady', 'Stable', 'ثابت')
set('memorisation.badges.active', 'Active Ayah', 'Ayah active', 'آية نشطة')

set('memorisation.stats.progress', 'Progress', 'Progression', 'التقدم')
set('memorisation.stats.duration', 'Duration', 'Durée', 'المدة')
set('memorisation.stats.repeats', 'Repeats', 'Répétitions', 'التكرار')

// toasts / errors (common memorisation)
set('toasts.saved', 'Saved successfully.', 'Enregistré avec succès.', 'تم الحفظ بنجاح.')
set('toasts.error', 'Something went wrong. Please try again.', 'Une erreur s\'est produite. Réessayez.', 'حدث خطأ. يرجى المحاولة مرة أخرى.')
set('errors.network', 'Network error. Check your connection.', 'Erreur réseau. Vérifiez votre connexion.', 'خطأ في الشبكة. تحقق من اتصالك.')

// about pages (minimal)
set('about.tag', 'Mutqin • Hifz Companion', 'Mutqin • Compagnon de Hifz', 'متقن • رفيق الحفظ')
set('about.heroTitle', 'A structured path to mastering the Qur\'an', 'Un chemin structuré vers la maîtrise du Coran', 'مسار منظم لإتقان القرآن')
set('about.heroDesc', 'Mutqin is designed to help you memorise, revise, and retain the Qur\'an with clarity and consistency — supported by intelligent guidance and gentle correction.', 'Mutqin vous aide à mémoriser, réviser et retenir le Coran avec clarté et régularité.', 'متقن مصمم لمساعدتك على حفظ القرآن ومراجعته والاحتفاظ به بوضوح وثبات.')
set('about.ctaPrimary', 'Begin Your Journey', 'Commencez votre parcours', 'ابدأ رحلتك')
set('about.ctaSecondary', 'Learn More', 'En savoir plus', 'اعرف المزيد')
set('about.purposeTitle', 'Purpose', 'Objectif', 'الهدف')
set('about.purposeDesc', 'To make Qur\'an memorisation structured, sustainable, and deeply personal.', 'Rendre la mémorisation du Coran structurée, durable et personnelle.', 'جعل حفظ القرآن منظماً ومستداماً وشخصياً.')
set('about.approachTitle', 'Approach', 'Approche', 'المنهج')
set('about.approachDesc', 'AI-supported learning that respects traditional teaching methods.', 'Apprentissage assisté par IA respectant les méthodes traditionnelles.', 'تعلم مدعوم بالذكاء الاصطناعي يحترم الأساليب التقليدية.')
set('about.outcomeTitle', 'Outcome', 'Résultat', 'النتيجة')
set('about.outcomeDesc', 'Stronger retention, consistent revision, and improved accuracy.', 'Meilleure rétention, révision régulière et précision accrue.', 'احتفاظ أقوى ومراجعة منتظمة ودقة أفضل.')
set('about.verse', '"Indeed, We have made the Qur\'an easy to remember." — 54:17', '"Et certes, Nous avons rendu le Coran facile à retenir." — 54:17', '"ولقد يسرنا القرآن للذكر فهل من مدكر" — 54:17')
set('about.title', 'About Mutqin', 'À propos de Mutqin', 'عن متقن')
set('aboutUs.title', 'About Us', 'À propos de nous', 'من نحن')
set('mission.title', 'Our Mission', 'Notre mission', 'مهمتنا')
set('donate.title', 'Support Mutqin', 'Soutenir Mutqin', 'ادعم متقن')

// common extras used by force-i18n
set('common.delete', 'Delete', 'Supprimer', 'حذف')
set('common.resume', 'Resume', 'Reprendre', 'استئناف')
set('common.discard', 'Discard', 'Abandonner', 'تجاهل')
set('common.back', 'Back', 'Retour', 'رجوع')
set('common.continue', 'Continue', 'Continuer', 'متابعة')
set('common.filter', 'Filter', 'Filtrer', 'تصفية')
set('common.metadata', 'Metadata', 'Métadonnées', 'البيانات الوصفية')

set('homepage.pricing.starter', 'Starter', 'Starter', 'Starter')
set('homepage.pricing.premium', 'Premium', 'Premium', 'Premium')
set('homepage.pricing.monthly', 'Monthly', 'Mensuel', 'شهري')
set('homepage.pricing.yearly', 'Yearly', 'Annuel', 'سنوي')
set('homepage.pricing.perMonth', '/month', '/mois', '/شهر')
set('homepage.pricing.premiumYearly', 'or £17.99 yearly', 'ou 17,99 £ par an', 'أو 17.99 £ سنوياً')
set('homepage.pricing.proYearly', 'or £49.99 yearly', 'ou 49,99 £ par an', 'أو 49.99 £ سنوياً')
set('homepage.pricing.featureColumn', 'Feature', 'Fonctionnalité', 'الميزة')
set('homepage.contact.email', 'Email', 'E-mail', 'البريد الإلكتروني')
set('homepage.contact.subject', 'Subject', 'Objet', 'الموضوع')
set('homepage.contact.message', 'Message', 'Message', 'الرسالة')
set('homepage.footer.product', 'Product', 'Produit', 'المنتج')
set('homepage.footer.features', 'Features', 'Fonctionnalités', 'الميزات')
set('homepage.footer.pricing', 'Pricing', 'Tarifs', 'الأسعار')
set('homepage.footer.resources', 'Resources', 'Ressources', 'الموارد')
set('homepage.footer.company', 'Company', 'Entreprise', 'الشركة')
set('homepage.footer.contact', 'Contact', 'Contact', 'اتصل')
set('homepage.footer.connect', 'Connect', 'Réseaux', 'تواصل')
set('homepage.footer.privacy', 'Privacy', 'Confidentialité', 'الخصوصية')
set('homepage.footer.terms', 'Terms', 'Conditions', 'الشروط')

// homepage dynamic data (setup/computed)
set('homepage.badge.free', 'Free', 'Gratuit', 'مجاني')
set('homepage.badge.pro', 'Pro', 'Pro', 'Pro')
set('homepage.badge.freeLimited', 'Free limited', 'Gratuit limité', 'مجاني محدود')
set('homepage.pricing.freeTrial', '7-DAY FREE TRIAL', 'ESSAI GRATUIT 7 JOURS', 'تجربة مجانية 7 أيام')
set('homepage.contact.extendedSubtitle', 'Questions about billing, memorisation workflows, or product feedback can come through here. We will keep the response simple and actionable.', 'Questions sur facturation, workflows de mémorisation ou retours produit. Réponse simple et actionnable.', 'أسئلة الفوترة وسير الحفظ أو ملاحظات المنتج هنا. سنبقي الرد بسيطاً وقابلاً للتطبيق.')
set('homepage.contact.sending', 'Sending...', 'Envoi...', 'جاري الإرسال...')
set('homepage.contact.sendMessage', 'Send Message', 'Envoyer le message', 'إرسال الرسالة')
set('homepage.contact.errors.name', 'Please enter your name.', 'Veuillez entrer votre nom.', 'يرجى إدخال اسمك.')
set('homepage.contact.errors.email', 'Please enter your email address.', 'Veuillez entrer votre adresse e-mail.', 'يرجى إدخال بريدك الإلكتروني.')
set('homepage.contact.errors.emailInvalid', 'Please enter a valid email address.', 'Veuillez entrer une adresse e-mail valide.', 'يرجى إدخال بريد إلكتروني صالح.')
set('homepage.contact.errors.subject', 'Please enter a subject.', 'Veuillez entrer un objet.', 'يرجى إدخال الموضوع.')
set('homepage.contact.errors.message', 'Please enter a message.', 'Veuillez entrer un message.', 'يرجى إدخال رسالة.')
set('homepage.contact.success', 'Your message has been sent successfully.', 'Votre message a été envoyé avec succès.', 'تم إرسال رسالتك بنجاح.')
set('homepage.contact.errorFields', 'Please review the highlighted fields and try again.', 'Vérifiez les champs signalés et réessayez.', 'راجع الحقول المميزة وحاول مرة أخرى.')
set('homepage.contact.errorSend', 'Unable to send message. Please try again.', 'Impossible d\'envoyer le message. Réessayez.', 'تعذر إرسال الرسالة. يرجى المحاولة مرة أخرى.')
set('homepage.footer.tagline', '2026 Mutqin · "And recite the Quran with measured recitation." 🤍', '2026 Mutqin · « Récite le Coran avec mesure. » 🤍', '2026 متقن · « ورتل القرآن ترتيلاً » 🤍')

set('homepage.floatingBadges.tajweedScore', 'Tajweed score: +27%', 'Score tajwid : +27%', 'درجة التجويد: +27%')
set('homepage.floatingBadges.weakVerses', 'Weak verses auto-scheduled', 'Versets faibles planifiés auto', 'آيات ضعيفة مجدولة تلقائياً')
set('homepage.floatingBadges.dailyMinutes', '15 min/day memorization', '15 min/jour de mémorisation', '15 دقيقة/يوم للحفظ')

const homepageFeatures = [
  ['recitationReview', 'AI Recitation Review', 'Revue de récitation IA', 'مراجعة التلاوة بالذكاء الاصطناعي', 'Record an ayah and compare your attempt against the text with clear word-level feedback.', 'Enregistrez une ayah et comparez votre tentative au texte avec un retour mot par mot.', 'سجّل آية وقارن محاولتك بالنص مع تغذية راجعة على مستوى الكلمة.', 'Spot the section to repeat next.', 'Repérez la section à répéter ensuite.', 'حدد القسم الذي تكرره بعد ذلك.', 'free'],
  ['smartMemorisation', 'Smart Memorisation', 'Mémorisation intelligente', 'حفظ ذكي', 'Use blur, chaining, anchors, and review signals to strengthen recall without clutter.', 'Utilisez flou, enchaînement, ancres et signaux de révision pour renforcer le rappel sans encombrement.', 'استخدم التمويه والتسلسل والمراسي وإشارات المراجعة لتقوية الاستذكار دون فوضى.', 'Practise the ayahs that need attention.', 'Pratiquez les ayahs qui demandent attention.', 'تدرّب على الآيات التي تحتاج اهتماماً.', 'pro'],
  ['stackedMushaf', 'Stacked & Mushaf Views', 'Vues empilées et Mushaf', 'عرض مكدّس ومصحف', 'Move between clean ayah cards and page-style mushaf layouts while keeping controls nearby.', 'Passez entre cartes d\'ayahs et mise en page mushaf en gardant les contrôles à portée.', 'انتقل بين بطاقات الآيات وتخطيط المصحف مع بقاء عناصر التحكم قريبة.', 'Read, listen, and self-check in one flow.', 'Lisez, écoutez et auto-vérifiez en un flux.', 'اقرأ واستمع وافحص نفسك في تدفق واحد.', 'free'],
  ['transitionTraining', 'Transition Training', 'Entraînement aux transitions', 'تدريب الانتقال', 'Build confidence between neighbouring ayahs with linking and cumulative repetition.', 'Renforcez la confiance entre ayahs voisines avec liaison et répétition cumulative.', 'ابنِ الثقة بين الآيات المتجاورة بالربط والتكرار التراكمي.', 'Reduce pauses between verses.', 'Réduisez les pauses entre versets.', 'قلّل التوقف بين الآيات.', 'pro'],
  ['recordingLibrary', 'Recording Library', 'Bibliothèque d\'enregistrements', 'مكتبة التسجيلات', 'Save attempts by surah and ayah so older reviews remain easy to find.', 'Enregistrez les tentatives par sourate et ayah pour retrouver facilement les anciennes révisions.', 'احفظ المحاولات حسب السورة والآية لتسهيل العثور على المراجعات القديمة.', 'Keep your recitation history organised.', 'Gardez votre historique de récitation organisé.', 'حافظ على سجل تلاوتك منظماً.', 'freeLimited'],
  ['reviewAnalytics', 'Review Analytics', 'Analyses de révision', 'تحليلات المراجعة', 'Track weak ayahs, repeated attempts, and review priority across your sessions.', 'Suivez ayahs faibles, tentatives répétées et priorité de révision entre sessions.', 'تتبع الآيات الضعيفة والمحاولات المتكررة وأولوية المراجعة عبر جلساتك.', 'Know what to fix before the next session.', 'Sachez quoi corriger avant la prochaine session.', 'اعرف ما يجب إصلاحه قبل الجلسة التالية.', 'pro'],
]
for (const [id, titleEn, titleFr, titleAr, descEn, descFr, descAr, resultEn, resultFr, resultAr, badge] of homepageFeatures) {
  set(`homepage.features.items.${id}.title`, titleEn, titleFr, titleAr)
  set(`homepage.features.items.${id}.description`, descEn, descFr, descAr)
  set(`homepage.features.items.${id}.result`, resultEn, resultFr, resultAr)
  set(`homepage.features.items.${id}.badge`, badge, badge, badge)
}

const homepageSteps = [
  ['record', 'Record', 'Enregistrer', 'سجّل', 'Recite the selected ayah or session directly in the browser.', 'Récitez l\'ayah ou la session sélectionnée directement dans le navigateur.', 'تلاوَ الآية أو الجلسة المختارة مباشرة في المتصفح.', 'Fast self-checks without uploads', 'Auto-vérifications rapides sans envoi', 'فحوص ذاتية سريعة دون رفع'],
  ['review', 'Review', 'Réviser', 'راجع', 'See which words were strong, close, or missed after the recitation.', 'Voyez quels mots étaient forts, proches ou manqués après la récitation.', 'اعرف الكلمات القوية والقريبة والفائتة بعد التلاوة.', 'Clear feedback you can act on', 'Retour clair et actionnable', 'تغذية راجعة واضحة يمكنك التصرف بناءً عليها'],
  ['repeat', 'Repeat', 'Répéter', 'كرّر', 'Use blur, chaining, anchors, and saved attempts to revisit weak ayahs.', 'Utilisez flou, enchaînement, ancres et tentatives enregistrées pour reprendre les ayahs faibles.', 'استخدم التمويه والتسلسل والمراسي والمحاولات المحفوظة لإعادة الآيات الضعيفة.', 'Practice follows your weak spots', 'La pratique suit vos points faibles', 'التدريب يتبع نقاط ضعفك'],
]
for (const [id, titleEn, titleFr, titleAr, descEn, descFr, descAr, microEn, microFr, microAr] of homepageSteps) {
  set(`homepage.steps.items.${id}.title`, titleEn, titleFr, titleAr)
  set(`homepage.steps.items.${id}.description`, descEn, descFr, descAr)
  set(`homepage.steps.items.${id}.microcopy`, microEn, microFr, microAr)
}

const homepageTestimonials = [
  ['abdullah', "Mutqin fixed my 'ض' in 2 weeks after 5 years of struggle. Alhamdulillah.", 'Mutqin a corrigé mon « ض » en 2 semaines après 5 ans de difficulté. Alhamdulillah.', 'أصلح متقن حرف الضاد خلال أسبوعين بعد 5 سنوات من المعاناة. الحمد لله.', 'Focused makharij feedback', 'Retour ciblé sur les makharij', 'تغذية راجعة مركّزة على المخارج', 'Abdullah Khan', 'Abdullah Khan', 'Abdullah Khan', '12 Juz Memorized', '12 juz mémorisés', '12 جزءاً محفوظاً', 'AK'],
  ['fatima', "Spaced repetition saved my hifdh. I don't forget anymore. Essential for every hafidh.", 'La répétition espacée a sauvé mon hifdh. Je n\'oublie plus. Essentiel pour chaque hafidh.', 'المراجعة المتباعدة أنقذت حفظي. لم أعد أنسى. ضروري لكل حافظ.', 'Daily weak-verse review', 'Révision quotidienne des versets faibles', 'مراجعة يومية للآيات الضعيفة', 'Fatima El-Sayed', 'Fatima El-Sayed', 'Fatima El-Sayed', 'Hafidha in Progress', 'Hafidha en cours', 'حافظة قيد التقدم', 'FE'],
  ['hisham', "As a tajweed teacher, I use Mutqin to track students' weak spots instantly.", 'En tant qu\'enseignant de tajwid, j\'utilise Mutqin pour repérer instantanément les points faibles des élèves.', 'كمعلّم تجويد، أستخدم متقن لتتبع نقاط ضعف الطلاب فوراً.', 'Teacher visibility', 'Visibilité pour l\'enseignant', 'رؤية للمعلّم', 'Ustadh Hisham', 'Ustadh Hisham', 'Ustadh Hisham', 'Certified Qari', 'Qari certifié', 'قارئ معتمد', 'UH'],
]
for (const [id, quoteEn, quoteFr, quoteAr, proofEn, proofFr, proofAr, authorEn, authorFr, authorAr, roleEn, roleFr, roleAr, initials] of homepageTestimonials) {
  set(`homepage.testimonials.items.${id}.quote`, quoteEn, quoteFr, quoteAr)
  set(`homepage.testimonials.items.${id}.proof`, proofEn, proofFr, proofAr)
  set(`homepage.testimonials.items.${id}.author`, authorEn, authorFr, authorAr)
  set(`homepage.testimonials.items.${id}.role`, roleEn, roleFr, roleAr)
  set(`homepage.testimonials.items.${id}.initials`, initials, initials, initials)
}

const homepageFaq = [
  ['whatIsMutqin', 'What is Mutqin?', 'Qu\'est-ce que Mutqin ?', 'ما هو متقن؟', 'Mutqin is a Quran memorisation and recitation workspace that combines practice tools, recordings, review signals, and progress tracking in one place.', 'Mutqin est un espace de mémorisation et récitation du Coran qui combine outils de pratique, enregistrements, signaux de révision et suivi de progression.', 'متقن مساحة لحفظ القرآن وتلاوته تجمع أدوات التدريب والتسجيلات وإشارات المراجعة وتتبع التقدم في مكان واحد.'],
  ['howMemorisation', 'How does memorisation work?', 'Comment fonctionne la mémorisation ?', 'كيف يعمل الحفظ؟', 'You choose a surah and ayah range, repeat in small blocks, and use practice tools like blur, chaining, and saved sessions to strengthen recall gradually.', 'Vous choisissez une sourate et une plage d\'ayahs, répétez par petits blocs et utilisez flou, enchaînement et sessions enregistrées pour renforcer le rappel.', 'تختار سورة ونطاق آيات، تكرر في كتل صغيرة، وتستخدم التمويه والتسلسل والجلسات المحفوظة لتقوية الاستذكار تدريجياً.'],
  ['howAiFeedback', 'How does AI feedback work?', 'Comment fonctionne le retour IA ?', 'كيف تعمل تغذية الذكاء الاصطناعي الراجعة؟', 'AI feedback listens after you practise, highlights likely weak or missed words, and gives you a clearer next repetition instead of a vague overall score.', 'Le retour IA écoute après votre pratique, signale les mots faibles ou manqués probables et propose une répétition plus claire qu\'un score global vague.', 'تستمع تغذية الذكاء الاصطناعي بعد تدربك، تبرز الكلمات الضعيفة أو الفائتة المحتملة، وتعطيك تكراراً أوضح بدلاً من درجة عامة مبهمة.'],
  ['whatIsPro', 'What is Pro?', 'Qu\'est-ce que Pro ?', 'ما هي خطة Pro؟', 'Pro is the full Mutqin plan for students who want AI recitation review, AI memorisation checks, advanced analytics, unlimited saved sessions, and deeper planning tools.', 'Pro est le plan Mutqin complet pour les étudiants qui veulent révision IA, vérifications de mémorisation, analyses avancées, sessions illimitées et outils de planification.', 'Pro هي خطة متقن الكاملة للطلاب الذين يريدون مراجعة تلاوة بالذكاء الاصطناعي وفحوص الحفظ وتحليلات متقدمة وجلسات غير محدودة وأدوات تخطيط أعمق.'],
  ['howRevision', 'How does revision work?', 'Comment fonctionne la révision ?', 'كيف تعمل المراجعة؟', 'Mutqin tracks weak ayahs, recent practice, and due reviews so you can revisit what is most likely to slip before it turns into a larger backlog.', 'Mutqin suit ayahs faibles, pratique récente et révisions dues pour revisiter ce qui risque de s\'effacer avant un backlog plus large.', 'يتتبع متقن الآيات الضعيفة والتدريب الأخير والمراجعات المستحقة لإعادة ما قد ينزلق قبل أن يصبح تراكماً أكبر.'],
]
for (const [id, qEn, qFr, qAr, aEn, aFr, aAr] of homepageFaq) {
  set(`homepage.faq.items.${id}.question`, qEn, qFr, qAr)
  set(`homepage.faq.items.${id}.answer`, aEn, aFr, aAr)
}

const planFeatureKeys = [
  ['sessionSetup', 'Full basic session setup', 'Configuration de session de base complète', 'إعداد جلسة أساسي كامل'],
  ['savedSessions3', '3 saved sessions', '3 sessions enregistrées', '3 جلسات محفوظة'],
  ['savedSessions5', '5 saved sessions', '5 sessions enregistrées', '5 جلسات محفوظة'],
  ['savedSessionsUnlimited', 'Unlimited saved sessions', 'Sessions enregistrées illimitées', 'جلسات محفوظة غير محدودة'],
  ['basicAnalytics', 'Basic analytics', 'Analyses de base', 'تحليلات أساسية'],
  ['focusMode', 'Focus mode', 'Mode focus', 'وضع التركيز'],
  ['blurringMethod', 'Blurring method', 'Méthode de flou', 'أسلوب التمويه'],
  ['chainingMethod', 'Chaining method', 'Méthode d\'enchaînement', 'أسلوب التسلسل'],
  ['anchorMode', 'Anchor mode', 'Mode ancre', 'وضع المراسي'],
  ['manualSelfAssessment', 'Manual self-assessment recording', 'Enregistrement d\'auto-évaluation manuelle', 'تسجيل تقييم ذاتي يدوي'],
  ['manualSelfAssessmentPlus', 'Manual self-assessment recording + self recording', 'Auto-évaluation manuelle + enregistrement personnel', 'تقييم ذاتي يدوي + تسجيل شخصي'],
  ['hifzPlan', 'Structured Custom Hifz Plan', 'Plan Hifz personnalisé structuré', 'خطة حفظ مخصصة منظمة'],
  ['spacedRetention', 'Spaced Session Retention', 'Rétention espacée des sessions', 'احتفاظ متباعد بالجلسات'],
  ['adaptiveRevision', 'Adaptive Revision Scheduling', 'Planification adaptative de révision', 'جدولة مراجعة تكيفية'],
  ['progressTracking', 'Progress Tracking', 'Suivi de progression', 'تتبع التقدم'],
  ['allTechniques', 'All memorisation techniques included', 'Toutes les techniques de mémorisation incluses', 'كل تقنيات الحفظ مشمولة'],
  ['aiRecitation', 'AI recitation', 'Récitation IA', 'تلاوة بالذكاء الاصطناعي'],
  ['aiMemorisationChecker', 'AI memorisation checker', 'Vérificateur de mémorisation IA', 'فاحص الحفظ بالذكاء الاصطناعي'],
  ['advancedAnalysis', 'Advanced analysis', 'Analyse avancée', 'تحليل متقدم'],
  ['offlineDownloads', 'Download for offline listening', 'Téléchargement pour écoute hors ligne', 'تنزيل للاستماع دون اتصال'],
  ['voiceHifzBuilder', 'Voice Hifz Plan Builder', 'Créateur de plan Hifz vocal', 'منشئ خطة حفظ صوتي'],
]
for (const [id, en, fr, ar] of planFeatureKeys) {
  set(`homepage.planFeatures.${id}`, en, fr, ar)
}

const comparisonKeys = [
  ['sessionSetup', 'Session setup and ayah range tools', 'Configuration de session et outils de plage d\'ayahs', 'إعداد الجلسة وأدوات نطاق الآيات'],
  ['savedSessions', 'Saved sessions', 'Sessions enregistrées', 'الجلسات المحفوظة'],
  ['layouts', 'Stacked and Mushaf layouts', 'Dispositions empilées et Mushaf', 'تخطيطات مكدّسة ومصحف'],
  ['focusMode', 'Focus mode', 'Mode focus', 'وضع التركيز'],
  ['blurMethod', 'Blur memorisation method', 'Méthode de mémorisation par flou', 'أسلوب الحفظ بالتمويه'],
  ['chainingPractice', 'Chaining and transition practice', 'Enchaînement et pratique de transition', 'التسلسل وتدريب الانتقال'],
  ['anchorMode', 'Anchor mode', 'Mode ancre', 'وضع المراسي'],
  ['manualRecording', 'Manual self-assessment recording', 'Enregistrement d\'auto-évaluation manuelle', 'تسجيل تقييم ذاتي يدوي'],
  ['aiRecitationReview', 'AI recitation review', 'Revue de récitation IA', 'مراجعة التلاوة بالذكاء الاصطناعي'],
  ['aiMemorisationChecker', 'AI memorisation checker', 'Vérificateur de mémorisation IA', 'فاحص الحفظ بالذكاء الاصطناعي'],
  ['hifzPlan', 'Structured Custom Hifz Plan', 'Plan Hifz personnalisé structuré', 'خطة حفظ مخصصة منظمة'],
  ['spacedRetention', 'Spaced Session Retention', 'Rétention espacée des sessions', 'احتفاظ متباعد بالجلسات'],
  ['voiceHifzBuilder', 'Voice Hifz Plan Builder', 'Créateur de plan Hifz vocal', 'منشئ خطة حفظ صوتي'],
  ['adaptiveRevision', 'Adaptive Revision Scheduling', 'Planification adaptative de révision', 'جدولة مراجعة تكيفية'],
  ['progressTracking', 'Progress Tracking', 'Suivi de progression', 'تتبع التقدم'],
  ['advancedAnalytics', 'Advanced review analytics', 'Analyses de révision avancées', 'تحليلات مراجعة متقدمة'],
  ['offlineDownloads', 'Offline audio downloads', 'Téléchargements audio hors ligne', 'تنزيلات صوتية دون اتصال'],
]
for (const [id, en, fr, ar] of comparisonKeys) {
  set(`homepage.comparison.${id}`, en, fr, ar)
}
set('homepage.comparison.unlimited', 'Unlimited', 'Illimité', 'غير محدود')

set('memorisation.due', 'Due', 'À réviser', 'مستحق')
set('memorisation.audio.title', 'Audio', 'Audio', 'الصوت')
set('memorisation.planner.hifzPlan', 'Hifz Plan', 'Plan Hifz', 'خطة الحفظ')
set('memorisation.planner.todaysGoal', "Today's Goal", 'Objectif du jour', 'هدف اليوم')
set('memorisation.planner.memoryReview', 'Memory Review', 'Révision mémorielle', 'مراجعة الحفظ')
set('memorisation.planner.sessionView', 'Session View', 'Vue de session', 'عرض الجلسة')
set('memorisation.tools.tabs.session', 'Session', 'Session', 'الجلسة')
set('memorisation.tools.tabs.practice', 'Practice', 'Pratique', 'التدريب')
set('memorisation.tools.tabs.saved', 'Saved', 'Enregistré', 'محفوظ')
set('memorisation.tools.tabs.insights', 'Insights', 'Analyses', 'رؤى')

set('homepage.footer.aboutUs', 'About Us', 'À propos de nous', 'من نحن')
set('homepage.footer.ourMission', 'Our Mission', 'Notre mission', 'مهمتنا')
set('aboutUs.kicker', 'About Mutqin', 'À propos de Mutqin', 'عن متقن')
set('mission.kicker', 'Our Mission', 'Notre mission', 'مهمتنا')

applyBulkSets(set)

for (const locale of ['en', 'fr', 'ar']) {
  const file = path.join(outDir, `${locale}.json`)
  fs.writeFileSync(file, JSON.stringify(packs[locale], null, 2) + '\n', 'utf8')
  console.log(`Wrote ${file}`)
}
