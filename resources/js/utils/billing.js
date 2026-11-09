/**
 * Client-side subscription helpers.
 * Mirrors User::effectiveSubscriptionTier / hasPremiumAccess / hasProAccess.
 */

function isUnrestricted() {
  if (typeof window === 'undefined') return false
  return window.mutqinUnrestrictedSubscription !== false
}

function isAdmin(auth = {}) {
  return !!auth?.is_admin
}

function isPaid(auth = {}) {
  if (isAdmin(auth) || auth?.has_paid_access === true) {
    return true
  }

  const status = String(auth?.subscription_status || '').toLowerCase()

  return status === 'trialing' || status === 'active'
}

export function resolveSubscriptionTier(auth = {}) {
  if (isAdmin(auth)) {
    return 'pro'
  }

  const tier = String(auth?.subscription_tier || 'free').toLowerCase()

  if ((tier === 'pro' || tier === 'premium') && isPaid(auth)) {
    return 'pro'
  }

  return 'free'
}

export function hasActiveSubscription(auth = {}) {
  return isPaid(auth)
}

export function hasPremiumAccess(auth = {}) {
  if (isUnrestricted() || auth?.has_premium_access === true || isAdmin(auth)) {
    return true
  }

  const tier = resolveSubscriptionTier(auth)

  return tier === 'premium' || tier === 'pro'
}

export function hasProAccess(auth = {}) {
  if (isUnrestricted() || auth?.has_pro_access === true || isAdmin(auth)) {
    return true
  }

  return resolveSubscriptionTier(auth) === 'pro'
}

export function maxSavedSessionsForTier(auth = {}) {
  if (isUnrestricted()) {
    return Number.POSITIVE_INFINITY
  }

  const tier = resolveSubscriptionTier(auth)

  if (tier === 'pro' || tier === 'premium') {
    return Number.POSITIVE_INFINITY
  }

  return Number.POSITIVE_INFINITY
}
