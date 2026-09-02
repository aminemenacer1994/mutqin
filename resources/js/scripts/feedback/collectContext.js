import { getSavedTheme } from '../../utils/theme';

function readMeta(name) {
  if (typeof document === 'undefined') return '';
  return document.querySelector(`meta[name="${name}"]`)?.content || '';
}

function detectDeviceSummary() {
  if (typeof navigator === 'undefined') return '';
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const mobile = /Mobi|Android|iPhone|iPad/i.test(ua);
  return [mobile ? 'mobile' : 'desktop', platform].filter(Boolean).join(' · ');
}

function detectBrowserSummary() {
  if (typeof navigator === 'undefined') return '';
  const ua = navigator.userAgent || '';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
  if (/Firefox\//.test(ua)) return 'Firefox';
  return 'Browser';
}

/**
 * Collect safe client context for feedback submissions.
 * @param {object} [overrides]
 */
export function collectFeedbackContext(overrides = {}) {
  const route = typeof window !== 'undefined'
    ? `${window.location.pathname || ''}${window.location.search || ''}`
    : '';

  return {
    route,
    page: route,
    device: detectDeviceSummary(),
    browser: detectBrowserSummary(),
    language: typeof document !== 'undefined' ? (document.documentElement.lang || '') : '',
    theme: getSavedTheme(),
    app_build: readMeta('mutqin-asset-build') || (typeof document !== 'undefined' ? document.documentElement?.dataset?.mutqinAssetBuild : '') || '',
    ...overrides,
  };
}

export const FEEDBACK_TYPES = [
  { value: 'suggestion', labelKey: 'feedback.types.suggestion' },
  { value: 'bug', labelKey: 'feedback.types.bug' },
  { value: 'ai_recitation', labelKey: 'feedback.types.ai_recitation' },
  { value: 'design', labelKey: 'feedback.types.design' },
  { value: 'other', labelKey: 'feedback.types.other' },
];

export const AI_FEEDBACK_REASONS = [
  { value: 'correct_marked_wrong', labelKey: 'feedback.aiReasons.correct_marked_wrong' },
  { value: 'missed_mistake', labelKey: 'feedback.aiReasons.missed_mistake' },
  { value: 'wrong_highlight', labelKey: 'feedback.aiReasons.wrong_highlight' },
  { value: 'recording_problem', labelKey: 'feedback.aiReasons.recording_problem' },
  { value: 'other', labelKey: 'feedback.aiReasons.other' },
];
