/**
 * Small, privacy-safe bridge to the existing Meta Pixel snippet in Blade.
 *
 * Do not pass personal data here. The landing funnel needs only a small set of
 * action names and, for the primary CTA, its non-identifying destination.
 */
import { hasMarketingConsent } from './waitingListAttribution.js';

export const META_PIXEL_EVENTS = Object.freeze({
  WAITING_LIST_SIGNUP_COMPLETED: 'waiting_list_signup_completed',
  REGISTRATION_COMPLETED: 'registration_completed',
  PRIMARY_CTA_CLICKED: 'primary_cta_clicked',
  MEMORISATION_SESSION_STARTED: 'memorisation_session_started',
  MEMORISATION_SESSION_COMPLETED: 'memorisation_session_completed',
});

const sentConversions = new Set();

const EVENT_DEFINITIONS = Object.freeze({
  [META_PIXEL_EVENTS.WAITING_LIST_SIGNUP_COMPLETED]: { name: 'Lead', method: 'track' },
  [META_PIXEL_EVENTS.REGISTRATION_COMPLETED]: { name: 'CompleteRegistration', method: 'track' },
  [META_PIXEL_EVENTS.PRIMARY_CTA_CLICKED]: { name: 'MutqinPrimaryCtaClicked', method: 'trackCustom' },
  [META_PIXEL_EVENTS.MEMORISATION_SESSION_STARTED]: { name: 'MutqinMemorisationSessionStarted', method: 'trackCustom' },
  [META_PIXEL_EVENTS.MEMORISATION_SESSION_COMPLETED]: { name: 'MutqinMemorisationSessionCompleted', method: 'trackCustom' },
});

function safeProperties(properties = {}) {
  const destination = String(properties?.destination || '').trim().toLowerCase();
  if (!/^[a-z0-9_]{1,40}$/.test(destination)) return {};

  return { destination };
}

/**
 * Send one allow-listed browser Pixel event when the existing Pixel is ready.
 * It intentionally has no storage or network fallback: the Pixel owns delivery
 * and existing consent/runtime behaviour remains unchanged.
 */
export function trackMetaPixelEvent(event, properties = {}, eventId = '') {
  try {
    const definition = EVENT_DEFINITIONS[event];
    if (!definition || !hasMarketingConsent() || typeof window.fbq !== 'function') return;

    if (event === META_PIXEL_EVENTS.WAITING_LIST_SIGNUP_COMPLETED) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId) || sentConversions.has(eventId)) return;
      sentConversions.add(eventId);
      window.fbq(definition.method, definition.name, {}, { eventID: eventId });
      return;
    }

    window.fbq(definition.method, definition.name, safeProperties(properties));
  } catch {
    // Analytics must never interrupt a learner's journey.
  }
}

export function trackWaitingListConversion(status, payload) {
  if (status !== 201 || payload?.already_joined !== false || !payload?.conversion_event_id) return;
  trackMetaPixelEvent(META_PIXEL_EVENTS.WAITING_LIST_SIGNUP_COMPLETED, {}, payload.conversion_event_id);
}
