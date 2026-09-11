/**
 * Client-side subscription helpers.
 * Mirrors User::effectiveSubscriptionTier / hasPremiumAccess / hasProAccess.
 */

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
    return tier
  }

  return 'free'
}

export function hasActiveSubscription(auth = {}) {
  return isPaid(auth)
}

export function hasPremiumAccess(auth = {}) {
  if (auth?.has_premium_access === true || isAdmin(auth)) {
    return true
  }

  const tier = resolveSubscriptionTier(auth)

  return tier === 'premium' || tier === 'pro'
}

export function hasProAccess(auth = {}) {
  if (auth?.has_pro_access === true || isAdmin(auth)) {
    return true
  }

  return resolveSubscriptionTier(auth) === 'pro'
}

export function maxSavedSessionsForTier(auth = {}) {
  const tier = resolveSubscriptionTier(auth)

  if (tier === 'pro') {
    return Number.POSITIVE_INFINITY
  }

  if (tier === 'premium') {
    return 5
  }

  return 3
}
