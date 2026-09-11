<?php

namespace Tests\Unit;

use App\Support\AuthRedirect;
use App\Support\BillingIntent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BillingIntentTest extends TestCase
{
    use RefreshDatabase;

    public function test_normalize_accepts_paid_plans_only(): void
    {
        $this->assertSame('pro_monthly', BillingIntent::normalize('pro_monthly'));
        $this->assertSame('pro_yearly', BillingIntent::normalize('PRO_YEARLY'));
        $this->assertNull(BillingIntent::normalize('free'));
        $this->assertNull(BillingIntent::normalize('not-a-plan'));
    }

    public function test_verified_user_with_billing_intent_goes_to_pricing_checkout(): void
    {
        $user = User::factory()->create();

        session([BillingIntent::SESSION_KEY => 'pro_monthly']);

        $this->assertSame(
            route('pricing', ['plan' => 'pro_monthly', 'checkout' => 1], false),
            AuthRedirect::path($user)
        );
    }

    public function test_unverified_user_still_goes_to_verification(): void
    {
        config(['auth.require_email_verification' => true]);

        $user = User::factory()->unverified()->create();

        session([BillingIntent::SESSION_KEY => 'pro_monthly']);

        $this->assertSame(route('verification.notice', absolute: false), AuthRedirect::path($user));
    }
}
