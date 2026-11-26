<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\Billing\SubscriptionEntitlement;
use App\Services\UserAiReciteUsageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LandingPreviewPricingAlignmentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('mutqin.landing_preview_enabled', true);
        config()->set('mutqin.landing_preview_emails', ['menacer72@gmail.com']);
    }

    public function test_billing_display_amounts_match_audited_config(): void
    {
        $this->assertSame(299, config('billing.plans.premium_monthly.expected_unit_amount'));
        $this->assertSame('2.99', config('billing.plans.premium_monthly.display_amount'));
        $this->assertSame(499, config('billing.plans.premium_plus_monthly.expected_unit_amount'));
        $this->assertSame('4.99', config('billing.plans.premium_plus_monthly.display_amount'));
    }

    public function test_entitlement_limits_match_billing_config(): void
    {
        $entitlement = app(SubscriptionEntitlement::class);
        $user = User::factory()->create();

        $this->assertSame(
            (int) config('billing.limits.free.ai_assessments_per_day'),
            app(UserAiReciteUsageService::class)->resolvedDailyLimit($user)
        );
        $this->assertSame(
            (int) config('billing.limits.free.saved_sessions'),
            $entitlement->freeSavedSessionsLimit()
        );
        $this->assertSame(
            (int) config('billing.limits.free.saved_sessions'),
            $entitlement->savedSessionsLimit($user)
        );

        $premium = User::factory()->premium()->create();
        $this->assertSame(
            (int) config('billing.limits.premium.saved_sessions'),
            $entitlement->savedSessionsLimit($premium)
        );
    }

    public function test_preview_pricing_page_is_gated_and_exposes_billing_payload(): void
    {
        $allowed = User::factory()->create([
            'email' => 'menacer72@gmail.com',
            'email_verified_at' => now(),
        ]);

        $freeAi = (int) config('billing.limits.free.ai_assessments_per_day', 5);
        $freeSaved = (int) config('billing.limits.free.saved_sessions', 5);

        $this->actingAs($allowed)
            ->get('/preview/pricing')
            ->assertOk()
            ->assertSee('pricing-page', false)
            ->assertSee('"freeAiAssessmentsPerDay":'.$freeAi, false)
            ->assertSee('"freeSavedSessions":'.$freeSaved, false)
            ->assertSee('"premiumMonthly":"'.config('billing.plans.premium_monthly.display_amount').'"', false)
            ->assertSee('"premiumPlusMonthly":"'.config('billing.plans.premium_plus_monthly.display_amount').'"', false)
            ->assertHeader('X-Robots-Tag', 'noindex, follow');
    }

    public function test_no_teacher_or_institution_checkout_plans_in_config(): void
    {
        $plans = array_keys(config('billing.plans', []));
        foreach ($plans as $key) {
            $this->assertStringNotContainsString('teacher', $key);
            $this->assertStringNotContainsString('institution', $key);
        }
    }
}
