<?php

namespace Database\Seeders;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\AiReciteAttempt;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\MemorisationPracticePlan;
use App\Models\MemorisationProgress;
use App\Models\MemorisationWeakSpot;
use App\Models\Organisation;
use App\Models\User;
use App\Models\UserSession;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Support\Demo\OrganisationNetworkCatalog;
use App\Support\Demo\OrganisationNetworkClassroom;
use App\Support\Registration\OrganisationName;
use Database\Seeders\Concerns\GuardsDemoSeeding;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * 10 teachers, 40 students, shared organisations, and classroom practice data.
 *
 * Seed:  php artisan mutqin:seed-organisation-network
 * Password: OrganisationDemo1!
 */
class OrganisationNetworkSeeder extends Seeder
{
    use GuardsDemoSeeding;

    public function run(): void
    {
        $this->guardAgainstProductionSeeding();

        $classroom = app(OrganisationNetworkClassroom::class);

        Model::withoutEvents(function () use ($classroom) {
            DB::transaction(function () use ($classroom) {
                $planted = [];
                foreach (OrganisationNetworkCatalog::networks() as $network) {
                    $planted[] = $this->seedNetwork($network);
                }

                $userIds = User::query()
                    ->whereIn('email', OrganisationNetworkCatalog::emails())
                    ->pluck('id')
                    ->map(fn ($id) => (int) $id)
                    ->all();
                $classroom->purgeActivity($userIds);

                foreach ($planted as $network) {
                    foreach ($network['students'] as $index => $student) {
                        $teacher = $network['teachers'][$index % count($network['teachers'])];
                        $classroom->plantStudent($student['user'], $teacher, $student['definition']);
                    }
                }
            });
        });

        $this->report();
    }

    /**
     * @param  array{
     *     key: string,
     *     type: string,
     *     name: string,
     *     group: string,
     *     teachers: list<array{key: string, name: string, email: string}>,
     *     students: list<array{key: string, name: string, email: string, number: int, profile: string, ordinal: int}>
     * }  $network
     * @return array{teachers: list<User>, students: list<array{user: User, definition: array<string, mixed>}>}
     */
    private function seedNetwork(array $network): array
    {
        $canonicalName = OrganisationName::canonical($network['name']);
        $organisation = Organisation::query()->where('name_canonical', $canonicalName)->first() ?? new Organisation;
        $organisation->forceFill([
            'type' => $network['type'],
            'name' => OrganisationName::display($network['name']),
            'name_canonical' => $canonicalName,
        ])->save();

        $canonicalGroup = OrganisationName::canonical($network['group']);
        $group = LearningGroup::query()
            ->where('organisation_id', $organisation->id)
            ->where('name_canonical', $canonicalGroup)
            ->first() ?? new LearningGroup;
        $group->forceFill([
            'organisation_id' => $organisation->id,
            'name' => OrganisationName::display($network['group']),
            'name_canonical' => $canonicalGroup,
        ])->save();

        $teachers = [];
        foreach ($network['teachers'] as $teacherDefinition) {
            $teacher = $this->seedUser($teacherDefinition, AccountRole::Teacher, $organisation);
            $this->seedMembership($teacher, $group, MembershipRole::Teacher, false);
            $teachers[] = $teacher;
        }

        $students = [];
        foreach ($network['students'] as $studentDefinition) {
            $student = $this->seedUser($studentDefinition, AccountRole::Student, $organisation);
            $this->seedMembership($student, $group, MembershipRole::Student, true);
            $students[] = [
                'user' => $student,
                'definition' => $studentDefinition,
            ];
        }

        return [
            'teachers' => $teachers,
            'students' => $students,
        ];
    }

    /**
     * @param  array{key: string, name: string, email: string}  $definition
     */
    private function seedUser(array $definition, AccountRole $role, Organisation $organisation): User
    {
        $this->assertSafeDemoEmail($definition['email']);
        $joined = now()->subDays(45);

        $user = User::query()->where('email', $definition['email'])->first() ?? new User;
        $user->forceFill([
            'name' => $definition['name'],
            'email' => $definition['email'],
            'password' => OrganisationNetworkCatalog::PASSWORD,
            'email_verified_at' => $joined,
            'password_set_at' => $joined,
            'locale' => 'en',
            'theme' => 'sepia-mode',
            'subscription_tier' => 'free',
            'subscription_plan' => 'free',
            'subscription_status' => 'free',
            'is_admin' => false,
            'account_role' => $role,
            'organisation_id' => $organisation->id,
            'stripe_customer_id' => OrganisationNetworkCatalog::markerFor($definition['key']),
        ])->save();

        return $user;
    }

    private function seedMembership(User $user, LearningGroup $group, MembershipRole $role, bool $consent): void
    {
        $at = now()->subDays($role === MembershipRole::Student ? 14 : 21);

        $membership = GroupMembership::query()
            ->where('learning_group_id', $group->id)
            ->where('user_id', $user->id)
            ->first() ?? new GroupMembership;
        $membership->forceFill([
            'learning_group_id' => $group->id,
            'user_id' => $user->id,
            'membership_role' => $role,
            'status' => MembershipStatus::Approved,
            'analytics_consent_status' => $consent ? AnalyticsConsentStatus::Granted : AnalyticsConsentStatus::None,
            'analytics_consent_at' => $consent ? $at : null,
            'analytics_consent_version' => $consent ? GroupMembership::ANALYTICS_CONSENT_VERSION : null,
            'analytics_consent_user_id' => $consent ? $user->id : null,
        ])->save();
    }

    private function report(): void
    {
        $command = $this->command;
        if ($command === null) {
            return;
        }

        $access = app(StudentAccessAuthorizer::class);
        $emails = OrganisationNetworkCatalog::emails();
        $ids = User::query()->whereIn('email', $emails)->pluck('id');
        $rows = [];

        foreach (OrganisationNetworkCatalog::networks() as $network) {
            foreach ($network['teachers'] as $teacherDefinition) {
                $teacher = User::query()->where('email', $teacherDefinition['email'])->first();
                $studentCount = $teacher ? $access->authorizedStudentIds($teacher)->count() : 0;
                $rows[] = [
                    $network['name'],
                    $teacherDefinition['email'],
                    (string) $studentCount.' students',
                ];
            }
        }

        $command->newLine();
        $command->info('Organisation network ready. Password: '.OrganisationNetworkCatalog::PASSWORD);
        $command->line('Open the teacher platform at /teacher after signing in.');
        $command->table(['Organisation', 'Teacher email', 'Sees'], $rows);
        $command->table(['Record', 'Count'], [
            ['Teachers', (string) OrganisationNetworkCatalog::TEACHER_COUNT],
            ['Students', (string) OrganisationNetworkCatalog::STUDENT_COUNT],
            ['Practice sessions', (string) UserSession::query()->whereIn('user_id', $ids)->count()],
            ['AI recitations', (string) AiReciteAttempt::query()->whereIn('user_id', $ids)->count()],
            ['Weak ayahs / words', (string) MemorisationWeakSpot::query()->whereIn('user_id', $ids)->count()],
            ['Ayahs practised', (string) MemorisationProgress::query()->whereIn('user_id', $ids)->count()],
            ['Ayahs to revisit', (string) MemorisationPracticePlan::query()->whereIn('user_id', $ids)->count()],
        ]);
    }
}
