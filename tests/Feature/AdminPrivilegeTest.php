<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class AdminPrivilegeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['mutqin.admin_emails' => ['admin@example.com']]);
    }

    public function test_approved_verified_admin_can_access_admin_url_and_api(): void
    {
        $admin = User::factory()->admin()->create([
            'email' => 'admin@example.com',
            'email_verified_at' => now(),
        ]);

        $this->assertTrue($admin->isAdmin());

        $this->actingAs($admin)
            ->get(route('admin.dashboard'))
            ->assertOk();

        $this->actingAs($admin)
            ->getJson('/api/admin/dashboard')
            ->assertOk();
    }

    public function test_same_allowlisted_email_unverified_is_not_admin(): void
    {
        $admin = User::factory()->admin()->unverified()->create([
            'email' => 'admin@example.com',
        ]);

        $this->assertTrue($admin->hasPersistedAdminRole());
        $this->assertFalse($admin->isAdmin());

        $this->actingAs($admin)
            ->get(route('admin.dashboard'))
            ->assertForbidden();

        $this->actingAs($admin)
            ->getJson('/api/admin/dashboard')
            ->assertForbidden();
    }

    public function test_normal_user_cannot_access_admin_url_or_api(): void
    {
        $user = User::factory()->create([
            'email' => 'learner@example.com',
            'email_verified_at' => now(),
            'is_admin' => false,
        ]);

        $this->assertFalse($user->isAdmin());

        $this->actingAs($user)
            ->get(route('admin.dashboard'))
            ->assertForbidden();

        $this->actingAs($user)
            ->getJson('/api/admin/dashboard')
            ->assertForbidden();
    }

    public function test_forged_is_admin_payload_does_not_grant_privilege(): void
    {
        $user = User::factory()->create([
            'email' => 'learner@example.com',
            'is_admin' => false,
        ]);

        $this->actingAs($user)
            ->put(route('profile.update'), [
                'name' => $user->name,
                'email' => $user->email,
                'is_admin' => true,
                'role' => 'admin',
            ])
            ->assertRedirect();

        $fresh = $user->fresh();
        $this->assertFalse($fresh->hasPersistedAdminRole());
        $this->assertFalse($fresh->isAdmin());

        $this->actingAs($fresh)
            ->get(route('admin.dashboard'))
            ->assertForbidden();
    }

    public function test_forged_admin_email_in_request_does_not_grant_privilege(): void
    {
        $user = User::factory()->create([
            'email' => 'learner@example.com',
            'is_admin' => false,
        ]);

        $this->actingAs($user)
            ->get(route('admin.dashboard'), [
                'email' => 'admin@example.com',
            ])
            ->assertForbidden();

        $this->actingAs($user)
            ->getJson('/api/admin/dashboard?email=admin@example.com')
            ->assertForbidden();

        $this->actingAs($user)
            ->withHeaders([
                'X-User-Email' => 'admin@example.com',
                'X-Admin' => '1',
            ])
            ->getJson('/api/admin/dashboard')
            ->assertForbidden();
    }

    public function test_direct_admin_url_and_api_require_server_side_authorization(): void
    {
        $this->get(route('admin.dashboard'))
            ->assertRedirect(route('login'));

        $this->getJson('/api/admin/dashboard')
            ->assertUnauthorized();

        $learner = User::factory()->create(['email' => 'learner@example.com']);

        $this->actingAs($learner)
            ->get('/admin/dashboard')
            ->assertForbidden();

        $this->actingAs($learner)
            ->getJson('/api/admin/users')
            ->assertForbidden();
    }

    public function test_changing_email_off_allowlist_revokes_admin_flag(): void
    {
        Log::spy();

        $admin = User::factory()->admin()->create([
            'email' => 'admin@example.com',
            'email_verified_at' => now(),
        ]);

        $this->assertTrue($admin->isAdmin());

        $this->actingAs($admin)
            ->put(route('profile.update'), [
                'name' => $admin->name,
                'email' => 'not-admin@example.com',
            ])
            ->assertRedirect();

        $fresh = $admin->fresh();
        $this->assertSame('not-admin@example.com', $fresh->email);
        $this->assertNull($fresh->email_verified_at);
        $this->assertFalse($fresh->hasPersistedAdminRole());
        $this->assertFalse($fresh->isAdmin());

        Log::shouldHaveReceived('warning')
            ->withArgs(fn ($message) => is_string($message) && str_contains($message, 'admin_privilege_revoked'))
            ->atLeast()
            ->once();

        $this->actingAs($fresh)
            ->get(route('admin.dashboard'))
            ->assertForbidden();
    }

    public function test_verified_allowlisted_email_without_admin_flag_is_not_admin(): void
    {
        // Allowlist match alone must never grant privilege.
        $user = User::factory()->create([
            'email' => 'admin@example.com',
            'email_verified_at' => now(),
            'is_admin' => false,
        ]);

        $this->assertFalse($user->isAdmin());

        $this->actingAs($user)
            ->get(route('admin.dashboard'))
            ->assertForbidden();
    }

    public function test_admin_api_create_user_ignores_forged_role_fields(): void
    {
        $admin = User::factory()->admin()->create([
            'email' => 'admin@example.com',
        ]);

        $response = $this->actingAs($admin)
            ->postJson('/api/admin/users', [
                'name' => 'Forged Role',
                'email' => 'forged-role@example.com',
                'password' => 'secret12',
                'locale' => 'en',
                'is_admin' => true,
                'role' => 'super_admin',
                'subscription_status' => 'none',
                'subscription_tier' => 'none',
            ]);

        $response->assertCreated();

        $created = User::where('email', 'forged-role@example.com')->firstOrFail();
        $this->assertFalse($created->hasPersistedAdminRole());
        $this->assertFalse($created->isAdmin());
        $this->assertTrue(Hash::check('secret12', $created->password));
    }

    public function test_case_normalized_allowlist_match_still_requires_verification(): void
    {
        config(['mutqin.admin_emails' => ['Admin@Example.com']]);

        $verified = User::factory()->admin()->create([
            'email' => 'admin@example.com',
            'email_verified_at' => now(),
        ]);
        $this->assertTrue($verified->isAdmin());

        $verified->delete();

        $unverified = User::factory()->admin()->unverified()->create([
            'email' => 'admin@example.com',
        ]);
        $this->assertFalse($unverified->isAdmin());
    }
}
