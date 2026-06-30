/**
 * Merge structured i18n keys into en/ar/fr locale JSON files.
 * Usage: node scripts/i18n-merge-structured-keys.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('.')
const structured = JSON.parse(fs.readFileSync(path.join(root, 'scripts/i18n-structured-keys.json'), 'utf8'))

function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) target[key] = {}
      deepMerge(target[key], value)
    } else {
      target[key] = value
    }
  }
  return target
}

function loadLocale(locale) {
  const file = path.join(root, `resources/js/locales/${locale}.json`)
  return { file, data: JSON.parse(fs.readFileSync(file, 'utf8')) }
}

function saveLocale(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
}

// Arabic translations for structured keys
const arStructured = {
  memorisation: {
    techniques: {
      focusDescription: 'يُخفت وضعية التركيز جميع الآيات غير النشطة، مما يساعدك على التركيز على الآية الحالية دون تشتيت.',
      chainingOffDescription: 'تشغيل الآيات المحددة بالترتيب دون سلسلة.',
      chainingCumulativeDescription: 'بناء مقاطع أطول بإضافة آية واحدة في كل مرة.',
      chainingLinkingDescription: 'تقوية الانتقالات بين الآيات المتجاورة.',
      chainingLinkingHint: 'تدرب على الآيات فردياً، ثم في أزواج.',
      chainingCumulativeHint: 'ابدأ بالآية الأولى، ثم أضف آية واحدة في كل مرة.',
      chainingOffSub: 'تشغيل الآيات المحددة بالترتيب دون سلسلة.',
      chainingCumulativeSub: 'بناء مقاطع متصلة أطول من الآية الأولى.',
      chainingLinkingSub: 'تدريب الانتقال بين الآيات المتجاورة.',
      chainingOffPreview: 'التدفق: الآيات المحددة بالترتيب، كل آية تُكرَّر {count} مرة.',
      chainingCumulativePreview: 'تدفق تراكمي: كرر 1، ثم 1-2، ثم 1-2-3. كل كتلة تُكرَّر {count} مرة.',
      chainingLinkingPreview: 'تدفق ربط: كرر الآية الحالية، ثم التالية، ثم كلاهما معاً. كل خطوة تُكرَّر {count} مرة.',
      chainingOffLabel: 'السلسلة متوقفة · {count} تكرار',
      chainingCumulativeLabel: 'تراكمي · {count} تكرار',
      chainingLinkingLabel: 'ربط · {count} تكرار',
      focusActiveDescription: 'تُخفت الآيات غير النشطة ليبقى التركيز على الآية الحالية.',
      blurActiveDescription: 'الآيات القادمة مخفية بضبابية {px}px للاسترجاع النشط.',
      chainingActiveDescription: '{count} تكرار لكل خطوة سلسلة.',
      cumulativeChaining: 'سلسلة تراكمية',
      linkingChaining: 'سلسلة ربط',
      anchorOffDescription: 'وضع المرساة متوقف · استخدم الكلمات المفتاحية كخطافات',
      anchorUsingDescription: 'استخدام {anchors} كمراسي ذهنية لكل آية',
      anchorFirstLast: 'أول/آخر كلمة',
      anchorKeyPairs: 'أزواج كلمات مفتاحية',
      anchorComplete: 'البنية الكاملة',
      chainingWhyCumulative: 'استخدمه عندما تريد بناء مقاطع أطول بإضافة آية واحدة في كل مرة.',
      chainingWhyLinking: 'استخدمه عندما تريد تقوية الانتقالات بين الآيات المتجاورة.',
      chainingNextCumulative: 'التالي: أضف آية واحدة إلى الكتلة',
      chainingNextLinking: 'التالي: فردي -> التالي -> زوج'
    },
    onboarding: {
      stepCounter: 'الخطوة {current} من {total}',
      finish: 'إنهاء',
      useSampleSession: 'استخدام جلسة نموذجية',
      steps: {
        setup: {
          title: 'إعداد جلسة',
          stepLabel: 'إعداد الجلسة',
          body: 'اختر سورة، حدد نطاق الآيات، واختر قارئاً من عناصر التحكم قبل البدء.',
          points: ['تبدأ الجلسة النموذجية بنطاق قصير', 'عدد التكرارات وسرعة التشغيل في عناصر التحكم', 'يمكنك إعادة فتح الإعداد في أي وقت'],
          previewTitle: 'مدخلات جلسة حقيقية',
          previewSubtitle: 'إعداد الجلسة موجود بالفعل في لوحة الأدوات.',
          previewItems: ['سورة', 'نطاق', 'قارئ']
        },
        reading: {
          title: 'اختر طريقة العرض',
          stepLabel: 'طريقة القراءة',
          body: 'بدّل بين العرض المكدّس ومصحف، ثم استخدم الترجمة والتجويد وعناصر الخط عند الحاجة.',
          points: ['أبقِ النص الرئيسي نظيفاً عندما لا تحتاج مساعدات', 'وضع المصحف يحافظ على تخطيط الصفحة', 'الخطوط متاحة من شريط الأدوات'],
          previewTitle: 'عناصر التحكم في القراءة',
          previewSubtitle: 'تبديل العرض ومساعدات القراءة مدمجة.',
          previewItems: ['مكدّس', 'مصحف', 'تجويد']
        },
        practice: {
          title: 'تدرب بالأدوات المدمجة',
          stepLabel: 'أدوات التدريب',
          body: 'استخدم وضع التركيز والضبابية والسلسلة والمرساة عندما تريد بنية أكثر حول الآية النشطة.',
          points: ['وضع التركيز يضيّق الانتباه على الآية النشطة', 'وضع الضبابية يخفي الآيات التالية', 'السلسلة ووضع المرساة يدعمان المقاطع الأصعب'],
          previewTitle: 'عناصر التحكم في التقنيات',
          previewSubtitle: 'تبويب التقنيات جزء من مساحة العمل.',
          previewItems: ['تركيز', 'ضبابية', 'مرساة']
        },
        review: {
          title: 'راجع وعد',
          stepLabel: 'مراجعة وعودة',
          body: 'الجلسات المحفوظة والتسجيلات والرؤى تقرب الجلسة التالية من الآيات التي تحتاج عملاً.',
          points: ['الجلسات المحفوظة تتيح الاستئناف', 'سجل التسجيلات يبقي المحاولات السابقة', 'فحص التلاوة والذاكرة متاحان دائماً'],
          previewTitle: 'ما يمكنك العودة إليه',
          previewSubtitle: 'المراجعة والاستئناف مدمجان في النظام.',
          previewItems: ['جلسات محفوظة', 'تسجيلات', 'رؤى']
        }
      }
    },
    analytics: {
      todayProgress: 'تقدم اليوم',
      todayProgressDesc: '{covered}/{total} آية مُغطاة.',
      streak: 'سلسلة',
      streakDesc: 'أيام دراسة متتالية.',
      memoryBreakdown: 'تفصيل الذاكرة',
      spacedHealth: 'صحة التكرار المتباعد',
      recitationQuality: 'جودة التلاوة',
      rowNew: 'جديد',
      rowDue: 'مستحق',
      rowWeak: 'ضعيف',
      rowMastered: 'متقن',
      rowQueuedToday: 'مجدول اليوم',
      rowReviewNow: 'راجع الآن',
      rowNeedsCare: 'يحتاج عناية',
      rowSteadyAyahs: 'آيات ثابتة',
      rowDueNow: 'مستحق الآن',
      rowUpcoming: 'قادم',
      rowReviews: 'مراجعات',
      rowScheduled: 'مجدول',
      rowAvgRetention: 'متوسط الاحتفاظ',
      rowLoad: 'حمل {load}',
      rowAvgQuality: 'متوسط الجودة',
      rowChecks: 'فحوصات',
      rowCompleted: 'مكتمل',
      rowReady: 'جاهز',
      noDataYet: 'لا بيانات بعد',
      noDataDetail: 'ابدأ جلسة لبناء التحليلات',
      defaultInsight: 'اجعل اليوم صغيراً ومتسقاً'
    },
    guided: {
      learn: 'تعلّم',
      practice: 'تدرب',
      recall: 'استرجع',
      review: 'راجع',
      listenFollow: 'استمع واتبع',
      tryReciting: 'جرّب التلاوة',
      continue: 'تابع',
      learnInstruction: 'استمع واتبع التلاوة.',
      practiceInstruction: 'جرّب التلاوة والآية مرئية جزئياً.',
      recallInstruction: 'استرجع الآية قبل المتابعة.',
      reviewInstruction: 'راجع الآيات المستحقة الآن.',
      defaultInstruction: 'تابع جلستك.',
      start: 'ابدأ',
      play: 'شغّل',
      chooseSurahHint: 'اختر سورة ونطاقاً، ثم ابدأ.',
      versesToReview: 'لديك {count} آيات للمراجعة.',
      reviewDueHint: 'راجع ما هو مستحق.',
      playActiveHint: 'شغّل الآية النشطة. استخدم الأدوات للترجمة وكلمة بكلمة.',
      kickerReview: '✨ وقت التنشيط',
      kickerPlaying: '🌙 حافظ على الإيقاع',
      kickerDefault: '🌿 ابدأ بالبسملة، أبقِ قلبك مع الآية',
      reviewBodyDue: 'لديك {count} آيات تنتظر المراجعة. راجعها بلطف.',
      reviewBodyDefault: 'عد إلى هذه الآية بمراجعة هادئة قبل المتابعة.',
      reviewBodySuffix: 'أبقِ لسانك وعينيك وقلبك معاً على هذه الآية.',
      beforeBegin: 'قبل أن تبدأ',
      duringSession: 'أثناء الجلسة',
      afterEachAyah: 'بعد كل آية',
      keepGoing: 'تابع',
      listenAndFollow: 'استمع واتبع.',
      reciteFirstReveal: 'تلِّ أولاً، ثم اكشف.',
      tryRecitingMinimal: 'جرّب التلاوة بأقل دعم.',
      reviewVersesDue: 'راجع ما هو مستحق.',
      versesDueCount: '{count} آيات للمراجعة.'
    },
    sessionEnd: {
      reviewInsights: 'راجع الرؤى',
      reviewInsightsDesc: 'اطلع على تحليلات جلستك',
      saveSession: 'احفظ الجلسة',
      saveSessionDesc: 'احتفظ بهذا النطاق المكتمل',
      resetRange: 'أعد النطاق',
      resetRangeDesc: 'شغّل نفس النطاق مرة أخرى',
      createSession: 'أنشئ جلسة جديدة',
      createSessionDesc: 'اختر سورة أو نطاقاً مختلفاً'
    },
    sessionType: {
      label: 'حفظ',
      nowPlaying: 'يُشغَّل الآن',
      session: 'جلسة',
      ayah: 'آية {n}',
      ayahLabel: 'آية',
      pause: 'إيقاف',
      startSession: 'ابدأ الجلسة',
      advanced: 'متقدم',
      beginner: 'مبتدئ',
      sessionExplanation: 'جلسة {mode} باستخدام {chaining}.'
    },
    common: {
      mushafSyncMessage: 'تم تحميل الآيات، لكن قائمة صفحات المصحف لم تتزامن بعد. عد إلى المكدّس أو أعد فتح الجلسة.',
      fullQuran: 'القرآن كاملاً',
      filterValue: 'قيمة التصفية',
      noSurah: 'لا سورة',
      currentSession: 'الجلسة الحالية',
      confirm: 'تأكيد',
      stop: 'إيقاف',
      savedAt: 'حُفظ {date}',
      lastOpened: 'آخر فتح {date}',
      rangeLabel: 'نطاق {start}-{end}',
      manualAdvance: 'تقدم يدوي',
      autoAdvance: 'تقدم تلقائي',
      plainSequence: 'تسلسل عادي',
      chainingLabel: 'سلسلة {method}',
      setupSummary: '{count}x تكرار، {mode}، {chaining}',
      noReadingAids: 'لا مساعدات قراءة نشطة',
      translationOn: 'الترجمة مفعّلة',
      transliterationOn: 'النسخ الصوتي مفعّل',
      wordByWordOn: 'كلمة بكلمة مفعّل',
      wordAudioOn: 'صوت الكلمات مفعّل',
      tajweedOn: 'التجويد مفعّل',
      fontLabel: 'خط {font}',
      modeLabel: 'وضع {label}'
    },
    search: {
      juzNumber: 'رقم الجزء',
      hizbNumber: 'رقم الحزب',
      pageNumber: 'رقم الصفحة',
      surah: 'سورة',
      ayahNumber: 'رقم الآية',
      wordPosition: 'موضع الكلمة',
      wordNumber: 'رقم الكلمة'
    },
    fonts: {
      uthmanic: 'عثماني حفص',
      amiri: 'أميري قرآن',
      naskh: 'نسخ نوتو',
      scheherazade: 'شهرزاد',
      lateef: 'لطيف'
    }
  },
  hifzPlan: {
    wizard: {
      editTitle: 'تعديل خطة الحفظ',
      createTitle: 'أنشئ خطة حفظك',
      savePlan: 'احفظ خطة الحفظ',
      startJourney: 'ابدأ رحلة الحفظ',
      chooseSurahPlaceholder: 'اختر سورة',
      createPlan: 'إنشاء خطة',
      stepCounter: 'الخطوة {current} من {total}',
      yourPlan: 'خطتك',
      to: 'إلى',
      ayahRange: 'نطاق الآيات',
      studyFlow: 'تدفق الدراسة',
      reciterLabel: 'القارئ',
      steps: {
        goal: { label: 'الهدف', headline: 'اختر هدف اليوم' },
        style: { label: 'الأسلوب', headline: 'اختر وتيرتك اليومية' },
        flow: { label: 'التدفق', headline: 'اختر تدفق دراستك' },
        support: { label: 'الدعم', headline: 'حدد مستوى الدعم' },
        playback: { label: 'التشغيل', headline: 'اختر إعداد التلاوة' },
        summary: { label: 'الملخص', headline: 'ابدأ رحلة حفظك' }
      },
      goals: {
        light: { title: 'خفيف', subtitle: '1-3 آيات/يوم', detail: 'عبء أخف للأيام المزدحمة مع وقت أكثر للمراجعة.' },
        balanced: { title: 'متوازن', subtitle: '3-5 آيات/يوم', detail: 'وتيرة ثابتة مع مراجعة كافية لتقوية الذاكرة.' },
        intensive: { title: 'مكثّف', subtitle: '5-10 آيات/يوم', detail: 'تقدم أسرع مع عبء مراجعة يومي أثقل.' }
      },
      styles: {
        light: { title: 'خفيف', subtitle: 'ضغط منخفض، سهل الاستمرار.', detail: 'مناسب لروتين هادئ ي prioritizes الاستمرارية.' },
        balanced: { title: 'متوازن', subtitle: 'وتيرة ومراجعة معتدلة.', detail: 'إيقاع يومي عملي للآيات الجديدة والمراجعة.' },
        intensive: { title: 'مكثّف', subtitle: 'وتيرة أعلى، التزام أقوى.', detail: 'مصمم للتقدم الأسرع مع بنية يومية أ tighter.' }
      },
      focus: {
        newPriority: { title: 'الحفظ الجديد أولاً', subtitle: 'ابدأ بآيات جديدة.', detail: 'يحافظ على الزخم مع جدولة المراجعات.' },
        revisionPriority: { title: 'المراجعة أولاً', subtitle: 'احمِ ما تحفظه.', detail: 'يضع المراجعة قبل إضافة المزيد.' },
        mixed: { title: 'تدفق مختلط', subtitle: 'توازن بين الجديد والمراجعة.', detail: 'يمزج الحفظ الجديد والمراجعة في خطة يومية.' },
        weakAyahFocus: { title: 'تركيز الآيات الضعيفة', subtitle: 'أصلح الحفظ الهش.', detail: 'اهتمام إضافي للآيات التي تحتاج تعزيزاً.' }
      },
      support: {
        gentle: { title: 'إرشاد لطيف', subtitle: 'فحص خفيف وتغذية راجعة أ softer.', detail: 'لمن يريد عبء أخف مع بناء الثقة.' },
        standard: { title: 'دعم قياسي', subtitle: 'فحص متوازن وتغذية راجعة عملية.', detail: 'لمعظم المتعلمين الذين يريدون تصحيحاً مفيداً.' },
        highPrecision: { title: 'دقة عالية', subtitle: 'فحص أدق لإتقان أ strict.', detail: 'لمن يريد تصحيحاً أ tighter.' }
      },
      forecast: {
        totalAyahs: 'إجمالي الآيات',
        totalPages: 'إجمالي الصفحات',
        totalHizb: 'إجمالي الأحزاب',
        totalJuz: 'إجمالي الأجزاء',
        dailyTarget: 'الهدف اليومي',
        dailyTargetValue: '{count} آيات / يوم',
        estimatedDuration: 'المدة المقدرة',
        estimatedCompletion: 'الإكمال المقدر',
        learningStyle: 'أسلوب التعلم',
        supportLevel: 'مستوى الدعم',
        repeatsPerAyah: 'تكرار لكل آية',
        playbackSpeed: 'سرعة التشغيل',
        retentionReviews: 'مراجعات الاحتفاظ',
        retentionSchedule: '1، 3، 7، 14، 30، 60 يوماً',
        firstReview: 'أول مراجعة'
      },
      validation: {
        dailyTarget: 'حدد عدداً واقعياً من الآيات الجديدة لكل يوم.',
        validRange: 'أدخل نطاق آيات صالحاً أو اترك حقول النطاق فارغة.',
        repeatsRequired: 'اختر عدد مرات تكرار كل آية.',
        reciterRequired: 'اختر قارئاً قبل المتابعة.'
      }
    },
    helpLearning: {
      title: 'المساعدة والتعلّم',
      subtitle: 'تعرّف على أدوات متقن للحفظ بفعالية أكبر.',
      bestFor: 'الأفضل لـ:',
      sections: {
        tajweed: {
          title: 'قواعد التجويد',
          description: 'التجويد مجموعة القواعد التي تساعدك على تلاوة القرآن بشكل صحيح وجميل. يبرز متقن هذه القواعد لتتعرّف عليها وتتدرّب عليها أثناء الحفظ.',
          bestFor: 'الطلاب الذين يحسّنون النطق وجودة التلاوة.'
        },
        srs: {
          title: 'المراجعة الذكية (SRS)',
          description: 'يذكّرك متقن تلقائياً بمراجعة الآيات في الوقت المناسب لتبقى قوية في ذاكرتك. تظهر الآيات الصعبة أكثر، بينما تُراجع الأقوى بوتيرة أقل.',
          bestFor: 'الاحتفاظ طويل الأمد ومنع فقدان الحفظ.'
        },
        techniques: {
          title: 'تقنيات الحفظ',
          description: 'اختر الطريقة التي تساعدك على الاستمرار، ثم عدّلها مع تعرّفك على النطاق.',
          bestFor: 'الطلاب الذين يكتشفون أسلوب التعلّم الأنسب لهم.',
          details: {
            repetition: { label: 'طريقة التكرار', text: 'كرّر الآية نفسها عدة مرات قبل الانتقال.' },
            linking: { label: 'طريقة الربط', text: 'اربط كل آية بالتالية لتحسين التدفق والاستمرارية.' },
            cumulative: { label: 'الطريقة التراكمية', text: 'أضف آيات جديدة باستمرار مع مراجعة السابقة.' }
          }
        },
        layouts: {
          title: 'تخطيطات القراءة',
          description: 'بدّل بين أسلوبي قراءة حسب الجهاز ونوع الحفظ الذي تريده.',
          bestFor: 'اختيار تجربة القراءة الأكثر طبيعية لك.',
          details: {
            stacked: { label: 'التخطيط العمودي', text: 'يعرض كل آية بشكل عمودي بسيط يسهل متابعته على الجوال.' },
            mushaf: { label: 'تخطيط المصحف', text: 'يعرض الآيات بأسلوب مصحف تقليدي للطلاب المعتادين على حفظ الصفحات.' }
          }
        },
        aiRecitation: {
          title: 'التلاوة بالذكاء الاصطناعي',
          description: 'يستمع إلى تلاوتك ويقدّم تغذية راجعة فورية لمساعدتك على تحديد الأخطاء وتحسين الدقة أثناء الحفظ.',
          bestFor: 'الطلاب الذين يريدون تدريباً موجّهاً وتغذية راجعة فورية.'
        },
        manualAssessment: {
          title: 'التقييم اليدوي',
          description: 'يتيح لك تقييم حفظك بنفسك بعد كل جلسة وتتبّع ثقتك وتقدّمك مع الوقت.',
          bestFor: 'الطلاب الذين يفضّلون التأمل الذاتي والمراجعة المستقلة.'
        }
      }
    },
    rangeOptions: {
      all: 'القرآن كاملاً',
      juz: 'جزء',
      hizb: 'حزب',
      page: 'صفحة',
      surah: 'سورة',
      ayah: 'آية',
      word: 'كلمة'
    }
  }
}

// French translations for structured keys (abbreviated where similar to en tone)
const frStructured = {
  memorisation: {
    techniques: {
      focusDescription: 'Le mode Focus atténue toutes les ayahs non actives pour vous aider à vous concentrer sur l\'ayah en cours.',
      chainingOffDescription: 'Lire les ayahs sélectionnées dans l\'ordre sans enchaînement.',
      chainingCumulativeDescription: 'Construire des passages plus longs en ajoutant une ayah à la fois.',
      chainingLinkingDescription: 'Renforcer les transitions entre ayahs voisines.',
      chainingLinkingHint: 'Pratiquez les ayahs individuellement, puis par paires.',
      chainingCumulativeHint: 'Commencez par la première ayah, puis ajoutez-en une à chaque fois.',
      chainingOffSub: 'Lire les ayahs sélectionnées dans l\'ordre sans enchaînement.',
      chainingCumulativeSub: 'Construire des passages connectés depuis la première ayah.',
      chainingLinkingSub: 'Entraîner la transition entre ayahs voisines.',
      chainingOffPreview: 'Flux : ayahs dans l\'ordre, chaque ayah répétée {count} fois.',
      chainingCumulativePreview: 'Flux cumulatif : répéter 1, puis 1-2, puis 1-2-3. Chaque bloc répété {count} fois.',
      chainingLinkingPreview: 'Flux de liaison : répéter l\'ayah actuelle, la suivante, puis les deux. Chaque étape répétée {count} fois.',
      chainingOffLabel: 'Enchaînement off · {count} répétitions',
      chainingCumulativeLabel: 'Cumulatif · {count} répétitions',
      chainingLinkingLabel: 'Liaison · {count} répétitions',
      focusActiveDescription: 'Les ayahs non actives sont atténuées pour garder l\'ayah centrale.',
      blurActiveDescription: 'Les ayahs suivantes sont masquées avec un flou de {px}px.',
      chainingActiveDescription: '{count} répétition(s) par étape d\'enchaînement.',
      cumulativeChaining: 'Enchaînement cumulatif',
      linkingChaining: 'Enchaînement par liaison',
      anchorOffDescription: 'Mode ancre off · utilisez des mots-clés comme repères',
      anchorUsingDescription: 'Utilisation de {anchors} comme repères mentaux',
      anchorFirstLast: 'premier/dernier mot',
      anchorKeyPairs: 'paires de mots-clés',
      anchorComplete: 'structure complète',
      chainingWhyCumulative: 'Utilisez-le pour construire des passages plus longs en ajoutant une ayah à la fois.',
      chainingWhyLinking: 'Utilisez-le pour renforcer les transitions entre ayahs voisines.',
      chainingNextCumulative: 'Suivant : ajouter une ayah au bloc',
      chainingNextLinking: 'Suivant : seul -> suivant -> paire'
    },
    onboarding: {
      stepCounter: 'Étape {current} sur {total}',
      finish: 'Terminer',
      useSampleSession: 'Utiliser une session exemple',
      steps: {
        setup: {
          title: 'Configurer une session',
          stepLabel: 'Configuration',
          body: 'Choisissez une sourate, la plage d\'ayahs et un récitateur avant de commencer.',
          points: ['La session exemple commence par une courte plage', 'Les répétitions et la vitesse restent dans les contrôles', 'Vous pouvez rouvrir la configuration à tout moment'],
          previewTitle: 'Entrées de session réelles',
          previewSubtitle: 'La configuration existe déjà dans le panneau Outils.',
          previewItems: ['Sourate', 'Plage', 'Récitateur']
        },
        reading: {
          title: 'Choisir une vue de lecture',
          stepLabel: 'Vue de lecture',
          body: 'Basculez entre empilé et mushaf, puis utilisez traduction, translittération et tajwid.',
          points: ['Gardez le texte principal épuré si vous n\'avez pas besoin d\'aides', 'Le mode mushaf conserve la mise en page du Coran', 'Les polices restent accessibles depuis la barre d\'outils'],
          previewTitle: 'Contrôles de lecture',
          previewSubtitle: 'Le basculement de vue et les aides sont intégrés.',
          previewItems: ['Empilé', 'Mushaf', 'Tajwid']
        },
        practice: {
          title: 'Pratiquer avec les outils intégrés',
          stepLabel: 'Outils de pratique',
          body: 'Utilisez focus, flou, enchaînement et ancre pour structurer l\'ayah active.',
          points: ['Le focus concentre l\'attention sur l\'ayah active', 'Le flou masque les ayahs suivantes', 'Enchaînement et ancre aident les passages difficiles'],
          previewTitle: 'Contrôles de technique',
          previewSubtitle: 'L\'onglet Techniques fait partie de l\'espace de travail.',
          previewItems: ['Focus', 'Flou', 'Ancre']
        },
        review: {
          title: 'Revoir et revenir',
          stepLabel: 'Revue et retour',
          body: 'Sessions sauvegardées, enregistrements et analyses guident la prochaine session.',
          points: ['Les sessions sauvegardées permettent de reprendre', 'L\'historique garde les tentatives visibles', 'AI Recite et AI Memory restent disponibles'],
          previewTitle: 'Ce à quoi vous revenez',
          previewSubtitle: 'Revue et reprise sont intégrées au système.',
          previewItems: ['Sessions sauvegardées', 'Enregistrements', 'Analyses']
        }
      }
    },
    analytics: {
      todayProgress: 'Progrès du jour',
      todayProgressDesc: '{covered}/{total} ayahs couvertes.',
      streak: 'Série',
      streakDesc: 'Jours d\'étude consécutifs.',
      memoryBreakdown: 'Répartition mémoire',
      spacedHealth: 'Santé de la répétition espacée',
      recitationQuality: 'Qualité de récitation',
      rowNew: 'Nouveau',
      rowDue: 'À réviser',
      rowWeak: 'Faible',
      rowMastered: 'Maîtrisé',
      rowQueuedToday: 'planifié aujourd\'hui',
      rowReviewNow: 'réviser maintenant',
      rowNeedsCare: 'nécessite attention',
      rowSteadyAyahs: 'ayahs stables',
      rowDueNow: 'Dû maintenant',
      rowUpcoming: 'À venir',
      rowReviews: 'révisions',
      rowScheduled: 'planifié',
      rowAvgRetention: 'Rétention moyenne',
      rowLoad: 'charge {load}',
      rowAvgQuality: 'Qualité moyenne',
      rowChecks: 'Vérifications',
      rowCompleted: 'terminé',
      rowReady: 'Prêt',
      noDataYet: 'Pas encore de données',
      noDataDetail: 'Démarrez une session pour générer des analyses',
      defaultInsight: 'Gardez aujourd\'hui petit et régulier'
    },
    guided: {
      learn: 'Apprendre',
      practice: 'Pratiquer',
      recall: 'Rappeler',
      review: 'Réviser',
      listenFollow: 'Écouter et suivre',
      tryReciting: 'Essayer de réciter',
      continue: 'Continuer',
      learnInstruction: 'Écoutez et suivez la récitation.',
      practiceInstruction: 'Essayez de réciter avec l\'ayah partiellement visible.',
      recallInstruction: 'Rappelez l\'ayah avant d\'avancer.',
      reviewInstruction: 'Révisez les versets dus maintenant.',
      defaultInstruction: 'Continuez votre session.',
      start: 'Démarrer',
      play: 'Lire',
      chooseSurahHint: 'Choisissez une sourate et une plage, puis démarrez.',
      versesToReview: 'Vous avez {count} versets à réviser.',
      reviewDueHint: 'Révisez ce qui est dû.',
      playActiveHint: 'Lisez l\'ayah active. Utilisez Outils pour traduction et mot à mot.',
      kickerReview: '✨ Temps de rafraîchir',
      kickerPlaying: '🌙 Garder le rythme',
      kickerDefault: '🌿 Commencez par Bismillah, gardez votre cœur avec l\'ayah',
      reviewBodyDue: 'Vous avez {count} ayahs en attente de révision.',
      reviewBodyDefault: 'Revenez à cette ayah avec une révision calme.',
      reviewBodySuffix: 'Gardez langue, yeux et cœur ensemble sur cette ayah.',
      beforeBegin: 'Avant de commencer',
      duringSession: 'Pendant la session',
      afterEachAyah: 'Après chaque ayah',
      keepGoing: 'Continuez',
      listenAndFollow: 'Écoutez et suivez.',
      reciteFirstReveal: 'Récitez d\'abord, puis révélez.',
      tryRecitingMinimal: 'Essayez de réciter avec un minimum de support.',
      reviewVersesDue: 'Révisez ce qui est dû.',
      versesDueCount: '{count} versets à réviser.'
    },
    sessionEnd: {
      reviewInsights: 'Voir les analyses',
      reviewInsightsDesc: 'Consultez les analyses de session',
      saveSession: 'Enregistrer la session',
      saveSessionDesc: 'Conserver cette plage terminée',
      resetRange: 'Réinitialiser la plage',
      resetRangeDesc: 'Relire la même plage',
      createSession: 'Créer une nouvelle session',
      createSessionDesc: 'Choisir une autre sourate ou plage'
    },
    sessionType: {
      label: 'Mémorisation',
      nowPlaying: 'En lecture',
      session: 'Session',
      ayah: 'Ayah {n}',
      ayahLabel: 'Ayah',
      pause: 'Pause',
      startSession: 'Démarrer la session',
      advanced: 'Avancé',
      beginner: 'Débutant',
      sessionExplanation: 'Session {mode} avec {chaining}.'
    },
    common: {
      mushafSyncMessage: 'Les ayahs sont chargées, mais la liste des pages mushaf n\'est pas synchronisée. Revenez à Empilé ou rouvrez la session.',
      fullQuran: 'Coran entier',
      filterValue: 'Valeur du filtre',
      noSurah: 'Aucune sourate',
      currentSession: 'Session actuelle',
      confirm: 'Confirmer',
      stop: 'Arrêter',
      savedAt: 'Enregistré {date}',
      lastOpened: 'Dernière ouverture {date}',
      rangeLabel: 'Plage {start}-{end}',
      manualAdvance: 'avance manuelle',
      autoAdvance: 'avance auto',
      plainSequence: 'séquence simple',
      chainingLabel: 'enchaînement {method}',
      setupSummary: '{count}x répétitions, {mode}, {chaining}',
      noReadingAids: 'Aucune aide de lecture active',
      translationOn: 'Traduction activée',
      transliterationOn: 'Translittération activée',
      wordByWordOn: 'Mot à mot activé',
      wordAudioOn: 'Audio des mots activé',
      tajweedOn: 'Tajwid activé',
      fontLabel: 'Police {font}',
      modeLabel: 'mode {label}'
    },
    search: {
      juzNumber: 'Numéro de juz',
      hizbNumber: 'Numéro de hizb',
      pageNumber: 'Numéro de page',
      surah: 'Sourate',
      ayahNumber: 'Numéro d\'ayah',
      wordPosition: 'Position du mot',
      wordNumber: 'Numéro du mot'
    },
    fonts: {
      uthmanic: 'Othmanique Hafs',
      amiri: 'Amiri Coran',
      naskh: 'Noto Naskh Arabic',
      scheherazade: 'Scheherazade New',
      lateef: 'Lateef'
    }
  },
  hifzPlan: {
    wizard: {
      editTitle: 'Modifier le plan Hifz',
      createTitle: 'Créer votre plan Hifz',
      savePlan: 'Enregistrer le plan',
      startJourney: 'Commencer le parcours Hifz',
      chooseSurahPlaceholder: 'Choisir une sourate',
      createPlan: 'Créer le plan',
      stepCounter: 'Étape {current} sur {total}',
      yourPlan: 'Votre plan',
      to: 'À',
      ayahRange: 'Plage d\'ayahs',
      studyFlow: 'Flux d\'étude',
      reciterLabel: 'Récitateur',
      steps: {
        goal: { label: 'Objectif', headline: 'Choisissez l\'objectif du jour' },
        style: { label: 'Style', headline: 'Choisissez votre rythme quotidien' },
        flow: { label: 'Flux', headline: 'Choisissez votre flux d\'étude' },
        support: { label: 'Support', headline: 'Définissez le niveau de support' },
        playback: { label: 'Lecture', headline: 'Configurez la récitation' },
        summary: { label: 'Résumé', headline: 'Commencez votre parcours Hifz' }
      },
      goals: {
        light: { title: 'Léger', subtitle: '1-3 ayahs/jour', detail: 'Charge légère pour les journées chargées.' },
        balanced: { title: 'Équilibré', subtitle: '3-5 ayahs/jour', detail: 'Rythme stable avec révision suffisante.' },
        intensive: { title: 'Intensif', subtitle: '5-10 ayahs/jour', detail: 'Progression plus rapide avec plus de révision.' }
      },
      styles: {
        light: { title: 'Léger', subtitle: 'Faible pression, facile à maintenir.', detail: 'Pour une routine calme privilégiant la régularité.' },
        balanced: { title: 'Équilibré', subtitle: 'Rythme et révision modérés.', detail: 'Rythme quotidien pratique pour nouvelles ayahs et révision.' },
        intensive: { title: 'Intensif', subtitle: 'Rythme élevé, engagement fort.', detail: 'Pour progresser plus vite avec une structure serrée.' }
      },
      focus: {
        newPriority: { title: 'Nouvelle mémorisation d\'abord', subtitle: 'Commencer par de nouvelles ayahs.', detail: 'Maintient l\'élan tout en planifiant les révisions.' },
        revisionPriority: { title: 'Révision d\'abord', subtitle: 'Protéger ce que vous savez.', detail: 'Place la mémorisation existante en priorité.' },
        mixed: { title: 'Flux mixte', subtitle: 'Équilibre nouveau et révision.', detail: 'Mélange mémorisation et révision au quotidien.' },
        weakAyahFocus: { title: 'Focus ayahs faibles', subtitle: 'Réparer la mémorisation fragile.', detail: 'Attention supplémentaire aux ayahs à renforcer.' }
      },
      support: {
        gentle: { title: 'Guidance douce', subtitle: 'Vérification légère.', detail: 'Pour une charge légère et la confiance.' },
        standard: { title: 'Support standard', subtitle: 'Vérification équilibrée.', detail: 'Pour la plupart des apprenants.' },
        highPrecision: { title: 'Haute précision', subtitle: 'Vérification stricte.', detail: 'Pour une maîtrise exigeante.' }
      },
      forecast: {
        totalAyahs: 'Total ayahs',
        totalPages: 'Total pages',
        totalHizb: 'Total hizb',
        totalJuz: 'Total juz',
        dailyTarget: 'Objectif quotidien',
        dailyTargetValue: '{count} ayahs / jour',
        estimatedDuration: 'Durée estimée',
        estimatedCompletion: 'Achèvement estimé',
        learningStyle: 'Style d\'apprentissage',
        supportLevel: 'Niveau de support',
        repeatsPerAyah: 'Répétitions par ayah',
        playbackSpeed: 'Vitesse de lecture',
        retentionReviews: 'Révisions de rétention',
        retentionSchedule: '1, 3, 7, 14, 30, 60 jours',
        firstReview: 'Première révision'
      },
      validation: {
        dailyTarget: 'Définissez un nombre réaliste de nouvelles ayahs par jour.',
        validRange: 'Entrez une plage valide ou laissez les deux champs vides.',
        repeatsRequired: 'Choisissez combien de fois chaque ayah doit être répétée.',
        reciterRequired: 'Choisissez un récitateur avant de continuer.'
      }
    },
    helpLearning: {
      title: 'Aide et apprentissage',
      subtitle: 'Apprenez à utiliser les outils Mutqin pour mieux mémoriser.',
      bestFor: 'Idéal pour :',
      sections: {
        tajweed: {
          title: 'Règles de tajweed',
          description: 'Le tajweed est l\'ensemble des règles qui vous aident à réciter le Coran correctement et avec beauté. Mutqin met en évidence ces règles pour que vous les reconnaissiez et les pratiquiez pendant la mémorisation.',
          bestFor: 'Les étudiants qui améliorent la prononciation et la qualité de récitation.'
        },
        srs: {
          title: 'Révision intelligente (SRS)',
          description: 'Mutqin vous rappelle automatiquement de réviser les versets au bon moment pour qu\'ils restent solides en mémoire. Les versets difficiles apparaissent plus souvent, les plus solides moins.',
          bestFor: 'La rétention à long terme et la prévention des oublis.'
        },
        techniques: {
          title: 'Techniques de mémorisation',
          description: 'Choisissez la méthode qui vous aide à rester régulier, puis ajustez-la à mesure que la plage devient familière.',
          bestFor: 'Les étudiants qui découvrent leur style d\'apprentissage.',
          details: {
            repetition: { label: 'Méthode de répétition', text: 'Répétez le même verset plusieurs fois avant de passer au suivant.' },
            linking: { label: 'Méthode de liaison', text: 'Reliez chaque verset au suivant pour améliorer le flux et la continuité.' },
            cumulative: { label: 'Méthode cumulative', text: 'Ajoutez continuellement de nouveaux versets tout en révisant les précédents.' }
          }
        },
        layouts: {
          title: 'Dispositions de lecture',
          description: 'Basculez entre deux styles de lecture selon l\'appareil et le type de mémorisation.',
          bestFor: 'Choisir l\'expérience de lecture la plus naturelle.',
          details: {
            stacked: { label: 'Disposition empilée', text: 'Affiche chaque verset verticalement, plus facile à suivre sur mobile.' },
            mushaf: { label: 'Disposition mushaf', text: 'Affiche les versets dans un style mushaf traditionnel pour ceux qui préfèrent la mémorisation par page.' }
          }
        },
        aiRecitation: {
          title: 'Récitation IA',
          description: 'La récitation IA écoute votre récitation et fournit un retour instantané pour identifier les erreurs et améliorer la précision.',
          bestFor: 'Les étudiants qui veulent une pratique guidée et un retour immédiat.'
        },
        manualAssessment: {
          title: 'Évaluation manuelle',
          description: 'Permet d\'évaluer votre propre mémorisation après chaque session et de suivre votre confiance et vos progrès.',
          bestFor: 'Les étudiants qui préfèrent l\'auto-réflexion et la révision indépendante.'
        }
      }
    },
    rangeOptions: {
      all: 'Coran entier',
      juz: 'Juz',
      hizb: 'Hizb',
      page: 'Page',
      surah: 'Sourate',
      ayah: 'Ayah',
      word: 'Mot'
    }
  }
}

const enLocale = loadLocale('en')
deepMerge(enLocale.data, structured)
saveLocale(enLocale.file, enLocale.data)

const arLocale = loadLocale('ar')
deepMerge(arLocale.data, arStructured)
if (structured.toasts) deepMerge(arLocale.data, { toasts: structured.toasts })
saveLocale(arLocale.file, arLocale.data)

const frLocale = loadLocale('fr')
deepMerge(frLocale.data, frStructured)
if (structured.toasts) deepMerge(frLocale.data, { toasts: structured.toasts })
saveLocale(frLocale.file, frLocale.data)

console.log('Merged structured i18n keys into en, ar, fr')
