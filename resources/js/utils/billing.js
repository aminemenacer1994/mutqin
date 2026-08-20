/**
 * Client-side subscription helpers.
 * All product features are free — these always grant access.
 */

export function resolveSubscriptionTier(auth = {}) {
  if (auth?.is_admin) {
    return 'pro'
  }

  const tier = String(auth?.subscription_tier || 'free').toLowerCase()

  if (tier === 'pro' || tier === 'premium') {
    return tier
  }

  return 'free'
}

export function hasActiveSubscription(auth = {}) {
  void auth
  return true
}

export function hasPremiumAccess(auth = {}) {
  void auth
  return true
}

export function hasProAccess(auth = {}) {
  void auth
  return true
}

export function maxSavedSessionsForTier(auth = {}) {
  void auth
  return Number.POSITIVE_INFINITY
}
