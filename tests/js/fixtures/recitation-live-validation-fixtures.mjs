export const recitationLiveValidationFixtures = [
  {
    id: 'corrected-interim',
    targetText: 'قل هو الله أحد',
    events: [
      {
        provider: 'speechmatics',
        isFinal: false,
        start: 0,
        duration: 0.9,
        transcript: 'قل هو غلط',
        words: [
          { word: 'قل', confidence: 0.91, start: 0.05, end: 0.18 },
          { word: 'هو', confidence: 0.88, start: 0.18, end: 0.32 },
          { word: 'غلط', confidence: 0.42, start: 0.32, end: 0.55 }
        ]
      },
      {
        provider: 'speechmatics',
        isFinal: true,
        start: 0,
        duration: 0.9,
        words: [
          { word: 'قل', confidence: 0.96, start: 0.05, end: 0.18 },
          { word: 'هو', confidence: 0.96, start: 0.18, end: 0.32 },
          { word: 'الله', confidence: 0.97, start: 0.36, end: 0.58 },
          { word: 'أحد', confidence: 0.98, start: 0.61, end: 0.84 }
        ]
      }
    ],
    expected: {
      accuracyScore: 100,
      completionPercentage: 100,
      missing: 0,
      extra: 0,
      partial: 0,
      incorrect: 0
    }
  },
  {
    id: 'pause-and-duplicate',
    targetText: 'رب اغفر لي',
    events: [
      {
        provider: 'speechmatics',
        isFinal: false,
        start: 0,
        duration: 0.7,
        transcript: 'رب',
        words: [
          { word: 'رب', confidence: 0.74, start: 0.05, end: 0.16 }
        ]
      },
      {
        provider: 'speechmatics',
        isFinal: true,
        start: 0,
        duration: 0.7,
        words: [
          { word: 'رب', confidence: 0.93, start: 0.05, end: 0.16 },
          { word: 'رب', confidence: 0.92, start: 0.16, end: 0.22 }
        ]
      },
      {
        provider: 'speechmatics',
        isFinal: true,
        start: 1.4,
        duration: 0.8,
        words: [
          { word: 'اغفر', confidence: 0.95, start: 1.48, end: 1.74 },
          { word: 'لي', confidence: 0.96, start: 1.8, end: 1.95 }
        ]
      }
    ],
    expected: {
      accuracyScore: 100,
      completionPercentage: 100,
      missing: 0,
      extra: 0,
      partial: 0,
      incorrect: 0
    }
  },
  {
    id: 'restart-with-superseded-final',
    targetText: 'سبح اسم ربك الأعلى',
    events: [
      {
        provider: 'speechmatics',
        isFinal: true,
        start: 0,
        duration: 1.2,
        words: [
          { word: 'سبح', confidence: 0.93, start: 0.05, end: 0.18 },
          { word: 'اسم', confidence: 0.9, start: 0.19, end: 0.34 }
        ]
      },
      {
        provider: 'speechmatics',
        isFinal: true,
        start: 0,
        duration: 1.2,
        words: [
          { word: 'سبح', confidence: 0.97, start: 0.05, end: 0.18 },
          { word: 'اسم', confidence: 0.96, start: 0.19, end: 0.34 },
          { word: 'ربك', confidence: 0.95, start: 0.35, end: 0.54 },
          { word: 'الأعلى', confidence: 0.96, start: 0.56, end: 0.88 }
        ]
      }
    ],
    expected: {
      accuracyScore: 100,
      completionPercentage: 100,
      missing: 0,
      extra: 0,
      partial: 0,
      incorrect: 0
    }
  },
  {
    id: 'substitution-and-omission',
    targetText: 'اهدنا الصراط المستقيم',
    events: [
      {
        provider: 'speechmatics',
        isFinal: false,
        start: 0,
        duration: 0.8,
        transcript: 'اهدنا',
        words: [
          { word: 'اهدنا', confidence: 0.89, start: 0.02, end: 0.24 }
        ]
      },
      {
        provider: 'speechmatics',
        isFinal: true,
        start: 0,
        duration: 1.1,
        words: [
          { word: 'اهدنا', confidence: 0.94, start: 0.02, end: 0.24 },
          { word: 'السراط', confidence: 0.87, start: 0.27, end: 0.58 }
        ]
      }
    ],
    expected: {
      accuracyScore: 46,
      completionPercentage: 67,
      missing: 1,
      extra: 0,
      partial: 1,
      incorrect: 0
    }
  }
]
