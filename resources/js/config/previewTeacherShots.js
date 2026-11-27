/**
 * Canonical teacher marketing screenshots (resources/marketing/preview-2.0).
 * Served only via /preview/assets/{basename}.png
 */
export const PREVIEW_TEACHER_SHOT_BASENAMES = Object.freeze([
  'overview',
  'overview-priorities',
  'students',
  'assignments',
  'assignment-create',
  'assignment-detail',
  'reviews',
  'review-detail',
  'learning-plan',
  'messages',
  'parents',
]);

export function previewTeacherAssetUrl(basename) {
  return `/preview/assets/${basename}.png`;
}