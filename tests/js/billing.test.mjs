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

assert.equal(hasPremiumAccess({ subscription_tier: 'free' }), false)
assert.equal(hasPremiumAccess({ subscription_tier: 'premium', subscription_status: 'active' }), true)
assert.equal(hasPremiumAccess({ subscription_tier: 'pro', subscription_status: 'active' }), true)
assert.equal(hasPremiumAccess({ subscription_tier: 'premium', subscription_status: 'canceled' }), false)

assert.equal(hasProAccess({ subscription_tier: 'premium', subscription_status: 'active' }), false)
assert.equal(hasProAccess({ subscription_tier: 'pro', subscription_status: 'active' }), true)
assert.equal(hasActiveSubscription({ subscription_status: 'trialing' }), true)

assert.equal(maxSavedSessionsForTier({ subscription_tier: 'free', subscription_status: 'active' }), 3)
assert.equal(maxSavedSessionsForTier({ subscription_tier: 'premium', subscription_status: 'active' }), 5)
assert.equal(maxSavedSessionsForTier({ subscription_tier: 'pro', subscription_status: 'active' }), Number.POSITIVE_INFINITY)

console.log('billing tests passed')
