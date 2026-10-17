<?php

namespace Tests\Feature;

use App\Http\Middleware\ForwardMarketingWaitingListSignup;
use App\Models\User;
use App\Models\WaitingListEntry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class WaitingListAttributionTest extends TestCase
{
    use RefreshDatabase;

    public function test_migration_can_run_again_without_changing_existing_registrations(): void
    {
        $entry = WaitingListEntry::query()->create(['name' => 'Existing', 'email' => 'existing@example.com']);
        $migration = require database_path('migrations/2026_10_17_000001_add_attribution_to_waiting_list_entries.php');
        $migration->up();
        $this->assertNull($entry->fresh()->attribution);
        $this->assertSame('Existing', $entry->fresh()->name);
    }

    public function test_new_registration_stores_validated_touches_and_duplicates_do_not_replace_them(): void
    {
        $payload = [
            'name' => 'Amina', 'email' => 'amina@example.com',
            'attribution' => [
                'first' => ['utm_source' => 'facebook', 'utm_medium' => 'paid_social', 'utm_campaign' => 'launch', 'fbclid' => 'abc-123', 'referrer_host' => 'l.facebook.com', 'email' => 'do-not-store@example.com'],
                'last' => ['utm_source' => 'google', 'utm_campaign' => 'search', 'referrer_host' => 'l.facebook.com'],
            ],
        ];
        $response = $this->postJson(route('api.waiting-list.store'), $payload)->assertCreated()->assertJsonPath('already_joined', false);
        $this->assertMatchesRegularExpression('/^[a-f0-9-]{36}$/', $response->json('conversion_event_id'));
        $entry = WaitingListEntry::query()->firstOrFail();
        $this->assertSame('meta_ads', $entry->first_source);
        $this->assertSame('google', $entry->last_source);
        $this->assertSame('search', $entry->last_campaign);
        $this->assertSame('abc-123', $entry->attribution['first']['fbclid']);
        $this->assertArrayNotHasKey('email', $entry->attribution['first']);

        $payload['attribution']['last'] = ['utm_source' => 'instagram'];
        $this->postJson(route('api.waiting-list.store'), $payload)->assertOk()->assertJsonPath('already_joined', true)->assertJsonMissingPath('conversion_event_id');
        $this->assertSame('google', $entry->fresh()->last_source);
        $this->postJson(route('api.waiting-list.store'), ['name' => '', 'email' => 'bad'])->assertUnprocessable()->assertJsonMissingPath('conversion_event_id');
    }

    public function test_invalid_and_oversized_values_are_discarded_without_blocking_signup(): void
    {
        $this->postJson(route('api.waiting-list.store'), [
            'name' => 'Yusuf', 'email' => 'yusuf@example.com',
            'attribution' => [
                'first' => ['utm_source' => ['facebook'], 'utm_campaign' => str_repeat('a', 101), 'fbclid' => 'bad@example.com', 'referrer_host' => 'https://example.com/path?email=secret'],
                'last' => [],
            ],
        ])->assertCreated();
        $entry = WaitingListEntry::query()->firstOrFail();
        $this->assertSame(['source' => 'unknown'], $entry->attribution['first']);
        $this->assertSame('direct', $entry->last_source);
    }

    public function test_admin_report_includes_historical_unknowns_campaigns_and_daily_counts(): void
    {
        $this->travelTo(now('UTC')->setDate(2026, 10, 17)->setTime(12, 0));
        config()->set('mutqin.admin_emails', ['admin@example.com']);
        $admin = User::factory()->admin()->create(['email' => 'admin@example.com']);
        WaitingListEntry::query()->create(['name' => 'Old', 'email' => 'old@example.com'])->forceFill(['created_at' => now()->subDays(40)])->save();
        $this->postJson(route('api.waiting-list.store'), [
            'name' => 'New', 'email' => 'new@example.com',
            'attribution' => ['first' => ['utm_source' => 'instagram', 'utm_medium' => 'paid', 'utm_campaign' => 'launch'], 'last' => ['utm_source' => 'google', 'utm_campaign' => 'search']],
        ])->assertCreated();
        $this->actingAs($admin)->getJson('/api/admin/waiting-list/analytics')->assertOk()
            ->assertJsonPath('summary.total', 2)->assertJsonPath('summary.today', 1)
            ->assertJsonPath('summary.last_7_days', 1)->assertJsonPath('summary.last_30_days', 1)
            ->assertJsonFragment(['label' => 'unknown', 'total' => 1])
            ->assertJsonFragment(['label' => 'meta_ads', 'total' => 1])
            ->assertJsonFragment(['label' => 'google', 'total' => 1])
            ->assertJsonFragment(['label' => 'search', 'total' => 1])
            ->assertJsonFragment(['day' => '2026-10-17', 'total' => 1]);
        $this->actingAs(User::factory()->create())->getJson('/api/admin/waiting-list/analytics')->assertForbidden();
    }

    public function test_marketing_proxy_forwards_attribution_and_preserves_the_success_response(): void
    {
        Http::fake(['*' => Http::response(['already_joined' => false, 'conversion_event_id' => 'test'], 201)]);
        $attribution = ['first' => ['utm_source' => 'facebook'], 'last' => ['utm_campaign' => 'launch']];
        $request = Request::create('https://mutqin.ai/join-waiting-list', 'POST', [
            'name' => 'Amina', 'email' => 'amina@example.com', 'attribution' => $attribution,
        ]);
        $middleware = new class extends ForwardMarketingWaitingListSignup
        {
            protected function shouldForward(Request $request): bool
            {
                return true;
            }
        };
        $response = $middleware->handle($request, fn () => response('unexpected'));
        $this->assertSame(201, $response->getStatusCode());
        $this->assertSame('test', json_decode($response->getContent(), true)['conversion_event_id']);
        Http::assertSent(fn (ClientRequest $sent) => $sent['attribution'] === $attribution);
    }
}
