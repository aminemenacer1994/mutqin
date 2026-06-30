/**
 * Bulk-translate English placeholder strings in ar/fr locale JSON files.
 * Usage: node scripts/i18n-bulk-translate-placeholders.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const LOCALES_DIR = path.resolve('resources/js/locales')
const TARGET_NAMESPACES = ["memorisation","homepage","hifzPlan","aboutUs","mission","donate","common"]

/** Embedded translations keyed by flat locale path. */
const TRANSLATIONS = {
  "common.reset": {
    "ar": "إعادة تعيين",
    "fr": "Réinitialiser"
  },
  "common.settings": {
    "ar": "الإعدادات",
    "fr": "Paramètres"
  },
  "common.controls": {
    "ar": "عناصر التحكم",
    "fr": "Contrôles"
  },
  "common.cancel": {
    "ar": "إلغاء",
    "fr": "Annuler"
  },
  "common.save": {
    "ar": "حفظ",
    "fr": "Enregistrer"
  },
  "common.close": {
    "ar": "إغلاق",
    "fr": "Fermer"
  },
  "common.delete": {
    "ar": "حذف",
    "fr": "Supprimer"
  },
  "common.resume": {
    "ar": "استئناف",
    "fr": "Reprendre"
  },
  "common.discard": {
    "ar": "تجاهل",
    "fr": "Abandonner"
  },
  "common.back": {
    "ar": "رجوع",
    "fr": "Retour"
  },
  "common.continue": {
    "ar": "متابعة",
    "fr": "Continuer"
  },
  "common.filter": {
    "ar": "تصفية",
    "fr": "Filtrer"
  },
  "common.metadata": {
    "ar": "البيانات الوصفية",
    "fr": "Métadonnées"
  },
  "common.download": {
    "ar": "تنزيل",
    "fr": "Télécharger"
  },
  "common.method": {
    "ar": "الطريقة",
    "fr": "Méthode"
  },
  "homepage.demo.title": {
    "ar": "تحليل الذكاء الاصطناعي المباشر",
    "fr": "Analyse IA en direct"
  },
  "homepage.demo.quote": {
    "ar": "\"إخفاء ضعيف — أمسك الغنة لمدة نبضتين.\"",
    "fr": "\"Ikhfa' faible — maintenez la nasalisation 2 temps.\""
  },
  "homepage.demo.recording": {
    "ar": "جاري التسجيل... ← دقة 96%",
    "fr": "Enregistrement... → 96 % de précision"
  },
  "homepage.features.kicker": {
    "ar": "مصمّم للتلاوة اليومية",
    "fr": "Conçu pour la récitation quotidienne"
  },
  "homepage.features.title": {
    "ar": "كل ما تحتاجه لإتقان التلاوة",
    "fr": "Tout ce qu'il faut pour maîtriser la récitation"
  },
  "homepage.features.subtitle": {
    "ar": "من أول تسجيل إلى مراجعة طويلة الأمد، كل أداة تسد فجوة تغذية راجعة حقيقية.",
    "fr": "Du premier enregistrement à la révision à long terme, chaque outil comble un vrai manque de retour."
  },
  "homepage.features.items.recitationReview.badge": {
    "ar": "مجاني",
    "fr": "gratuit"
  },
  "homepage.features.items.smartMemorisation.badge": {
    "ar": "احترافي",
    "fr": "pro"
  },
  "homepage.features.items.stackedMushaf.badge": {
    "ar": "مجاني",
    "fr": "gratuit"
  },
  "homepage.features.items.transitionTraining.badge": {
    "ar": "احترافي",
    "fr": "pro"
  },
  "homepage.features.items.recordingLibrary.badge": {
    "ar": "مجاني محدود",
    "fr": "gratuit limité"
  },
  "homepage.features.items.reviewAnalytics.badge": {
    "ar": "احترافي",
    "fr": "pro"
  },
  "homepage.steps.kicker": {
    "ar": "حلقة التدريب",
    "fr": "La boucle de pratique"
  },
  "homepage.steps.title": {
    "ar": "ثلاث خطوات لتلاوة طليقة",
    "fr": "Trois étapes vers une récitation fluide"
  },
  "homepage.testimonials.kicker": {
    "ar": "إشارات تعلّم حقيقية",
    "fr": "Signaux d'apprentissage réels"
  },
  "homepage.testimonials.title": {
    "ar": "موثوق من طلاب ومعلّمين مركّزين",
    "fr": "Approuvé par des élèves et enseignants engagés"
  },
  "homepage.testimonials.items.abdullah.author": {
    "ar": "عبد الله خان",
    "fr": "Abdullah Khan"
  },
  "homepage.testimonials.items.abdullah.initials": {
    "ar": "AK",
    "fr": "AK"
  },
  "homepage.testimonials.items.fatima.author": {
    "ar": "فاطمة السيد",
    "fr": "Fatima El-Sayed"
  },
  "homepage.testimonials.items.fatima.initials": {
    "ar": "FE",
    "fr": "FE"
  },
  "homepage.testimonials.items.hisham.author": {
    "ar": "الأستاذ هشام",
    "fr": "Ustadh Hisham"
  },
  "homepage.testimonials.items.hisham.initials": {
    "ar": "UH",
    "fr": "UH"
  },
  "homepage.pricing.kicker": {
    "ar": "أسعار تتناسب مع الممارسة",
    "fr": "Des tarifs qui évoluent avec la pratique"
  },
  "homepage.pricing.title": {
    "ar": "أسعار بسيطة وشفافة",
    "fr": "Tarification simple et transparente"
  },
  "homepage.pricing.starter": {
    "ar": "المبتدئ",
    "fr": "Starter"
  },
  "homepage.pricing.premium": {
    "ar": "المميز",
    "fr": "Premium"
  },
  "homepage.faq.kicker": {
    "ar": "أسئلة شائعة",
    "fr": "Questions fréquentes"
  },
  "homepage.faq.title": {
    "ar": "إجابات قبل أن تبدأ",
    "fr": "Des réponses avant de commencer"
  },
  "homepage.contact.title": {
    "ar": "أخبرنا بما تحتاج مساعدة فيه",
    "fr": "Dites-nous ce pour quoi vous avez besoin d'aide"
  },
  "homepage.cta.title": {
    "ar": "حوّل الآيات الضعيفة إلى مسار مراجعة واضح.",
    "fr": "Transformez les ayahs faibles en un parcours de révision clair."
  },
  "homepage.cta.button": {
    "ar": "إنشاء حساب مجاني",
    "fr": "Créer un compte gratuit"
  },
  "homepage.cta.note": {
    "ar": "لا حاجة لبطاقة للخطة المجانية.",
    "fr": "Aucune carte requise pour le plan gratuit."
  },
  "homepage.footer.aboutUs": {
    "ar": "من نحن",
    "fr": "À propos"
  },
  "homepage.badge.pro": {
    "ar": "احترافي",
    "fr": "Pro"
  },
  "homepage.a_short_loop_you_can_repeat_every_day_recite_diagn": {
    "ar": "حلقة قصيرة تكررها يومياً: تلاوة، تشخيص، مراجعة ما يحتاج عملاً.",
    "fr": "Une boucle courte à répéter chaque jour : réciter, diagnostiquer, revoir ce qui demande du travail."
  },
  "homepage.start_free_upgrade_only_when_you_need_deeper_recit": {
    "ar": "ابدأ مجاناً. ترقّ فقط عند الحاجة لتغذية راجعة أعمق للتلاوة والسجل وأدوات التدريب.",
    "fr": "Commencez gratuitement. Passez au supérieur seulement si vous avez besoin d'un retour plus approfondi, d'historique et d'outils de coaching."
  },
  "homepage.free": {
    "ar": "مجاني",
    "fr": "Gratuit"
  },
  "homepage.for_trying_the_workflow": {
    "ar": "لتجربة سير العمل",
    "fr": "Pour essayer le flux de travail"
  },
  "homepage.start_free": {
    "ar": "ابدأ مجاناً",
    "fr": "Commencer gratuitement"
  },
  "homepage.most_useful": {
    "ar": "الأكثر فائدة",
    "fr": "Le plus utile"
  },
  "homepage.teacher_ready": {
    "ar": "جاهز للمعلّمين",
    "fr": "Prêt pour les enseignants"
  },
  "homepage.pro": {
    "ar": "احترافي",
    "fr": "Pro"
  },
  "homepage.feature_comparison": {
    "ar": "مقارنة الميزات",
    "fr": "Comparaison des fonctionnalités"
  },
  "homepage.everything_included_in_each_subscription_at_a_glan": {
    "ar": "كل ما يتضمنه كل اشتراك في لمحة.",
    "fr": "Tout ce qui est inclus dans chaque abonnement en un coup d'œil."
  },
  "homepage.a_quick_overview_of_how_mutqin_supports_recitation": {
    "ar": "نظرة سريعة على كيف يدعم متقن التلاوة والحفظ والاحتفاظ طويل الأمد.",
    "fr": "Un aperçu rapide de la façon dont Mutqin soutient la récitation, la mémorisation et la rétention à long terme."
  },
  "homepage.name": {
    "ar": "الاسم",
    "fr": "Nom"
  },
  "homepage.record_a_verse_review_the_highlighted_issues_and_k": {
    "ar": "سجّل آية، راجع المشكلات المميزة، واجعل الجلسة التالية مركّزة على ما يحتاج عملاً فعلاً.",
    "fr": "Enregistrez un verset, examinez les problèmes signalés et gardez la prochaine session centrée sur ce qui demande vraiment du travail."
  },
  "homepage.focused_quran_memorisation_tools_for_recitation_ch": {
    "ar": "أدوات حفظ قرآن مركّزة لفحوص التلاوة وتخطيط المراجعة والممارسة اليومية الثابتة.",
    "fr": "Outils de mémorisation du Coran axés sur les vérifications de récitation, la planification de révision et une pratique quotidienne régulière."
  },
  "homepage.roadmap": {
    "ar": "خارطة الطريق",
    "fr": "Feuille de route"
  },
  "homepage.tajweed_guide": {
    "ar": "دليل التجويد",
    "fr": "Guide du tajweed"
  },
  "homepage.memorization_tips": {
    "ar": "نصائح الحفظ",
    "fr": "Conseils de mémorisation"
  },
  "homepage.help_center": {
    "ar": "مركز المساعدة",
    "fr": "Centre d'aide"
  },
  "homepage.all_rights_reserved": {
    "ar": "© جميع الحقوق محفوظة",
    "fr": "© Tous droits réservés"
  },
  "memorisation.reading.translation": {
    "ar": "الترجمة",
    "fr": "Traduction"
  },
  "memorisation.reading.transliteration": {
    "ar": "النسخ الصوتي",
    "fr": "Translittération"
  },
  "memorisation.reading.fullScreen": {
    "ar": "ملء الشاشة",
    "fr": "Plein écran"
  },
  "memorisation.reading.font": {
    "ar": "الخط",
    "fr": "Police"
  },
  "memorisation.reading.theme": {
    "ar": "السمة",
    "fr": "Thème"
  },
  "memorisation.reading.border": {
    "ar": "الإطار",
    "fr": "Bordure"
  },
  "memorisation.reading.aiMemory": {
    "ar": "ذاكرة الذكاء الاصطناعي",
    "fr": "Mémoire IA"
  },
  "memorisation.badges.new": {
    "ar": "جديد",
    "fr": "Nouveau"
  },
  "memorisation.badges.weak": {
    "ar": "يحتاج مراجعة",
    "fr": "À revoir"
  },
  "memorisation.badges.steady": {
    "ar": "مستقر",
    "fr": "Stable"
  },
  "memorisation.badges.active": {
    "ar": "الآية النشطة",
    "fr": "Ayah active"
  },
  "memorisation.due": {
    "ar": "مستحق",
    "fr": "À réviser"
  },
  "memorisation.audio.title": {
    "ar": "الصوت",
    "fr": "Audio"
  },
  "memorisation.planner.hifzPlan": {
    "ar": "خطة الحفظ",
    "fr": "Plan de hifz"
  },
  "memorisation.planner.todaysGoal": {
    "ar": "هدف اليوم",
    "fr": "Objectif du jour"
  },
  "memorisation.planner.memoryReview": {
    "ar": "مراجعة الذاكرة",
    "fr": "Révision mémorielle"
  },
  "memorisation.planner.sessionView": {
    "ar": "عرض الجلسة",
    "fr": "Vue de session"
  },
  "memorisation.view_recording": {
    "ar": "عرض التسجيل",
    "fr": "Voir l'enregistrement"
  },
  "memorisation.open_session_setup": {
    "ar": "فتح إعداد الجلسة",
    "fr": "Ouvrir la configuration de session"
  },
  "memorisation.open_controls": {
    "ar": "فتح عناصر التحكم",
    "fr": "Ouvrir les contrôles"
  },
  "memorisation.mushaf_page_is_preparing": {
    "ar": "صفحة المصحف قيد التحضير",
    "fr": "La page mushaf se prépare"
  },
  "memorisation.text": {
    "ar": "النص",
    "fr": "Texte"
  },
  "memorisation.session": {
    "ar": "الجلسة",
    "fr": "Session"
  },
  "memorisation.practice": {
    "ar": "التدريب",
    "fr": "Pratique"
  },
  "memorisation.saved": {
    "ar": "المحفوظ",
    "fr": "Enregistré"
  },
  "memorisation.insights": {
    "ar": "الرؤى",
    "fr": "Analyses"
  },
  "memorisation.view_and_font_controls_stay_here_while_planner_mod": {
    "ar": "عناصر العرض والخط تبقى هنا أثناء وضع المخطّط.",
    "fr": "Les contrôles d'affichage et de police restent ici en mode planificateur."
  },
  "memorisation.available_after_you_start_todays_session": {
    "ar": "متاح بعد بدء جلسة اليوم",
    "fr": "Disponible après le début de la session du jour"
  },
  "memorisation.mushaf_view_and_font_options_stay_hidden_until_the": {
    "ar": "خيارات المصحف والخط تبقى مخفية حتى تبدأ الجلسة.",
    "fr": "Les options mushaf et police restent masquées jusqu'au début de la session."
  },
  "memorisation.playback_settings": {
    "ar": "إعدادات التشغيل",
    "fr": "Paramètres de lecture"
  },
  "memorisation.speed": {
    "ar": "السرعة",
    "fr": "Vitesse"
  },
  "memorisation.use_slower_speed_for_early_memorisation": {
    "ar": "استخدم سرعة أبطأ في بداية الحفظ.",
    "fr": "Utilisez une vitesse plus lente au début de la mémorisation."
  },
  "memorisation.auto_advance": {
    "ar": "التقدّم التلقائي",
    "fr": "Avance automatique"
  },
  "memorisation.auto_moves_to_the_next_queue_item_when_audio_ends": {
    "ar": "ينتقل تلقائياً إلى العنصر التالي في الطابور عند انتهاء الصوت.",
    "fr": "Passe automatiquement à l'élément suivant de la file à la fin de l'audio."
  },
  "memorisation.delay_between_recitations_secs": {
    "ar": "التأخير بين التلاوات (ثوانٍ)",
    "fr": "Délai entre les récitations (sec.)"
  },
  "memorisation.pause_before_each_next_repetition_recitation_in_au": {
    "ar": "توقّف قبل كل تكرار/تلاوة تالية في الوضع التلقائي.",
    "fr": "Pause avant chaque répétition/récitation suivante en mode auto."
  },
  "memorisation.focus_mode": {
    "ar": "وضع التركيز",
    "fr": "Mode focus"
  },
  "memorisation.reduce_distractions_around_the_active_ayah": {
    "ar": "قلّل المشتتات حول الآية النشطة",
    "fr": "Réduire les distractions autour de l'ayah active"
  },
  "memorisation.best_for_deep_memorisation_sessions": {
    "ar": "الأفضل لـ: جلسات حفظ عميقة",
    "fr": "Idéal pour : sessions de mémorisation approfondie"
  },
  "memorisation.focus_strength": {
    "ar": "قوة التركيز",
    "fr": "Intensité du focus"
  },
  "memorisation.higher_values_dim_non_active_verses_more_aggressiv": {
    "ar": "القيم الأعلى تخفّت الآيات غير النشطة بشكل أكبر.",
    "fr": "Des valeurs plus élevées atténuent davantage les versets inactifs."
  },
  "memorisation.blur_mode": {
    "ar": "وضع التمويه",
    "fr": "Mode flou"
  },
  "memorisation.progressive_concealment_for_active_recall": {
    "ar": "إخفاء تدريجي للاستذكار النشط",
    "fr": "Dissimulation progressive pour le rappel actif"
  },
  "memorisation.blurs_upcoming_verses_requiring_you_to_recall_them": {
    "ar": "يموّه الآيات القادمة ويطلب منك استذكارها قبل الكشف.",
    "fr": "Floute les versets à venir et vous demande de les rappeler avant de les révéler."
  },
  "memorisation.best_for_active_recall_testing": {
    "ar": "الأفضل لـ: اختبار الاستذكار النشط",
    "fr": "Idéal pour : test de rappel actif"
  },
  "memorisation.blur_intensity": {
    "ar": "شدة التمويه",
    "fr": "Intensité du flou"
  },
  "memorisation.hold": {
    "ar": "اضغط مطولاً",
    "fr": "Maintenir"
  },
  "memorisation.hover_or_long_press_to_peek_temporarily": {
    "ar": "، مرّر أو اضغط مطولاً للاطلاع مؤقتاً",
    "fr": ", survolez ou appuyez longuement pour jeter un coup d'œil temporairement"
  },
  "memorisation.chaining": {
    "ar": "التسلسل",
    "fr": "Enchaînement"
  },
  "memorisation.best_for_building_long_passages": {
    "ar": "الأفضل لـ: بناء مقاطع طويلة",
    "fr": "Idéal pour : construire de longs passages"
  },
  "memorisation.linking": {
    "ar": "الربط",
    "fr": "Liaison"
  },
  "memorisation.cumulative": {
    "ar": "تراكمي",
    "fr": "Cumulatif"
  },
  "memorisation.repeats_per_step": {
    "ar": "تكرار لكل خطوة",
    "fr": "Répétitions par étape"
  },
  "memorisation.number_of_times_to_repeat_each_chaining_step": {
    "ar": "عدد مرات تكرار كل خطوة تسلسل",
    "fr": "Nombre de répétitions de chaque étape d'enchaînement"
  },
  "memorisation.anchor_mode": {
    "ar": "وضع المراسي",
    "fr": "Mode ancrage"
  },
  "memorisation.mental_hooks_using_key_words": {
    "ar": "خطافات ذهنية بكلمات مفتاحية",
    "fr": "Accroches mentales avec mots-clés"
  },
  "memorisation.highlights_key_words_as_memory_anchors_to_help_rec": {
    "ar": "يبرز الكلمات المفتاحية كمراسي ذاكرة لمساعدة استذكار الآية كاملة.",
    "fr": "Met en évidence les mots-clés comme ancres mnémotechniques pour rappeler toute l'ayah."
  },
  "memorisation.best_for_memorising_key_vocabulary": {
    "ar": "الأفضل لـ: حفظ المفردات المفتاحية",
    "fr": "Idéal pour : mémoriser le vocabulaire clé"
  },
  "memorisation.anchor_points_per_ayah": {
    "ar": "نقاط مراسي لكل آية",
    "fr": "Points d'ancrage par ayah"
  },
  "memorisation.saved_sessions": {
    "ar": "الجلسات المحفوظة",
    "fr": "Sessions enregistrées"
  },
  "memorisation.each_session_keeps_only_the_essentials_what_it_is_": {
    "ar": "كل جلسة تحتفظ بالأساسيات فقط: ما هي، أين هي، وكيف تعود إليها.",
    "fr": "Chaque session ne garde que l'essentiel : ce qu'elle est, où elle en est et comment y revenir."
  },
  "memorisation.no_saved_sessions_yet": {
    "ar": "لا جلسات محفوظة بعد",
    "fr": "Aucune session enregistrée pour l'instant"
  },
  "memorisation.save_your_current_session_to_get_started": {
    "ar": "احفظ جلستك الحالية للبدء",
    "fr": "Enregistrez votre session actuelle pour commencer"
  },
  "memorisation.current_session": {
    "ar": "الجلسة الحالية",
    "fr": "Session en cours"
  },
  "memorisation.today_first_advanced_analytics_stay_tucked_away_un": {
    "ar": "اليوم أولاً. التحليلات المتقدمة تبقى مخفية حتى تطلبها.",
    "fr": "Aujourd'hui d'abord. Les analyses avancées restent discrètes jusqu'à ce que vous les demandiez."
  },
  "memorisation.show_advanced_metrics": {
    "ar": "عرض المقاييس المتقدمة",
    "fr": "Afficher les métriques avancées"
  },
  "memorisation.no_advanced_insights_yet": {
    "ar": "لا رؤى متقدمة بعد",
    "fr": "Pas encore d'analyses avancées"
  },
  "memorisation.save_a_session_and_you_ll_unlock_the_deeper_breakd": {
    "ar": "احفظ جلسة وستفتح التفصيل الأعمق هنا.",
    "fr": "Enregistrez une session pour débloquer l'analyse détaillée ici."
  },
  "memorisation.view_full_analytics": {
    "ar": "عرض التحليلات الكاملة",
    "fr": "Voir les analyses complètes"
  },
  "memorisation.english_arabic_or_french_ui": {
    "ar": "واجهة بالإنجليزية أو العربية أو الفرنسية",
    "fr": "Interface en anglais, arabe ou français"
  },
  "memorisation.edit_plan": {
    "ar": "تعديل الخطة",
    "fr": "Modifier le plan"
  },
  "memorisation.sync_progress": {
    "ar": "مزامنة التقدم",
    "fr": "Synchroniser la progression"
  },
  "memorisation.structured_repetition": {
    "ar": "تكرار منظّم",
    "fr": "Répétition structurée"
  },
  "memorisation.resume_exactly": {
    "ar": "استئناف بالضبط",
    "fr": "Reprendre exactement"
  },
  "memorisation.what_a_mutqin_session_feels_like": {
    "ar": "كيف تبدو جلسة متقن",
    "fr": "À quoi ressemble une session Mutqin"
  },
  "memorisation.short_enough_to_stay_focused_structured_enough_to_": {
    "ar": "قصيرة بما يكفي للتركيز. منظّمة بما يكفي لتسهيل العودة للحفظ طويل الأمد.",
    "fr": "Assez courte pour rester concentré. Assez structurée pour faciliter la mémorisation à long terme."
  },
  "memorisation.choose_your_ayahs": {
    "ar": "اختر آياتك",
    "fr": "Choisissez vos ayahs"
  },
  "memorisation.pick_the_surah_range_and_reciter": {
    "ar": "اختر السورة والنطاق والقارئ.",
    "fr": "Choisissez la sourate, la plage et le récitateur."
  },
  "memorisation.repeat_with_structure": {
    "ar": "كرّر ببنية",
    "fr": "Répéter avec structure"
  },
  "memorisation.use_playback_chaining_focus_and_blur_tools": {
    "ar": "استخدم التشغيل والتسلسل والتركيز والتمويه.",
    "fr": "Utilisez la lecture, l'enchaînement, le focus et le flou."
  },
  "memorisation.recall_and_review": {
    "ar": "استذكار ومراجعة",
    "fr": "Rappel et révision"
  },
  "memorisation.track_what_was_covered_and_return_later_with_clari": {
    "ar": "تتبّع ما غطّيت وعد لاحقاً بوضوح.",
    "fr": "Suivez ce qui a été couvert et revenez plus tard avec clarté."
  },
  "memorisation.how_mutqin_stays_focused": {
    "ar": "كيف يبقى متقن مركّزاً",
    "fr": "Comment Mutqin reste concentré"
  },
  "memorisation.everything_centres_on_one_calm_memorisation_sessio": {
    "ar": "كل شيء يدور حول جلسة حفظ هادئة واحدة في كل مرة",
    "fr": "Tout tourne autour d'une session de mémorisation calme à la fois"
  },
  "memorisation.choose_a_small_range_repeat_with_structure_then_re": {
    "ar": "اختر نطاقاً صغيراً، كرّر ببنية، ثم عد للاستذكار والمراجعة دون فوضى لوحة التحكم.",
    "fr": "Choisissez une petite plage, répétez avec structure, puis revenez pour le rappel et la révision sans encombrement."
  },
  "memorisation.focused_ayah_ranges": {
    "ar": "نطاقات آيات مركّزة",
    "fr": "Plages d'ayahs ciblées"
  },
  "memorisation.work_in_smaller_sections_that_are_easier_to_repeat": {
    "ar": "اعمل في أقسام أصغر يسهل تكرارها جيداً.",
    "fr": "Travaillez en sections plus petites, plus faciles à bien répéter."
  },
  "memorisation.clear_repetition": {
    "ar": "تكرار واضح",
    "fr": "Répétition claire"
  },
  "memorisation.keep_your_session_steady_instead_of_guessing_how_m": {
    "ar": "حافظ على جلستك ثابتة بدلاً من تخمين عدد مرات التكرار.",
    "fr": "Gardez votre session régulière au lieu de deviner combien de fois répéter."
  },
  "memorisation.recall_with_less_clutter": {
    "ar": "استذكار بفوضى أقل",
    "fr": "Rappel avec moins d'encombrement"
  },
  "memorisation.use_only_the_aids_and_techniques_that_support_the_": {
    "ar": "استخدم فقط المساعدات والتقنيات التي تدعم المقطع الحالي.",
    "fr": "Utilisez uniquement les aides et techniques qui soutiennent le passage actuel."
  },
  "memorisation.progress_you_can_revisit": {
    "ar": "تقدم يمكنك العودة إليه",
    "fr": "Une progression que vous pouvez revisiter"
  },
  "memorisation.saved_sessions_and_compact_insights_stay_ready_whe": {
    "ar": "الجلسات المحفوظة والرؤى المختصرة تبقى جاهزة عند عودتك.",
    "fr": "Les sessions enregistrées et les analyses compactes restent prêtes à votre retour."
  },
  "memorisation.save_memorisation_session": {
    "ar": "حفظ جلسة الحفظ",
    "fr": "Enregistrer la session de mémorisation"
  },
  "memorisation.name_this_session_so_you_can_find_it_again_later": {
    "ar": "سمّ هذه الجلسة لتجدها لاحقاً.",
    "fr": "Nommez cette session pour la retrouver plus tard."
  },
  "memorisation.session_name": {
    "ar": "اسم الجلسة",
    "fr": "Nom de la session"
  },
  "memorisation.save_session": {
    "ar": "حفظ الجلسة",
    "fr": "Enregistrer la session"
  },
  "memorisation.end_this_session_now": {
    "ar": "إنهاء هذه الجلسة الآن؟",
    "fr": "Terminer cette session maintenant ?"
  },
  "memorisation.prepare_yourself": {
    "ar": "استعد",
    "fr": "Préparez-vous"
  },
  "memorisation.session_finished": {
    "ar": "انتهت الجلسة",
    "fr": "Session terminée"
  },
  "memorisation.congratulations_todays_hifz_session_is_complete": {
    "ar": "تهانينا. اكتملت جلسة حفظ اليوم.",
    "fr": "Félicitations. La session de hifz du jour est terminée."
  },
  "memorisation.memorised_today": {
    "ar": "حُفظ اليوم",
    "fr": "Mémorisé aujourd'hui"
  },
  "memorisation.new_ayahs": {
    "ar": "آيات جديدة",
    "fr": "Nouvelles ayahs"
  },
  "memorisation.todays_goal": {
    "ar": "هدف اليوم",
    "fr": "Objectif du jour"
  },
  "memorisation.next_review": {
    "ar": "المراجعة التالية",
    "fr": "Prochaine révision"
  },
  "memorisation.view_plan": {
    "ar": "عرض الخطة",
    "fr": "Voir le plan"
  },
  "memorisation.session_analytics_overview": {
    "ar": "نظرة عامة على تحليلات الجلسة",
    "fr": "Aperçu des analyses de session"
  },
  "memorisation.preparing_analytics": {
    "ar": "جاري تحضير التحليلات...",
    "fr": "Préparation des analyses..."
  },
  "memorisation.recite_check_results": {
    "ar": "نتائج فحص التلاوة",
    "fr": "Résultats du contrôle de récitation"
  },
  "memorisation.saved_word_checks_for_this_session_range": {
    "ar": "فحوص الكلمات المحفوظة لنطاق هذه الجلسة.",
    "fr": "Contrôles de mots enregistrés pour la plage de cette session."
  },
  "memorisation.what_next": {
    "ar": "ماذا بعد؟",
    "fr": "Et ensuite ?"
  },
  "memorisation.deterministic_replay": {
    "ar": "إعادة تشغيل حتمية",
    "fr": "Relecture déterministe"
  },
  "memorisation.recitation_confidence_heatmap": {
    "ar": "خريطة حرارية لثقة التلاوة",
    "fr": "Carte thermique de confiance en récitation"
  },
  "memorisation.most_improved": {
    "ar": "الأكثر تحسناً:",
    "fr": "Le plus amélioré :"
  },
  "memorisation.needs_focus": {
    "ar": "يحتاج تركيزاً:",
    "fr": "Nécessite de l'attention :"
  },
  "memorisation.ayah_activity": {
    "ar": "نشاط الآيات",
    "fr": "Activité des ayahs"
  },
  "memorisation.verse_plays_across_the_selected_range": {
    "ar": "مرات تشغيل الآيات في النطاق المختار.",
    "fr": "Lectures de versets dans la plage sélectionnée."
  },
  "memorisation.play_ayah_audio_to_populate_the_activity_chart": {
    "ar": "شغّل صوت الآية لملء مخطط النشاط.",
    "fr": "Lisez l'audio de l'ayah pour remplir le graphique d'activité."
  },
  "memorisation.most_replayed_ayahs": {
    "ar": "الآيات الأكثر إعادة تشغيلاً",
    "fr": "Ayahs les plus relues"
  },
  "memorisation.quick_view_of_where_repetition_is_concentrating": {
    "ar": "نظرة سريعة على أين يركّز التكرار.",
    "fr": "Aperçu rapide de la concentration des répétitions."
  },
  "memorisation.no_ayah_replay_data_available_yet": {
    "ar": "لا بيانات إعادة تشغيل للآيات بعد",
    "fr": "Pas encore de données de relecture d'ayahs"
  },
  "memorisation.session_playback_balance": {
    "ar": "توازن تشغيل الجلسة",
    "fr": "Équilibre de lecture de session"
  },
  "memorisation.see_how_evenly_audio_attention_is_spread_across_th": {
    "ar": "اعرف مدى توزيع الانتباه الصوتي بالتساوي على النطاق المختار.",
    "fr": "Voyez comment l'attention audio est répartie sur la plage sélectionnée."
  },
  "memorisation.playback_balance_appears_after_ayah_audio_starts": {
    "ar": "يظهر توازن التشغيل بعد بدء صوت الآية.",
    "fr": "L'équilibre de lecture apparaît après le début de l'audio de l'ayah."
  },
  "memorisation.advanced_metrics": {
    "ar": "مقاييس متقدمة",
    "fr": "Métriques avancées"
  },
  "memorisation.session_signals_review_health_cards_graphs_and_cha": {
    "ar": "إشارات الجلسة، صحة المراجعة، البطاقات، الرسوم البيانية والمخططات.",
    "fr": "Signaux de session, santé de révision, cartes, graphiques et diagrammes."
  },
  "memorisation.save_a_session_to_unlock_full_per_session_analytic": {
    "ar": "احفظ جلسة لفتح التحليلات الكاملة لكل جلسة.",
    "fr": "Enregistrez une session pour débloquer les analyses complètes par session."
  },
  "memorisation.compact_breakdown_for_this_metric_group": {
    "ar": "تفصيل مختصر لمجموعة المقاييس هذه.",
    "fr": "Répartition compacte pour ce groupe de métriques."
  },
  "memorisation.ai_memorisation_review": {
    "ar": "مراجعة الحفظ بالذكاء الاصطناعي",
    "fr": "Révision de mémorisation IA"
  },
  "memorisation.ayah_display": {
    "ar": "عرض الآية",
    "fr": "Affichage de l'ayah"
  },
  "memorisation.recite_from_memory": {
    "ar": "تلاوة من الذاكرة",
    "fr": "Réciter de mémoire"
  },
  "memorisation.blur_everything": {
    "ar": "تمويه الكل",
    "fr": "Tout flouter"
  },
  "memorisation.peek": {
    "ar": "اطّلع",
    "fr": "Aperçu"
  },
  "memorisation.memorisation_review": {
    "ar": "مراجعة الحفظ",
    "fr": "Révision de mémorisation"
  },
  "memorisation.live": {
    "ar": "مباشر",
    "fr": "En direct"
  },
  "memorisation.stop_check": {
    "ar": "إيقاف الفحص",
    "fr": "Arrêter le contrôle"
  },
  "memorisation.checking_the_recording": {
    "ar": "جاري فحص التسجيل...",
    "fr": "Vérification de l'enregistrement..."
  },
  "memorisation.ai_memorisation_feedback_is_a_guide_verify_importa": {
    "ar": "تغذية راجعة الحفظ بالذكاء الاصطناعي دليل. تحقق من الأخطاء المهمة مقابل الآية قبل الحفظ أو إعادة التعيين.",
    "fr": "Le retour IA sur la mémorisation est un guide. Vérifiez les erreurs importantes par rapport à l'ayah avant d'enregistrer ou de réinitialiser."
  },
  "memorisation.reset_ayah": {
    "ar": "إعادة تعيين الآية",
    "fr": "Réinitialiser l'ayah"
  },
  "memorisation.save_attempt": {
    "ar": "حفظ المحاولة",
    "fr": "Enregistrer la tentative"
  },
  "memorisation.press_and_hold_the_ayah_below_to_peek_release_to_h": {
    "ar": "اضغط مطولاً على الآية أدناه للاطلاع · ارفع إصبعك لإخفائها مجدداً",
    "fr": "Appuyez longuement sur l'ayah ci-dessous pour un aperçu · relâchez pour la masquer à nouveau"
  },
  "memorisation.recitation_review": {
    "ar": "مراجعة التلاوة",
    "fr": "Révision de récitation"
  },
  "memorisation.open_recordings": {
    "ar": "فتح التسجيلات",
    "fr": "Ouvrir les enregistrements"
  },
  "memorisation.recording_is_not_available_in_this_browser": {
    "ar": "التسجيل غير متاح في هذا المتصفح.",
    "fr": "L'enregistrement n'est pas disponible dans ce navigateur."
  },
  "memorisation.recite_check": {
    "ar": "فحص التلاوة",
    "fr": "Contrôle de récitation"
  },
  "memorisation.use_the_ai_recite_tool_in_the_header_when_you_want": {
    "ar": "استخدم أداة التلاوة بالذكاء الاصطناعي في الشريط العلوي عندما تريد البدء.",
    "fr": "Utilisez l'outil de récitation IA dans l'en-tête lorsque vous voulez commencer."
  },
  "memorisation.what_to_do_next": {
    "ar": "ماذا تفعل بعد ذلك؟",
    "fr": "Que faire ensuite ?"
  },
  "memorisation.ai_review_check": {
    "ar": "فحص مراجعة الذكاء الاصطناعي",
    "fr": "Contrôle de révision IA"
  },
  "memorisation.saved_to_your_recordings_library_for_this_ayah": {
    "ar": "حُفظ في مكتبة تسجيلاتك لهذه الآية.",
    "fr": "Enregistré dans votre bibliothèque pour cette ayah."
  },
  "memorisation.go_to_recording_library": {
    "ar": "الذهاب إلى مكتبة التسجيلات",
    "fr": "Aller à la bibliothèque d'enregistrements"
  },
  "memorisation.ai_recitation_feedback_is_a_guide_verify_important": {
    "ar": "تغذية راجعة التلاوة بالذكاء الاصطناعي دليل. تحقق من الأخطاء المهمة مقابل الآية قبل الحفظ أو إعادة التعيين.",
    "fr": "Le retour IA sur la récitation est un guide. Vérifiez les erreurs importantes par rapport à l'ayah avant d'enregistrer ou de réinitialiser."
  },
  "memorisation.recording_now": {
    "ar": "جاري التسجيل",
    "fr": "Enregistrement en cours"
  },
  "memorisation.stop_recording": {
    "ar": "إيقاف التسجيل",
    "fr": "Arrêter l'enregistrement"
  },
  "memorisation.review_this_attempt": {
    "ar": "مراجعة هذه المحاولة",
    "fr": "Revoir cette tentative"
  },
  "memorisation.self_rating": {
    "ar": "تقييم ذاتي",
    "fr": "Auto-évaluation"
  },
  "memorisation.record_again": {
    "ar": "تسجيل مجدداً",
    "fr": "Enregistrer à nouveau"
  },
  "memorisation.recordings_library": {
    "ar": "مكتبة التسجيلات",
    "fr": "Bibliothèque d'enregistrements"
  },
  "memorisation.back_to_self_check": {
    "ar": "العودة للفحص الذاتي",
    "fr": "Retour à l'auto-contrôle"
  },
  "memorisation.loading_recordings": {
    "ar": "جاري تحميل التسجيلات…",
    "fr": "Chargement des enregistrements…"
  },
  "memorisation.no_recordings_yet": {
    "ar": "لا تسجيلات بعد",
    "fr": "Aucun enregistrement pour l'instant"
  },
  "memorisation.saved_session": {
    "ar": "جلسة محفوظة",
    "fr": "Session enregistrée"
  },
  "memorisation.selected_ayah": {
    "ar": "الآية المختارة",
    "fr": "Ayah sélectionnée"
  },
  "memorisation.ai_check": {
    "ar": "فحص الذكاء الاصطناعي",
    "fr": "Contrôle IA"
  },
  "memorisation.skip": {
    "ar": "تخطّ",
    "fr": "Passer"
  },
  "memorisation.next": {
    "ar": "التالي",
    "fr": "Suivant"
  },
  "memorisation.enter_a_minimum_of_3_words_results_match_the_same_": {
    "ar": "أدخل 3 كلمات على الأقل. النتائج تطابق نفس المقطع في النص العربي أو الترجمة.",
    "fr": "Entrez au moins 3 mots. Les résultats correspondent au même passage en arabe ou en traduction."
  },
  "memorisation.any_surah": {
    "ar": "أي سورة",
    "fr": "Toute sourate"
  },
  "memorisation.loading_quran_search_index": {
    "ar": "جاري تحميل فهرس بحث القرآن...",
    "fr": "Chargement de l'index de recherche du Coran..."
  },
  "memorisation.no_matching_ayahs_found_for_this_passage_and_filte": {
    "ar": "لم تُعثر على آيات مطابقة لهذا المقطع والتصفية.",
    "fr": "Aucune ayah correspondante pour ce passage et ce filtre."
  },
  "aboutUs.kicker": {
    "ar": "عن متقن",
    "fr": "À propos de Mutqin"
  },
  "aboutUs.built_for_focused_quran_practice": {
    "ar": "مصمّم لممارسة قرآنية مركّزة.",
    "fr": "Conçu pour une pratique coranique concentrée."
  },
  "aboutUs.calm_study_flow": {
    "ar": "تدفّق دراسة هادئ",
    "fr": "Flux d'étude calme"
  },
  "aboutUs.revision_led_learning": {
    "ar": "تعلّم يقوده المراجعة",
    "fr": "Apprentissage guidé par la révision"
  },
  "aboutUs.built_around_consistency": {
    "ar": "مبني على الاستمرارية",
    "fr": "Construit autour de la régularité"
  },
  "aboutUs.why_people_stay": {
    "ar": "لماذا يبقى الناس",
    "fr": "Pourquoi les gens restent"
  },
  "aboutUs.less_friction_clearer_progress_better_return_point": {
    "ar": "احتكاك أقل، تقدم أوضح، نقاط عودة أفضل.",
    "fr": "Moins de friction, progression plus claire, meilleurs points de retour."
  },
  "aboutUs.session_setup_is_simple_enough_for_daily_use": {
    "ar": "إعداد الجلسة بسيط بما يكفي للاستخدام اليومي.",
    "fr": "La configuration de session est assez simple pour un usage quotidien."
  },
  "aboutUs.revision_signals_help_learners_revisit_what_needs_": {
    "ar": "إشارات المراجعة تساعد المتعلمين على إعادة ما يحتاج اهتماماً.",
    "fr": "Les signaux de révision aident les apprenants à revisiter ce qui demande attention."
  },
  "aboutUs.the_interface_stays_focused_instead_of_overwhelmin": {
    "ar": "الواجهة تبقى مركّزة بدلاً من أن تكون مربكة.",
    "fr": "L'interface reste concentrée au lieu d'être écrasante."
  },
  "aboutUs.why_it_exists": {
    "ar": "لماذا وُجد",
    "fr": "Pourquoi il existe"
  },
  "aboutUs.what_it_does": {
    "ar": "ماذا يفعل",
    "fr": "Ce qu'il fait"
  },
  "aboutUs.what_it_respects": {
    "ar": "ما يحترمه",
    "fr": "Ce qu'il respecte"
  },
  "aboutUs.the_product_principle": {
    "ar": "مبدأ المنتج",
    "fr": "Le principe du produit"
  },
  "aboutUs.focused_workflow": {
    "ar": "سير عمل مركّز",
    "fr": "Flux de travail concentré"
  },
  "aboutUs.reliable_revision": {
    "ar": "مراجعة موثوقة",
    "fr": "Révision fiable"
  },
  "aboutUs.cleaner_decisions": {
    "ar": "قرارات أوضح",
    "fr": "Décisions plus claires"
  },
  "mission.kicker": {
    "ar": "مهمتنا",
    "fr": "Notre mission"
  },
  "mission.make_consistent_quran_practice_easier_to_understan": {
    "ar": "جعل ممارسة القرآن المنتظمة أسهل للفهم.",
    "fr": "Rendre la pratique régulière du Coran plus facile à comprendre."
  },
  "mission.what_that_means": {
    "ar": "ماذا يعني ذلك",
    "fr": "Ce que cela signifie"
  },
  "mission.clear_entry_point": {
    "ar": "نقطة دخول واضحة",
    "fr": "Point d'entrée clair"
  },
  "mission.beginners_should_know_what_to_do_in_the_first_minu": {
    "ar": "يجب أن يعرف المبتدئون ماذا يفعلون في الدقيقة الأولى.",
    "fr": "Les débutants doivent savoir quoi faire dans la première minute."
  },
  "mission.reliable_revision_loop": {
    "ar": "حلقة مراجعة موثوقة",
    "fr": "Boucle de révision fiable"
  },
  "mission.weak_ayahs_should_surface_before_they_become_large": {
    "ar": "يجب أن تظهر الآيات الضعيفة قبل أن تصبح فجوات أكبر.",
    "fr": "Les ayahs faibles doivent remonter avant de devenir de grands écarts."
  },
  "mission.respect_for_real_study": {
    "ar": "احترام الدراسة الحقيقية",
    "fr": "Respect de l'étude réelle"
  },
  "mission.the_product_should_support_teachers_halaqah_and_pe": {
    "ar": "يجب أن يدعم المنتج المعلّمين والحلقات والروتين الشخصي.",
    "fr": "Le produit doit soutenir les enseignants, les halaqah et les routines personnelles."
  },
  "mission.lower_the_barrier": {
    "ar": "خفض الحاجز",
    "fr": "Abaisser la barrière"
  },
  "mission.make_the_first_minute_simple_enough_for_beginners_": {
    "ar": "اجعل الدقيقة الأولى بسيطة بما يكفي للمبتدئين وثابتة بما يكفي للعائدين.",
    "fr": "Rendre la première minute assez simple pour les débutants et assez stable pour les apprenants qui reviennent."
  },
  "mission.improve_retention": {
    "ar": "تحسين الاحتفاظ",
    "fr": "Améliorer la rétention"
  },
  "mission.surface_weak_ayahs_before_they_turn_into_larger_re": {
    "ar": "أظهر الآيات الضعيفة قبل أن تتحول إلى فجوات مراجعة أكبر يصعب التعافي منها.",
    "fr": "Faire remonter les ayahs faibles avant qu'elles ne deviennent de grands écarts de révision difficiles à rattraper."
  },
  "mission.respect_real_study": {
    "ar": "احترام الدراسة الحقيقية",
    "fr": "Respecter l'étude réelle"
  },
  "mission.fit_naturally_alongside_a_teacher_halaqah_or_perso": {
    "ar": "يتكامل طبيعياً مع معلّم أو حلقة أو روتين شخصي دون ضجيج غير ضروري.",
    "fr": "S'intègre naturellement avec un enseignant, une halaqah ou une routine personnelle sans bruit inutile."
  },
  "mission.how_success_looks": {
    "ar": "كيف يبدو النجاح",
    "fr": "À quoi ressemble le succès"
  },
  "mission.simpler_starts": {
    "ar": "بدايات أبسط",
    "fr": "Des départs plus simples"
  },
  "mission.stronger_retention": {
    "ar": "احتفاظ أقوى",
    "fr": "Rétention plus forte"
  },
  "mission.more_confidence": {
    "ar": "ثقة أكبر",
    "fr": "Plus de confiance"
  },
  "donate.donate": {
    "ar": "تبرّع",
    "fr": "Faire un don"
  },
  "donate.support_a_simpler_memorisation_experience": {
    "ar": "ادعم تجربة حفظ أبسط.",
    "fr": "Soutenez une expérience de mémorisation plus simple."
  },
  "donate.product_maintenance": {
    "ar": "صيانة المنتج",
    "fr": "Maintenance du produit"
  },
  "donate.faster_iteration": {
    "ar": "تطوير أسرع",
    "fr": "Itération plus rapide"
  },
  "donate.better_student_experience": {
    "ar": "تجربة طالب أفضل",
    "fr": "Meilleure expérience étudiante"
  },
  "donate.support_focus": {
    "ar": "دعم التركيز",
    "fr": "Soutenir le focus"
  },
  "donate.fund_the_next_practical_improvements_students_feel": {
    "ar": "موّل التحسينات العملية التالية التي يشعر بها الطلاب فوراً.",
    "fr": "Financez les prochaines améliorations pratiques que les étudiants ressentent immédiatement."
  },
  "donate.flexible": {
    "ar": "مرن",
    "fr": "Flexible"
  },
  "donate.one_time_support": {
    "ar": "دعم لمرة واحدة",
    "fr": "Soutien ponctuel"
  },
  "donate.help_with_ongoing_improvements_maintenance_and_car": {
    "ar": "ساعد في التحسينات المستمرة والصيانة والصقل الدقيق عبر المنصة.",
    "fr": "Aidez aux améliorations continues, à la maintenance et au peaufinage soigné de la plateforme."
  },
  "donate.monthly_support": {
    "ar": "دعم شهري",
    "fr": "Soutien mensuel"
  },
  "donate.support_steady_iteration_on_onboarding_revision_an": {
    "ar": "ادعم التطوير المستمر في الإعداد الأولي والمراجعة وسهولة الاستخدام بمساهمة متوقعة.",
    "fr": "Soutenez l'itération régulière sur l'intégration, la révision et l'ergonomie avec une contribution prévisible."
  },
  "donate.targeted": {
    "ar": "موجّه",
    "fr": "Ciblé"
  },
  "donate.project_support": {
    "ar": "دعم مشروع",
    "fr": "Soutien de projet"
  },
  "donate.back_focused_improvements_for_a_specific_part_of_t": {
    "ar": "ادعم تحسينات مركّزة لجزء محدد من تجربة متقن يحتاج اهتماماً إضافياً.",
    "fr": "Soutenez des améliorations ciblées pour une partie spécifique de l'expérience Mutqin qui demande plus d'attention."
  },
  "donate.start_the_conversation": {
    "ar": "ابدأ المحادثة",
    "fr": "Commencer la conversation"
  },
  "donate.if_you_want_to_support_mutqin_contact_us_with_the_": {
    "ar": "إذا أردت دعم متقن، تواصل معنا بموضوع \"Donation\".",
    "fr": "Si vous souhaitez soutenir Mutqin, contactez-nous avec l'objet « Donation »."
  },
  "donate.contact_us": {
    "ar": "تواصل معنا",
    "fr": "Contactez-nous"
  },
  "hifzPlan.choose_your_daily_goal": {
    "ar": "اختر هدفك اليومي",
    "fr": "Choisissez votre objectif quotidien"
  },
  "hifzPlan.choose_how_many_new_ayahs_you_want_to_learn_each_d": {
    "ar": "اختر عدد الآيات الجديدة التي تريد تعلّمها كل يوم.",
    "fr": "Choisissez combien de nouvelles ayahs vous voulez apprendre chaque jour."
  },
  "hifzPlan.surah": {
    "ar": "السورة",
    "fr": "Sourate"
  },
  "hifzPlan.daily_ayahs": {
    "ar": "آيات يومية",
    "fr": "Ayahs quotidiennes"
  },
  "hifzPlan.from": {
    "ar": "من",
    "fr": "De"
  },
  "hifzPlan.pick_your_learning_style": {
    "ar": "اختر أسلوب تعلّمك",
    "fr": "Choisissez votre style d'apprentissage"
  },
  "hifzPlan.pick_the_pace_that_feels_realistic_for_your_daily_": {
    "ar": "اختر الوتيرة الواقعية لروتينك اليومي.",
    "fr": "Choisissez le rythme réaliste pour votre routine quotidienne."
  },
  "hifzPlan.set_your_study_flow": {
    "ar": "حدّد تدفّق دراستك",
    "fr": "Définissez votre flux d'étude"
  },
  "hifzPlan.tell_mutqin_what_to_focus_on_first_during_each_ses": {
    "ar": "أخبر متقن بما يركّز عليه أولاً في كل جلسة.",
    "fr": "Dites à Mutqin sur quoi se concentrer en premier pendant chaque session."
  },
  "hifzPlan.choose_your_support_level": {
    "ar": "اختر مستوى الدعم",
    "fr": "Choisissez votre niveau de soutien"
  },
  "hifzPlan.choose_how_much_checking_and_guidance_you_want_dur": {
    "ar": "اختر مقدار الفحص والتوجيه الذي تريده أثناء التدريب.",
    "fr": "Choisissez le niveau de contrôle et de guidance souhaité pendant la pratique."
  },
  "hifzPlan.set_your_playback": {
    "ar": "حدّد التشغيل",
    "fr": "Configurez la lecture"
  },
  "hifzPlan.choose_how_many_repeats_which_reciter_and_the_play": {
    "ar": "اختر عدد التكرارات والقارئ وسرعة التشغيل لكل آية.",
    "fr": "Choisissez le nombre de répétitions, le récitateur et la vitesse de lecture pour chaque ayah."
  },
  "hifzPlan.repeats_per_ayah": {
    "ar": "تكرار لكل آية",
    "fr": "Répétitions par ayah"
  },
  "hifzPlan.reciter": {
    "ar": "القارئ",
    "fr": "Récitateur"
  },
  "hifzPlan.playback_speed": {
    "ar": "سرعة التشغيل",
    "fr": "Vitesse de lecture"
  },
  "hifzPlan.your_hifz_journey_is_ready": {
    "ar": "رحلة حفظك جاهزة",
    "fr": "Votre parcours de hifz est prêt"
  },
  "hifzPlan.review_todays_pace_then_start_and_let_mutqin_guide": {
    "ar": "راجع وتيرة اليوم، ثم ابدأ ودع متقن يرشد الجلسة الأولى تلقائياً.",
    "fr": "Revoyez le rythme du jour, puis démarrez et laissez Mutqin guider la première session automatiquement."
  },
  "hifzPlan.when_you_start_the_timer_audio_and_ayah_highlighti": {
    "ar": "عند البدء، يبدأ المؤقت والصوت وتمييز الآية تلقائياً.",
    "fr": "Au démarrage, le minuteur, l'audio et la surbrillance de l'ayah commencent automatiquement."
  }
}


function flattenLeaves(obj, prefix = '') {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flattenLeaves(v, key))
    else out[key] = v
  }
  return out
}

function setNestedValue(root, flatKey, value) {
  const parts = flatKey.split('.')
  let node = root
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (!node[part] || typeof node[part] !== 'object' || Array.isArray(node[part])) node[part] = {}
    node = node[part]
  }
  node[parts[parts.length - 1]] = value
}

function hasLatin(text) {
  return typeof text === 'string' && /[A-Za-z]/.test(text)
}

function isTargetKey(key) {
  return TARGET_NAMESPACES.some(ns => key === ns || key.startsWith(`${ns}.`))
}

function applyTranslations() {
  const en = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en.json'), 'utf8'))
  const ar = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'ar.json'), 'utf8'))
  const fr = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'fr.json'), 'utf8'))
  const enFlat = flattenLeaves(en)
  const arFlat = flattenLeaves(ar)
  const frFlat = flattenLeaves(fr)
  let arCount = 0
  let frCount = 0

  for (const [key, enValue] of Object.entries(enFlat)) {
    if (!isTargetKey(key)) continue
    if (arFlat[key] !== enValue) continue
    if (!hasLatin(enValue)) continue
    const entry = TRANSLATIONS[key]
    if (!entry) continue

    if (entry.ar) {
      setNestedValue(ar, key, entry.ar)
      arCount++
    }
    if (entry.fr && frFlat[key] === enValue) {
      setNestedValue(fr, key, entry.fr)
      frCount++
    }
  }

  fs.writeFileSync(path.join(LOCALES_DIR, 'ar.json'), `${JSON.stringify(ar, null, 2)}\n`, 'utf8')
  fs.writeFileSync(path.join(LOCALES_DIR, 'fr.json'), `${JSON.stringify(fr, null, 2)}\n`, 'utf8')
  return { arCount, frCount }
}

const { arCount, frCount } = applyTranslations()
console.log(`Translated ${arCount} keys in ar.json`)
console.log(`Translated ${frCount} keys in fr.json`)
