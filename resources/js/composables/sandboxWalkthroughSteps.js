/**
 * Group J4 — sandbox guided tour step definitions (selector + advance rules).
 * Copy keys live under previewDemo.walkthrough.*
 */

export const WALKTHROUGH_STORAGE_STEP = 'mutqin_sandbox_walkthrough_step';
export const WALKTHROUGH_STORAGE_ID = 'mutqin_sandbox_walkthrough_id';
export const WALKTHROUGH_STORAGE_PAUSED = 'mutqin_sandbox_walkthrough_paused';

export const WALKTHROUGH_IDS = ['teacher', 'student', 'parent', 'personal', 'connected'];

const teacherSteps = [
  {
    key: 'welcome',
    selector: '[data-platform-shell="teacher"] .teacher-hero',
    titleKey: 'previewDemo.walkthrough.teacher.welcome.title',
    bodyKey: 'previewDemo.walkthrough.teacher.welcome.body',
    advance: 'manual',
    pad: 10,
    radius: 16,
  },
  {
    key: 'nav-students',
    selector: '[data-sandbox-tour="nav-students"]',
    titleKey: 'previewDemo.walkthrough.teacher.students.title',
    bodyKey: 'previewDemo.walkthrough.teacher.students.body',
    advance: 'click',
    pad: 6,
    radius: 12,
  },
  {
    key: 'nav-assignments',
    selector: '[data-sandbox-tour="nav-assignments"]',
    titleKey: 'previewDemo.walkthrough.teacher.assignments.title',
    bodyKey: 'previewDemo.walkthrough.teacher.assignments.body',
    advance: 'click',
    pad: 6,
    radius: 12,
  },
  {
    key: 'new-assignment',
    selector: '[data-sandbox-tour="teacher-new-assignment"]',
    titleKey: 'previewDemo.walkthrough.teacher.create.title',
    bodyKey: 'previewDemo.walkthrough.teacher.create.body',
    advance: 'click',
    pad: 8,
    radius: 14,
  },
  {
    key: 'nav-reviews',
    selector: '[data-sandbox-tour="nav-reviews"]',
    titleKey: 'previewDemo.walkthrough.teacher.reviews.title',
    bodyKey: 'previewDemo.walkthrough.teacher.reviews.body',
    advance: 'click',
    pad: 6,
    radius: 12,
  },
  {
    key: 'role-switch',
    selector: '[data-sandbox-tour="sandbox-role-switch"]',
    titleKey: 'previewDemo.walkthrough.teacher.switch.title',
    bodyKey: 'previewDemo.walkthrough.teacher.switch.body',
    advance: 'manual',
    pad: 8,
    radius: 14,
    complete: true,
  },
];

const studentSteps = [
  {
    key: 'welcome',
    selector: '[data-platform-shell="student"] .learner-home, [data-platform-shell="student"] .user-dashboard__shell',
    titleKey: 'previewDemo.walkthrough.student.welcome.title',
    bodyKey: 'previewDemo.walkthrough.student.welcome.body',
    advance: 'manual',
    pad: 12,
    radius: 18,
  },
  {
    key: 'assignments',
    selector: '[data-sandbox-tour="student-assignments"]',
    titleKey: 'previewDemo.walkthrough.student.assignments.title',
    bodyKey: 'previewDemo.walkthrough.student.assignments.body',
    advance: 'click',
    pad: 8,
    radius: 14,
    optional: true,
  },
  {
    key: 'practice',
    selector: '[data-sandbox-tour="student-practice"]',
    titleKey: 'previewDemo.walkthrough.student.practice.title',
    bodyKey: 'previewDemo.walkthrough.student.practice.body',
    advance: 'manual',
    pad: 8,
    radius: 14,
    optional: true,
    complete: true,
  },
];

const parentSteps = [
  {
    key: 'welcome',
    selector: '[data-platform-shell="parent"] .parent-family-overview, [data-platform-shell="parent"] .teacher-dashboard__main',
    titleKey: 'previewDemo.walkthrough.parent.welcome.title',
    bodyKey: 'previewDemo.walkthrough.parent.welcome.body',
    advance: 'manual',
    pad: 12,
    radius: 18,
  },
  {
    key: 'children',
    selector: '[data-sandbox-tour="nav-children"], [data-sandbox-tour="nav-overview"]',
    titleKey: 'previewDemo.walkthrough.parent.children.title',
    bodyKey: 'previewDemo.walkthrough.parent.children.body',
    advance: 'click',
    pad: 6,
    radius: 12,
    optional: true,
  },
  {
    key: 'progress',
    selector: '[data-sandbox-tour="parent-progress"]',
    titleKey: 'previewDemo.walkthrough.parent.progress.title',
    bodyKey: 'previewDemo.walkthrough.parent.progress.body',
    advance: 'manual',
    pad: 10,
    radius: 14,
    optional: true,
    complete: true,
  },
];

const personalSteps = [
  {
    key: 'setup',
    selector: '[data-tour="setup-passage"], [data-tour="setup-sheet"], [data-sandbox-tour="personal-setup"]',
    titleKey: 'previewDemo.walkthrough.personal.setup.title',
    bodyKey: 'previewDemo.walkthrough.personal.setup.body',
    advance: 'manual',
    pad: 10,
    radius: 16,
  },
  {
    key: 'practice',
    selector: '[data-tour="practice-beginner"], [data-tour="practice-sheet"], [data-sandbox-tour="personal-practice"]',
    titleKey: 'previewDemo.walkthrough.personal.practice.title',
    bodyKey: 'previewDemo.walkthrough.personal.practice.body',
    advance: 'manual',
    pad: 10,
    radius: 16,
  },
  {
    key: 'start',
    selector: '[data-tour="start-session"], [data-sandbox-tour="personal-start"]',
    titleKey: 'previewDemo.walkthrough.personal.start.title',
    bodyKey: 'previewDemo.walkthrough.personal.start.body',
    advance: 'click',
    pad: 10,
    radius: 16,
    optional: true,
    complete: true,
  },
];

const connectedSteps = [
  {
    key: 'ct-teacher-intro',
    requiredPersona: 'platform_teacher',
    selector: '[data-platform-shell="teacher"] .teacher-hero',
    titleKey: 'previewDemo.walkthrough.connected.teacherIntro.title',
    bodyKey: 'previewDemo.walkthrough.connected.teacherIntro.body',
    advance: 'manual',
    pad: 10,
    radius: 16,
  },
  {
    key: 'ct-create',
    requiredPersona: 'platform_teacher',
    selector: '[data-sandbox-tour="teacher-new-assignment"]',
    titleKey: 'previewDemo.walkthrough.connected.create.title',
    bodyKey: 'previewDemo.walkthrough.connected.create.body',
    advance: 'click',
    pad: 8,
    radius: 14,
  },
  {
    key: 'ct-switch-student',
    requiredPersona: 'platform_teacher',
    selector: '[data-sandbox-tour="sandbox-role-switch"]',
    titleKey: 'previewDemo.walkthrough.connected.switchStudent.title',
    bodyKey: 'previewDemo.walkthrough.connected.switchStudent.body',
    advance: 'select',
    selectValue: 'platform_classroom_student',
    pad: 8,
    radius: 14,
  },
  {
    key: 'ct-student-open',
    requiredPersona: 'platform_classroom_student',
    selector: '[data-platform-shell="student"] .user-dashboard__shell',
    titleKey: 'previewDemo.walkthrough.connected.studentOpen.title',
    bodyKey: 'previewDemo.walkthrough.connected.studentOpen.body',
    advance: 'manual',
    pad: 12,
    radius: 18,
  },
  {
    key: 'ct-student-work',
    requiredPersona: 'platform_classroom_student',
    selector: '[data-sandbox-tour="student-assignments"], [data-sandbox-tour="student-practice"]',
    titleKey: 'previewDemo.walkthrough.connected.studentWork.title',
    bodyKey: 'previewDemo.walkthrough.connected.studentWork.body',
    advance: 'manual',
    pad: 10,
    radius: 14,
    optional: true,
  },
  {
    key: 'ct-switch-teacher',
    requiredPersona: 'platform_classroom_student',
    selector: '[data-sandbox-tour="sandbox-role-switch"]',
    titleKey: 'previewDemo.walkthrough.connected.switchTeacher.title',
    bodyKey: 'previewDemo.walkthrough.connected.switchTeacher.body',
    advance: 'select',
    selectValue: 'platform_teacher',
    pad: 8,
    radius: 14,
  },
  {
    key: 'ct-review',
    requiredPersona: 'platform_teacher',
    selector: '[data-sandbox-tour="nav-reviews"]',
    titleKey: 'previewDemo.walkthrough.connected.review.title',
    bodyKey: 'previewDemo.walkthrough.connected.review.body',
    advance: 'click',
    pad: 6,
    radius: 12,
  },
  {
    key: 'ct-switch-parent',
    requiredPersona: 'platform_teacher',
    selector: '[data-sandbox-tour="sandbox-role-switch"]',
    titleKey: 'previewDemo.walkthrough.connected.switchParent.title',
    bodyKey: 'previewDemo.walkthrough.connected.switchParent.body',
    advance: 'select',
    selectValue: 'platform_classroom_parent',
    pad: 8,
    radius: 14,
  },
  {
    key: 'ct-parent-view',
    requiredPersona: 'platform_classroom_parent',
    selector: '[data-platform-shell="parent"] .teacher-dashboard__main',
    titleKey: 'previewDemo.walkthrough.connected.parentView.title',
    bodyKey: 'previewDemo.walkthrough.connected.parentView.body',
    advance: 'manual',
    pad: 12,
    radius: 18,
    complete: true,
  },
];

export function stepsForWalkthrough(walkthroughId) {
  switch (walkthroughId) {
    case 'teacher':
      return teacherSteps;
    case 'student':
      return studentSteps;
    case 'parent':
      return parentSteps;
    case 'personal':
      return personalSteps;
    case 'connected':
      return connectedSteps;
    default:
      return [];
  }
}

export function readWalkthroughState() {
  if (typeof window === 'undefined') {
    return { id: '', step: 0, paused: false };
  }
  let id = window.localStorage.getItem(WALKTHROUGH_STORAGE_ID) || '';
  let step = Number.parseInt(window.localStorage.getItem(WALKTHROUGH_STORAGE_STEP) || '0', 10);
  if (!Number.isFinite(step) || step < 0) step = 0;
  const paused = window.localStorage.getItem(WALKTHROUGH_STORAGE_PAUSED) === '1';
  return { id, step, paused };
}

export function writeWalkthroughState({ id, step, paused }) {
  if (typeof window === 'undefined') return;
  if (id) {
    window.localStorage.setItem(WALKTHROUGH_STORAGE_ID, id);
  } else {
    window.localStorage.removeItem(WALKTHROUGH_STORAGE_ID);
  }
  window.localStorage.setItem(WALKTHROUGH_STORAGE_STEP, String(Math.max(0, step)));
  if (paused) {
    window.localStorage.setItem(WALKTHROUGH_STORAGE_PAUSED, '1');
  } else {
    window.localStorage.removeItem(WALKTHROUGH_STORAGE_PAUSED);
  }
}

export function resetWalkthroughState(walkthroughId) {
  writeWalkthroughState({ id: walkthroughId || '', step: 0, paused: false });
}