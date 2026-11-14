<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\AdvancedAnalyticsAccess;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdvancedAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('mutqin.admin_emails', [AdvancedAnalyticsAccess::ALLOWED_EMAIL]);
    }

    public function test_advanced_analytics_requires_authentication(): void
    {
        $this->getJson(route('api.analytics.advanced'))
            ->assertUnauthorized();
    }

    public function test_advanced_analytics_is_hidden_from_regular_and_pro_users(): void
    {
        $learner = User::factory()->create([
            'email' => 'learner@example.com',
            'is_admin' => false,
        ]);

        $this->actingAs($learner)
            ->getJson(route('api.analytics.advanced'))
            ->assertForbidden()
            ->assertJsonPath('reason', 'super_admin_required');

        $pro = User::factory()->pro()->create([
            'email' => 'pro@example.com',
            'is_admin' => false,
        ]);

        $this->actingAs($pro)
            ->getJson(route('api.analytics.advanced'))
            ->assertForbidden()
            ->assertJsonPath('reason', 'super_admin_required');
    }

    public function test_super_admin_receives_report_skeleton(): void
    {
        $user = User::factory()->pro()->admin()->create([
            'email' => AdvancedAnalyticsAccess::ALLOWED_EMAIL,
            'email_verified_at' => now(),
        ]);

        $this->actingAs($user)
            ->getJson(route('api.analytics.advanced'))
            ->assertOk()
            ->assertJsonPath('report.period.preset', '30')
            ->assertJsonPath('report.overview.practice_time_seconds', 0)
            ->assertJsonPath('report.overview.ai_checks', 0)
            ->assertJsonStructure([
                'report' => [
                    'period' => ['preset', 'from', 'to', 'label_days', 'previous_from', 'previous_to'],
                    'overview' => [
                        'practice_time_seconds',
                        'ayahs_practised',
                        'memorisation_progress',
                        'revision_sessions',
                        'ai_accuracy',
                        'ai_checks',
                        'practice_days',
                        'deltas',
                    ],
                    'series' => [
                        'practice_activity',
                        'session_mix',
                        'ai_performance',
                        'assessment_breakdown',
                        'surah_progress',
                    ],
                    'attention_ayahs',
                    'insights',
                    'user' => ['display_name'],
                ],
            ]);
    }
}
