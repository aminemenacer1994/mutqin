import assert from 'node:assert/strict'
import {
  hasActiveSubscription,
  hasPremiumAccess,
  hasProAccess,
  maxSavedSessionsForTier,
  resolveSubscriptionTier,
} from '../../resources/js/utils/billing.js'

assert.equal(resolveSubscriptionTier({ subscription_tier: 'free' }), 'free')
assert.equal(resolveSubscriptionTier({ subscription_tier: 'premium', subscription_status: 'active' }), 'pro')
assert.equal(resolveSubscriptionTier({ subscription_tier: 'premium', subscription_status: 'canceled' }), 'free')
assert.equal(resolveSubscriptionTier({ is_admin: true }), 'pro')

assert.equal(hasPremiumAccess({ subscription_tier: 'free' }), false)
assert.equal(hasPremiumAccess({ subscription_tier: 'premium', subscription_status: 'active' }), true)
assert.equal(hasPremiumAccess({ subscription_tier: 'pro', subscription_status: 'active' }), true)
assert.equal(hasPremiumAccess({ subscription_tier: 'premium', subscription_status: 'canceled' }), false)
assert.equal(hasPremiumAccess({ is_admin: true }), true)

assert.equal(hasProAccess({ subscription_tier: 'premium', subscription_status: 'active' }), true)
assert.equal(hasProAccess({ subscription_tier: 'pro', subscription_status: 'active' }), true)
assert.equal(hasProAccess({ subscription_tier: 'free' }), false)
assert.equal(hasProAccess({ is_admin: true }), true)

assert.equal(hasActiveSubscription({ subscription_status: 'trialing' }), true)
assert.equal(hasActiveSubscription({ subscription_status: 'free' }), false)
assert.equal(hasActiveSubscription({ has_paid_access: true }), true)

assert.equal(maxSavedSessionsForTier({ subscription_tier: 'free' }), Number.POSITIVE_INFINITY)
assert.equal(maxSavedSessionsForTier({ subscription_tier: 'premium', subscription_status: 'active' }), Number.POSITIVE_INFINITY)
assert.equal(maxSavedSessionsForTier({ subscription_tier: 'pro', subscription_status: 'active' }), Number.POSITIVE_INFINITY)

console.log('billing tests passed')
