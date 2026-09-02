export const FEEDBACK_OPEN_EVENT = 'mutqin:open-feedback';

/** @type {((options: object) => void) | null} */
let modalHandler = null;
/** @type {object[]} */
const pendingOpens = [];

/**
 * @param {(options: object) => void} handler
 */
export function registerFeedbackModalHandler(handler) {
  modalHandler = handler;
  while (pendingOpens.length) {
    modalHandler(pendingOpens.shift());
  }
}

export function unregisterFeedbackModalHandler() {
  modalHandler = null;
}

/**
 * @param {object} [options]
 */
export function openFeedbackModal(options = {}) {
  if (modalHandler) {
    modalHandler(options);
    return;
  }

  pendingOpens.push(options);
}

/**
 * @param {Element | null | undefined} trigger
 */
export function closeFeedbackTriggerChrome(trigger) {
  if (!(trigger instanceof Element)) return;

  const dropdown = trigger.closest('.dropdown');
  if (dropdown && window.bootstrap?.Dropdown) {
    const toggle = dropdown.querySelector('[data-bs-toggle="dropdown"]');
    if (toggle) {
      const instance = window.bootstrap.Dropdown.getInstance(toggle)
        || window.bootstrap.Dropdown.getOrCreateInstance(toggle);
      instance?.hide();
    }
  }

  const offcanvas = trigger.closest('.offcanvas');
  if (offcanvas && window.bootstrap?.Offcanvas) {
    const instance = window.bootstrap.Offcanvas.getInstance(offcanvas);
    instance?.hide();
  }
}
