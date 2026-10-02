<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\WaitingListEntry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WaitingListFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_waiting_list_page_is_available(): void
    {
        $this->get(route('waiting-list'))
            ->assertOk()
            ->assertSee('<waiting-list-page', false);
    }

    public function test_public_waiting_list_page_exposes_real_signup_count(): void
    {
        WaitingListEntry::query()->create([
            'name' => 'Amina',
            'email' => 'amina@example.com',
        ]);

        $this->get(route('waiting-list'))
            ->assertOk()
            ->assertSee('count="1"', false);
    }

    public function test_public_waiting_list_requires_name_and_email(): void
    {
        $this->postJson(route('api.waiting-list.store'), [
            'email' => 'solo@example.com',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['name']);

        $response = $this->postJson(route('api.waiting-list.store'), [
            'name' => 'Yusuf',
            'email' => 'solo@example.com',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.email', 'solo@example.com');

        $this->assertDatabaseHas('waiting_list_entries', [
            'name' => 'Yusuf',
            'email' => 'solo@example.com',
        ]);
    }

    public function test_public_waiting_list_web_route_accepts_submissions(): void
    {
        $response = $this->postJson(route('waiting-list.store'), [
            'name' => '  Yusuf  ',
            'email' => '  yusuf.web@Example.COM ',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.email', 'yusuf.web@example.com');
    }

    public function test_marketing_host_waiting_list_post_accepts_real_email(): void
    {
        $this->withServerVariables([
            'HTTP_HOST' => 'mutqin.ai',
            'HTTPS' => 'on',
            'SERVER_NAME' => 'mutqin.ai',
        ])->postJson('/api/waiting-list', [
            'name' => 'Mohamed',
            'email' => 'menacer72@gmail.com',
        ])->assertCreated()
            ->assertJsonPath('already_joined', false)
            ->assertJsonPath('data.email', 'menacer72@gmail.com');
    }

    public function test_public_join_route_accepts_signup_from_marketing_origin(): void
    {
        $response = $this->withHeaders([
            'Origin' => 'https://mutqin.ai',
            'Referer' => 'https://mutqin.ai/waiting-list',
        ])->postJson(route('waiting-list.public-store'), [
            'name' => 'Mohamed',
            'email' => 'menacer72@gmail.com',
        ]);

        $response->assertCreated()
            ->assertJsonPath('already_joined', false)
            ->assertJsonPath('data.email', 'menacer72@gmail.com');
    }

    public function test_waiting_list_page_exposes_csrf_free_join_endpoint(): void
    {
        $this->get(route('waiting-list'))
            ->assertOk()
            ->assertSee('join-waiting-list', false);
    }

    public function test_local_waiting_list_store_url_stays_on_the_current_host(): void
    {
        config([
            'app.url' => 'http://localhost:8000',
            'mutqin.domains.enable_in_tests' => true,
        ]);

        $request = \Illuminate\Http\Request::create('http://localhost:8000/waiting-list', 'GET', [], [], [], [
            'HTTP_HOST' => 'localhost:8000',
        ]);

        $this->assertSame(
            'http://localhost:8000/join-waiting-list',
            \App\Support\MutqinDomains::waitingListStoreUrl($request)
        );
        $this->assertStringNotContainsString(
            'app.mutqin.ai',
            \App\Support\MutqinDomains::waitingListStoreUrl($request)
        );
    }

    public function test_marketing_hostname_on_local_app_still_posts_to_same_origin(): void
    {
        $this->app->detectEnvironment(fn () => 'local');

        config([
            'app.url' => 'http://mutqin.test',
            'mutqin.domains.enable_in_local' => false,
        ]);

        $request = \Illuminate\Http\Request::create('http://mutqin.test/waiting-list', 'GET', [], [], [], [
            'HTTP_HOST' => 'mutqin.ai',
        ]);

        $this->assertStringNotContainsString(
            'app.mutqin.ai',
            \App\Support\MutqinDomains::waitingListStoreUrl($request)
        );
        $this->assertStringContainsString(
            '/join-waiting-list',
            \App\Support\MutqinDomains::waitingListStoreUrl($request)
        );
    }

    public function test_public_waiting_list_submission_is_stored_with_normalised_email(): void
    {
        $response = $this->postJson(route('api.waiting-list.store'), [
            'name' => '  Amina  ',
            'email' => '  Amina@Example.COM ',
        ]);

        $response->assertCreated()
            ->assertJsonPath('already_joined', false)
            ->assertJsonPath('data.email', 'amina@example.com');

        $this->assertDatabaseHas('waiting_list_entries', [
            'name' => 'Amina',
            'email' => 'amina@example.com',
        ]);
    }

    public function test_duplicate_email_is_handled_gracefully(): void
    {
        WaitingListEntry::query()->create([
            'name' => 'Amina',
            'email' => 'amina@example.com',
        ]);

        $response = $this->postJson(route('api.waiting-list.store'), [
            'name' => 'Amina Again',
            'email' => 'AMINA@example.com',
        ]);

        $response->assertOk()
            ->assertJsonPath('already_joined', true)
            ->assertJsonPath('message', 'You are already on the waiting list.');

        $this->assertSame(1, WaitingListEntry::query()->count());
        $this->assertDatabaseHas('waiting_list_entries', [
            'name' => 'Amina',
            'email' => 'amina@example.com',
        ]);
    }

    public function test_waiting_list_validation_rejects_invalid_payloads(): void
    {
        $this->postJson(route('api.waiting-list.store'), [
            'name' => '',
            'email' => 'not-an-email',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email']);

        $this->assertDatabaseCount('waiting_list_entries', 0);
    }

    public function test_waiting_list_rejects_disposable_email_domains(): void
    {
        $this->postJson(route('api.waiting-list.store'), [
            'name' => 'Test User',
            'email' => 'someone@mailinator.com',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['email']);

        $this->assertDatabaseCount('waiting_list_entries', 0);
    }

    public function test_duplicate_email_is_not_inserted_twice_under_race(): void
    {
        WaitingListEntry::query()->create([
            'name' => 'First',
            'email' => 'race@example.com',
        ]);

        $this->postJson(route('api.waiting-list.store'), [
            'name' => 'Second',
            'email' => 'race@example.com',
        ])->assertOk()
            ->assertJsonPath('already_joined', true);

        $this->assertSame(1, WaitingListEntry::query()->where('email', 'race@example.com')->count());
    }

    public function test_admin_can_view_waiting_list_entries(): void
    {
        config()->set('mutqin.admin_emails', ['admin@example.com']);

        $admin = User::factory()->admin()->create([
            'email' => 'admin@example.com',
        ]);

        WaitingListEntry::query()->create([
            'name' => 'Amina',
            'email' => 'amina@example.com',
        ]);

        $this->actingAs($admin)
            ->get(route('admin.waiting-list.index'))
            ->assertOk()
            ->assertSee('Amina')
            ->assertSee('amina@example.com');

        $export = $this->actingAs($admin)
            ->get(route('admin.waiting-list.export'))
            ->assertOk()
            ->assertHeader('content-disposition');

        $csv = $export->streamedContent();
        $this->assertStringContainsString('name,email,joined_at', $csv);
        $this->assertStringContainsString('amina@example.com', $csv);
    }

    public function test_non_admin_cannot_view_waiting_list_entries(): void
    {
        $user = User::factory()->create([
            'email' => 'learner@example.com',
        ]);

        $this->actingAs($user)
            ->get(route('admin.waiting-list.index'))
            ->assertForbidden();
    }

    public function test_admin_waiting_list_api_lists_new_signups_and_deletes_them(): void
    {
        config()->set('mutqin.admin_emails', ['admin@example.com']);

        $admin = User::factory()->admin()->create([
            'email' => 'admin@example.com',
        ]);

        $this->postJson(route('api.waiting-list.store'), [
            'name' => 'Layla Beginner',
            'email' => 'layla.beginner@example.com',
        ])->assertCreated();

        $entry = WaitingListEntry::query()->where('email', 'layla.beginner@example.com')->first();
        $this->assertNotNull($entry);

        $this->actingAs($admin)
            ->getJson('/api/admin/waiting-list?q=layla')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('items.0.id', $entry->id)
            ->assertJsonPath('items.0.name', 'Layla Beginner')
            ->assertJsonPath('items.0.email', 'layla.beginner@example.com');

        $this->actingAs($admin)
            ->getJson("/api/admin/waiting-list/{$entry->id}")
            ->assertOk()
            ->assertJsonPath('entry.email', 'layla.beginner@example.com');

        $this->actingAs($admin)
            ->deleteJson("/api/admin/waiting-list/{$entry->id}")
            ->assertOk();

        $this->assertDatabaseMissing('waiting_list_entries', [
            'id' => $entry->id,
        ]);
    }

    public function test_non_admin_cannot_use_waiting_list_admin_api(): void
    {
        $user = User::factory()->create([
            'email' => 'learner@example.com',
        ]);

        $entry = WaitingListEntry::query()->create([
            'name' => 'Amina',
            'email' => 'amina@example.com',
        ]);

        $this->actingAs($user)->getJson('/api/admin/waiting-list')->assertForbidden();
        $this->actingAs($user)->getJson("/api/admin/waiting-list/{$entry->id}")->assertForbidden();
        $this->actingAs($user)->deleteJson("/api/admin/waiting-list/{$entry->id}")->assertForbidden();
    }
}
