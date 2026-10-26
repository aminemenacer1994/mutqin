<?php

namespace App\Services\Demo;

use App\Enums\OrganisationType;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\Organisation;
use App\Models\User;
use App\Support\DatabaseDeploySafety;
use App\Support\Demo\TeacherDemoCatalog;
use App\Support\Registration\OrganisationName;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

/**
 * Deletes only teacher-demo accounts and the organisations created for them.
 */
class TeacherDemoReset
{
    public function assertSafeToReplace(): void
    {
        DatabaseDeploySafety::assertNotProtectedEnvironment('reset teacher demo data');

        $emails = TeacherDemoCatalog::emails();
        foreach ($emails as $email) {
            DatabaseDeploySafety::assertDemoEmail($email, 'teacher demo seeder');
        }

        $existing = User::withTrashed()->whereIn('email', $emails)->get();
        foreach ($existing as $user) {
            if (! $this->owns($user)) {
                throw new RuntimeException(
                    "Refusing to overwrite {$user->email}: it is not a Mutqin teacher-demo account."
                );
            }
        }

        $orgIds = $this->demoOrganisations()->pluck('id');
        if ($orgIds->isEmpty()) {
            return;
        }

        $ownedIds = $existing->pluck('id');
        $stranger = User::withTrashed()
            ->whereIn('organisation_id', $orgIds)
            ->when($ownedIds->isNotEmpty(), fn ($query) => $query->whereNotIn('id', $ownedIds))
            ->exists();

        $groupIds = LearningGroup::query()->whereIn('organisation_id', $orgIds)->pluck('id');
        $strangerMember = false;
        if ($groupIds->isNotEmpty()) {
            $memberships = GroupMembership::query()->whereIn('learning_group_id', $groupIds);
            if ($ownedIds->isNotEmpty()) {
                $memberships->whereNotIn('user_id', $ownedIds);
            }
            $strangerMember = $memberships->exists();
        }

        if ($stranger || $strangerMember) {
            throw new RuntimeException(
                'Refusing to reset teacher demo data because a non-demo user is linked to a demo organisation or group.'
            );
        }
    }

    public function purge(): int
    {
        $emails = TeacherDemoCatalog::emails();
        $users = User::withTrashed()->whereIn('email', $emails)->get();
        $ids = $users->pluck('id')->map(fn ($id) => (int) $id)->all();

        if ($ids !== []) {
            $this->deleteLearningRows($ids);
            foreach ($users as $user) {
                $user->forceDelete();
            }
        }

        $this->demoOrganisations()->each(function (Organisation $organisation) {
            $stillAttached = User::withTrashed()->where('organisation_id', $organisation->id)->exists();
            if ($stillAttached) {
                throw new RuntimeException(
                    "Refusing to delete {$organisation->name} because a user is still linked to it."
                );
            }
            $organisation->delete();
        });

        return count($ids);
    }

    /**
     * @param  list<int>  $ids
     */
    private function deleteLearningRows(array $ids): void
    {
        $tables = [
            'teacher_recitation_assessments' => ['teacher_id', 'student_id'],
            'teacher_attendance_records' => ['teacher_id', 'student_id'],
            'teacher_notes' => ['teacher_id', 'student_id'],
            'teacher_assignment_recipients' => ['student_id'],
            'teacher_assignments' => ['teacher_id'],
            'group_memberships' => ['user_id'],
            'ai_recite_attempts' => ['user_id'],
            'memorisation_practice_plans' => ['user_id'],
            'memorisation_weak_spots' => ['user_id'],
            'memorisation_progress' => ['user_id'],
            'memorisation_assessments' => ['user_id'],
            'user_sessions' => ['user_id'],
        ];

        foreach ($tables as $table => $columns) {
            if (! Schema::hasTable($table)) {
                continue;
            }
            DB::table($table)->where(function ($query) use ($columns, $ids) {
                foreach ($columns as $index => $column) {
                    if ($index === 0) {
                        $query->whereIn($column, $ids);
                    } else {
                        $query->orWhereIn($column, $ids);
                    }
                }
            })->delete();
        }
    }

    /**
     * @return Collection<int, Organisation>
     */
    private function demoOrganisations(): Collection
    {
        return Organisation::query()
            ->get()
            ->filter(function (Organisation $organisation) {
                $legacy = array_map(fn (array $entry) => ['name' => $entry['name'], 'type' => $entry['type']], \App\Support\Registration\RegistrationOrganisationDirectory::entries());
                foreach (array_merge(TeacherDemoCatalog::organisations(), $legacy) as $definition) {
                    $canonical = OrganisationName::canonical($definition['name']);
                    $type = $organisation->type instanceof OrganisationType
                        ? $organisation->type->value
                        : (string) $organisation->type;
                    if ($type === $definition['type'] && $organisation->name_canonical === $canonical) {
                        return true;
                    }
                }

                return false;
            })
            ->values();
    }

    private function owns(User $user): bool
    {
        return str_starts_with((string) $user->stripe_customer_id, TeacherDemoCatalog::MARKER);
    }
}
