<?php

namespace Tests\Feature;

use App\Enums\AccountRole;
use App\Enums\ParentLinkStatus;
use App\Models\ParentStudentLink;
use App\Models\User;
use App\Services\Parent\ParentAccessAuthorizer;
use App\Support\Demo\ParentDemoCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Tests\TestCase;

class ParentDemoSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->enableParentFeatures();
        config()->set('mutqin.teacher_anchor_student_emails', [ParentDemoCatalog::CHILD_EMAIL]);
    }

    public function test_parent_demo_refuses_production(): void
    {
        $this->app['env'] = 'production';

        try {
            $this->artisan('mutqin:seed-parent-demo');
            $this->fail('Production seeding was allowed.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('production', $exception->getMessage());
        }

        $this->assertSame(0, User::query()->where('email', ParentDemoCatalog::PARENT_EMAIL)->count());
    }

    public function test_parent_demo_links_existing_child_without_changing_the_child(): void
    {
        $child = User::factory()->create([
            'name' => 'Existing Child',
            'email' => ParentDemoCatalog::CHILD_EMAIL,
            'account_role' => AccountRole::Student->value,
            'password' => 'child-secret',
        ]);
        $before = $child->fresh()->only(['name', 'email', 'account_role', 'password']);

        $this->artisan('mutqin:seed-parent-demo')->assertSuccessful();
        $this->artisan('mutqin:seed-parent-demo')->assertSuccessful();

        $child->refresh();
        $this->assertSame($before['name'], $child->name);
        $this->assertSame($before['email'], $child->email);
        $this->assertSame($before['account_role'], $child->account_role);
        $this->assertTrue(Hash::check('child-secret', $child->password));

        $parent = User::query()->where('email', ParentDemoCatalog::PARENT_EMAIL)->firstOrFail();
        $this->assertTrue($parent->isParent());
        $this->assertTrue(Hash::check(ParentDemoCatalog::PASSWORD, $parent->password));

        $this->assertSame(1, ParentStudentLink::query()->count());
        $link = ParentStudentLink::query()->firstOrFail();
        $this->assertSame(ParentLinkStatus::Approved, $link->status);
        $this->assertTrue(app(ParentAccessAuthorizer::class)->allows($parent, $child));

        $this->post(route('login'), [
            'email' => ParentDemoCatalog::PARENT_EMAIL,
            'password' => ParentDemoCatalog::PASSWORD,
        ])->assertRedirect(route('parent.dashboard'));

        $this->enableTeacherFeatures();
        $this->actingAs($parent)->get(route('teacher.dashboard'))
            ->assertRedirect(route('parent.dashboard'));

        $this->actingAs($parent)->get(route('parent.dashboard'))->assertOk();
        $this->actingAs($parent)->getJson(route('api.parent.shell'))
            ->assertOk()
            ->assertJsonPath('children_count', 1)
            ->assertJsonPath('children.0.id', $child->id);
    }

    public function test_parent_demo_requires_the_child_account_to_already_exist(): void
    {
        try {
            $this->artisan('mutqin:seed-parent-demo');
            $this->fail('Missing child was created.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString(ParentDemoCatalog::CHILD_EMAIL, $exception->getMessage());
        }

        $this->assertSame(0, User::query()->count());
    }
}
