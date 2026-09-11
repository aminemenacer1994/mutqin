<?php

namespace Tests\Unit;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_free_user_has_no_paid_features(): void
    {
        $user = User::factory()->create();

        $this->assertFalse($user->hasPaidAccess());
        $this->assertFalse($user->hasPremiumAccess());
        $this->assertFalse($user->hasProAccess());
        $this->assertSame('free', $user->effectiveSubscriptionTier());
    }

    public function test_premium_subscriber_does_not_get_pro(): void
    {
        $user = User::factory()->premium()->create();

        $this->assertTrue($user->hasPaidAccess());
        $this->assertTrue($user->hasPremiumAccess());
        $this->assertFalse($user->hasProAccess());
        $this->assertSame('premium', $user->effectiveSubscriptionTier());
    }

    public function test_pro_subscriber_gets_premium_and_pro(): void
    {
        $user = User::factory()->pro()->create();

        $this->assertTrue($user->hasPaidAccess());
        $this->assertTrue($user->hasPremiumAccess());
        $this->assertTrue($user->hasProAccess());
        $this->assertSame('pro', $user->effectiveSubscriptionTier());
    }

    public function test_canceled_premium_is_treated_as_free(): void
    {
        $user = User::factory()->premium()->create([
            'subscription_status' => 'canceled',
        ]);

        $this->assertFalse($user->hasPaidAccess());
        $this->assertFalse($user->hasPremiumAccess());
        $this->assertSame('free', $user->effectiveSubscriptionTier());
    }

    public function test_admin_bypasses_to_pro(): void
    {
        config(['mutqin.admin_emails' => ['admin@example.com']]);

        $admin = User::factory()->admin()->create([
            'email' => 'admin@example.com',
        ]);

        $this->assertTrue($admin->hasPremiumAccess());
        $this->assertTrue($admin->hasProAccess());
        $this->assertSame('pro', $admin->effectiveSubscriptionTier());
    }
}
