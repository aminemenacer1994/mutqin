<?php

namespace Database\Seeders;

use App\Enums\AccountRole;
use App\Enums\ParentGuardianPermission;
use App\Enums\ParentLinkStatus;
use App\Models\ParentStudentLink;
use App\Models\ParentStudentLinkEvent;
use App\Models\User;
use App\Services\Auth\UserRoleService;
use App\Services\Parent\ParentAccessAuthorizer;
use App\Support\Demo\ParentDemoCatalog;
use Database\Seeders\Concerns\GuardsDemoSeeding;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use RuntimeException;

/**
 * Development-only parent linked to an existing child account.
 *
 * Seed: php artisan mutqin:seed-parent-demo
 *
 * Refuses production. Creates only the reserved @mutqin.test guardian.
 * Never changes the child account (password, role, or profile).
 */
class ParentDemoSeeder extends Seeder
{
    use GuardsDemoSeeding;

    public function run(): void
    {
        $this->guardAgainstProductionSeeding();
        $this->assertSafeDemoEmail(ParentDemoCatalog::PARENT_EMAIL);

        $child = $this->existingChild();
        $parent = $this->upsertParent();
        $this->approveLink($parent, $child);
        $this->report($parent, $child);
    }

    private function existingChild(): User
    {
        $child = User::query()
            ->whereRaw('LOWER(email) = ?', [strtolower(ParentDemoCatalog::CHILD_EMAIL)])
            ->first();

        if ($child === null) {
            throw new RuntimeException(
                'Child account '.ParentDemoCatalog::CHILD_EMAIL.' does not exist. '.
                'This seeder will not create that mailbox.'
            );
        }

        return $child;
    }

    private function upsertParent(): User
    {
        $existing = User::query()->where('email', ParentDemoCatalog::PARENT_EMAIL)->first();

        if ($existing !== null && $existing->stripe_customer_id !== ParentDemoCatalog::MARKER) {
            throw new RuntimeException(
                'Refusing to overwrite '.ParentDemoCatalog::PARENT_EMAIL.' because it is not a parent-demo account.'
            );
        }

        $joined = $existing?->created_at ?? Carbon::now();
        $parent = $existing ?? new User;
        $parent->forceFill([
            'name' => ParentDemoCatalog::PARENT_NAME,
            'email' => ParentDemoCatalog::PARENT_EMAIL,
            'password' => ParentDemoCatalog::PASSWORD,
            'email_verified_at' => $parent->email_verified_at ?? $joined,
            'password_set_at' => $joined,
            'locale' => $parent->locale ?: 'en',
            'theme' => $parent->theme ?: 'sepia-mode',
            'subscription_tier' => 'free',
            'subscription_plan' => 'free',
            'subscription_status' => 'free',
            'is_admin' => false,
            'account_role' => AccountRole::Parent,
            'organisation_id' => null,
            'stripe_customer_id' => ParentDemoCatalog::MARKER,
        ])->save();

        app(UserRoleService::class)->grant($parent->fresh(), AccountRole::Parent);

        return $parent->fresh();
    }

    private function approveLink(User $parent, User $child): void
    {
        $link = ParentStudentLink::query()->firstOrNew([
            'parent_user_id' => $parent->id,
            'student_user_id' => $child->id,
        ]);

        $alreadyApproved = $link->exists && $link->status === ParentLinkStatus::Approved;

        $link->forceFill([
            'status' => ParentLinkStatus::Approved,
            'relationship' => ParentDemoCatalog::RELATIONSHIP,
            'permissions' => ParentGuardianPermission::defaultGranted(),
            'requested_by_user_id' => $parent->id,
            'decided_by_user_id' => $child->id,
            'decided_at' => $link->decided_at ?? now(),
            'approved_at' => $link->approved_at ?? now(),
            'revoked_at' => null,
            'revoked_by_user_id' => null,
            'revoked_reason' => null,
        ])->save();

        if ($alreadyApproved) {
            return;
        }

        ParentStudentLinkEvent::query()->create([
            'parent_student_link_id' => $link->id,
            'actor_user_id' => $parent->id,
            'event' => 'approved',
            'metadata' => ['source' => 'parent-demo-seeder'],
            'created_at' => now(),
        ]);
    }

    private function report(User $parent, User $child): void
    {
        $command = $this->command;
        if ($command === null) {
            return;
        }

        $allowed = app(ParentAccessAuthorizer::class)->allows($parent, $child);

        $command->info('Parent demo ready.');
        $command->table(
            ['Role', 'Name', 'Email', 'Password'],
            [[
                'Parent',
                $parent->name,
                $parent->email,
                ParentDemoCatalog::PASSWORD,
            ]],
        );
        $command->line('Child (unchanged): '.$child->email.' — sign in separately with that account’s own password or Google.');
        $command->warn('Parent login is '.$parent->email.', not '.$child->email.'.');
        $command->line('Approved guardian link: '.($allowed ? 'yes' : 'no — enable MUTQIN_PARENT_FEATURES_ENABLED and keep this child on the teacher anchor list'));
        $command->line('Open: '.route('parent.dashboard'));
    }
}
