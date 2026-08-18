/**
 * Client-side subscription tier checks (mirrors app/Models/User.php).
 * Server middleware is authoritative; these gates improve UX before API calls.
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
  if (auth?.is_admin) {
    return true
  }

  const status = String(auth?.subscription_status || 'free').toLowerCase()

  return status === 'trialing' || status === 'active'
}

export function hasPremiumAccess(auth = {}) {
  if (!hasActiveSubscription(auth)) {
    return false
  }

  const tier = resolveSubscriptionTier(auth)

  return tier === 'premium' || tier === 'pro'
}

export function hasProAccess(auth = {}) {
  if (!hasActiveSubscription(auth)) {
    return false
  }

  return resolveSubscriptionTier(auth) === 'pro'
}

export function pricingUpgradeUrl(auth = {}) {
  return auth?.pricing_url || '/pricing'
}
