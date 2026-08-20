import assert from 'node:assert/strict'
import {
  hasActiveSubscription,
  hasPremiumAccess,
  hasProAccess,
  maxSavedSessionsForTier,
  resolveSubscriptionTier,
} from '../../resources/js/utils/billing.js'

assert.equal(resolveSubscriptionTier({ subscription_tier: 'free' }), 'free')
assert.equal(resolveSubscriptionTier({ subscription_tier: 'premium', subscription_status: 'active' }), 'premium')
assert.equal(resolveSubscriptionTier({ is_admin: true }), 'pro')

// All product features are free for every account.
assert.equal(hasPremiumAccess({ subscription_tier: 'free' }), true)
assert.equal(hasPremiumAccess({ subscription_tier: 'premium', subscription_status: 'active' }), true)
assert.equal(hasPremiumAccess({ subscription_tier: 'pro', subscription_status: 'active' }), true)
assert.equal(hasPremiumAccess({ subscription_tier: 'premium', subscription_status: 'canceled' }), true)

assert.equal(hasProAccess({ subscription_tier: 'premium', subscription_status: 'active' }), true)
assert.equal(hasProAccess({ subscription_tier: 'pro', subscription_status: 'active' }), true)
assert.equal(hasProAccess({ subscription_tier: 'free' }), true)
assert.equal(hasActiveSubscription({ subscription_status: 'trialing' }), true)
assert.equal(hasActiveSubscription({ subscription_status: 'free' }), true)

assert.equal(maxSavedSessionsForTier({ subscription_tier: 'free', subscription_status: 'active' }), Number.POSITIVE_INFINITY)
assert.equal(maxSavedSessionsForTier({ subscription_tier: 'premium', subscription_status: 'active' }), Number.POSITIVE_INFINITY)
assert.equal(maxSavedSessionsForTier({ subscription_tier: 'pro', subscription_status: 'active' }), Number.POSITIVE_INFINITY)

console.log('billing tests passed')
