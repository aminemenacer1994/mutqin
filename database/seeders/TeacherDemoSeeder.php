<?php

namespace Database\Seeders;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\AssignmentKind;
use App\Enums\AssignmentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\TeacherNoteKind;
use App\Enums\UserSessionStatus;
use App\Models\AiReciteAttempt;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\MemorisationAssessment;
use App\Models\MemorisationPracticePlan;
use App\Models\MemorisationProgress;
use App\Models\MemorisationWeakSpot;
use App\Models\Organisation;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\TeacherNote;
use App\Models\User;
use App\Models\UserSession;
use App\Services\Demo\TeacherDemoReset;
use App\Services\Memorisation\RecitationScoringThresholds;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Services\Organisations\TeacherAnchorStudentEnroller;
use App\Services\Teacher\TeacherAssignmentService;
use App\Support\Demo\TeacherDemoCatalog;
use App\Support\QuranMetadata;
use App\Support\Registration\OrganisationName;
use Database\Seeders\Concerns\GuardsDemoSeeding;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Development-only teacher and student classroom.
 *
 * Seed:  php artisan mutqin:seed-teacher-demo
 * Reset: php artisan mutqin:reset-teacher-demo
 *
 * Both commands refuse to run when APP_ENV is production. They never update
 * an account that does not already carry the teacher-demo ownership marker.
 */
class TeacherDemoSeeder extends Seeder
{
    use GuardsDemoSeeding;

    private int $sessionCount = 0;

    private int $attemptCount = 0;

    private int $assignmentCount = 0;

    /** @var array<string, Organisation> */
    private array $organisations = [];

    /** @var array<string, LearningGroup> */
    private array $groups = [];

    /** @var array<string, User> */
    private array $teachers = [];

    /** @var array<int, User> */
    private array $students = [];

    public function run(): void
    {
        $this->guardAgainstProductionSeeding();

        $reset = app(TeacherDemoReset::class);
        $reset->assertSafeToReplace();

        Model::withoutEvents(function () use ($reset) {
            DB::transaction(function () use ($reset) {
                $reset->purge();
                $this->plant();
            });
        });

        $this->report();
    }

    private function plant(): void
    {
        $this->assertRanges();
        $this->seedOrganisations();
        $this->seedGroups();
        $this->seedTeachers();
        $this->seedStudents();
        $this->seedAssignments();
        $this->seedNotes();
        $this->refreshAssignmentStatuses();
        $this->assertVolumes();
        app(TeacherAnchorStudentEnroller::class)->enrolAll();
    }

    private function assertRanges(): void
    {
        $ranges = array_merge(
            TeacherDemoCatalog::PRACTICE_RANGES,
            [
                TeacherDemoCatalog::STORY_RANGE,
                TeacherDemoCatalog::OVERDUE_RANGE,
                TeacherDemoCatalog::PROGRESS_RANGE,
                TeacherDemoCatalog::PENDING_RANGE,
            ],
        );

        foreach ($ranges as $range) {
            if (! QuranMetadata::isValidAyah($range['surah'], $range['from']) || ! QuranMetadata::isValidAyah($range['surah'], $range['to'])) {
                throw new RuntimeException("Teacher demo range {$range['surah']}:{$range['from']}-{$range['to']} is not a real ayah span.");
            }
        }
    }

    private function seedOrganisations(): void
    {
        foreach (TeacherDemoCatalog::organisations() as $definition) {
            $organisation = new Organisation;
            $organisation->forceFill([
                'type' => $definition['type'],
                'name' => OrganisationName::display($definition['name']),
                'name_canonical' => OrganisationName::canonical($definition['name']),
            ])->save();
            $this->organisations[$definition['key']] = $organisation;
        }
    }

    private function seedGroups(): void
    {
        foreach (TeacherDemoCatalog::groups() as $definition) {
            $group = new LearningGroup;
            $group->forceFill([
                'organisation_id' => $this->organisations[$definition['org']]->id,
                'name' => OrganisationName::display($definition['name']),
                'name_canonical' => OrganisationName::canonical($definition['name']),
            ])->save();
            $this->groups[$definition['key']] = $group;
        }
    }

    private function seedTeachers(): void
    {
        foreach (TeacherDemoCatalog::teachers() as $definition) {
            $user = $this->makeUser($definition, AccountRole::Teacher, $definition['org'], now()->subDays(140));
            $this->teachers[$definition['key']] = $user;
            foreach ($definition['groups'] as $groupKey) {
                $this->membership($user, $this->groups[$groupKey], MembershipRole::Teacher, false);
            }
        }
    }

    private function seedStudents(): void
    {
        foreach (TeacherDemoCatalog::students() as $definition) {
            $joined = $definition['profile'] === 'new'
                ? now()->subDays($definition['number'] === TeacherDemoCatalog::NEW_EMPTY ? 2 : 1)
                : now()->subDays(120);
            $user = $this->makeUser($definition, AccountRole::Student, $this->groupOrganisationKey($definition['group']), $joined);
            $this->students[$definition['number']] = $user;
            $this->membership($user, $this->groups[$definition['group']], MembershipRole::Student, true);
            $this->seedActivity($user, $definition);
        }
    }

    /**
     * @param  array{number: int, key: string, email: string, name: string, profile: string, ordinal: int, group: string}  $definition
     */
    private function makeUser(array $definition, AccountRole $role, string $organisationKey, Carbon $joined): User
    {
        $user = new User;
        $user->forceFill([
            'name' => $definition['name'],
            'email' => $definition['email'],
            'password' => TeacherDemoCatalog::PASSWORD,
            'email_verified_at' => $joined,
            'password_set_at' => $joined,
            'locale' => 'en',
            'theme' => 'sepia-mode',
            'subscription_tier' => 'free',
            'subscription_plan' => 'free',
            'subscription_status' => 'free',
            'is_admin' => false,
            'account_role' => $role,
            'organisation_id' => $this->organisations[$organisationKey]->id,
            'stripe_customer_id' => TeacherDemoCatalog::markerFor($definition['key']),
            'created_at' => $joined,
            'updated_at' => $joined,
        ])->save();

        return $user;
    }

    private function membership(User $user, LearningGroup $group, MembershipRole $role, bool $consent): void
    {
        $at = now()->subDays($role === MembershipRole::Student ? 30 : 100);
        $membership = new GroupMembership;
        $membership->forceFill([
            'learning_group_id' => $group->id,
            'user_id' => $user->id,
            'membership_role' => $role,
            'status' => MembershipStatus::Approved,
            'analytics_consent_status' => $consent ? AnalyticsConsentStatus::Granted : AnalyticsConsentStatus::None,
            'analytics_consent_at' => $consent ? $at : null,
            'analytics_consent_version' => $consent ? GroupMembership::ANALYTICS_CONSENT_VERSION : null,
            'analytics_consent_user_id' => $consent ? $user->id : null,
            'created_at' => $at,
            'updated_at' => $at,
        ])->save();
    }

    /**
     * @param  array{number: int, key: string, email: string, name: string, profile: string, ordinal: int, group: string}  $definition
     */
    private function seedActivity(User $user, array $definition): void
    {
        $range = $this->practiceRange($definition['number']);
        $moments = $this->sessionMoments($definition);
        $attemptPlan = $this->attemptPlan($definition, $moments);

        foreach ($moments as $index => $moment) {
            $this->session($user, $definition, $range, $moment, $index, false);
        }

        if ($definition['number'] === TeacherDemoCatalog::PAUSED) {
            $this->session($user, $definition, $range, now()->subHours(5), count($moments), true);
        }

        $scored = [];
        foreach ($attemptPlan as $index => $plan) {
            $scored[] = $this->attempt($user, $definition, $plan, $index + 1);
        }

        if ($definition['number'] === TeacherDemoCatalog::REPEATED) {
            $this->unassessedAttempt($user, $moments[0] ?? now()->subDays(12), count($attemptPlan) + 1);
        }

        $this->progress($user, $definition, $range);
        $this->weakSpots($user, $scored);
        $this->plan($user, $definition, $range, $moments[0] ?? now()->subDays(20));
    }

    /**
     * @param  array{number: int, profile: string, ordinal: int}  $definition
     * @return list<Carbon>
     */
    private function sessionMoments(array $definition): array
    {
        $count = $this->sessionTotal($definition);
        $moments = [];

        for ($i = 0; $i < $count; $i++) {
            $days = $this->dayOffset($definition, $i, $count);
            $moments[] = now()->subDays($days)->subMinutes(20 + ($i * 3));
        }

        usort($moments, fn (Carbon $left, Carbon $right) => $left->getTimestamp() <=> $right->getTimestamp());

        return $moments;
    }

    /**
     * @param  array{number: int, profile: string, ordinal: int}  $definition
     */
    private function dayOffset(array $definition, int $index, int $count): int
    {
        if ($definition['profile'] === 'inactive') {
            $latest = [10, 14, 18][$definition['ordinal']] ?? 14;

            return $latest + (int) round($index * (21 - $latest) / max(1, $count - 1));
        }

        if ($definition['profile'] === 'new') {
            return $definition['number'] === TeacherDemoCatalog::NEW_EMPTY ? 1 : ($index === 0 ? 2 : 0);
        }

        return (int) round($index * 89 / max(1, $count - 1));
    }

    /**
     * @param  array{number: int, profile: string, ordinal: int}  $definition
     * @param  list<Carbon>  $moments
     * @return list<array{at: Carbon, accuracy: int, range: array{surah: int, from: int, to: int}, mistakes: list<array<string, mixed>>}>
     */
    private function attemptPlan(array $definition, array $moments): array
    {
        $count = $this->attemptTotal($definition);
        if ($count === 0 || $moments === []) {
            return [];
        }

        $picked = $this->sampleMoments($moments, $count);
        $plan = [];
        $last = $count - 1;

        foreach ($picked as $index => $moment) {
            $accuracy = $this->accuracy($definition, $index);
            $range = $this->practiceRange($definition['number']);
            $mistakes = $this->mistakes($definition, $index, $range);

            if ($definition['number'] === TeacherDemoCatalog::INTERVENTION && $index === 0) {
                $accuracy = TeacherDemoCatalog::INTERVENTION_BEFORE;
                $range = TeacherDemoCatalog::STORY_RANGE;
                $mistakes = [$this->mistake($range, 2, 1, 'incorrect', 'الصمد')];
            }
            if ($definition['number'] === TeacherDemoCatalog::INTERVENTION && $index === $last) {
                $accuracy = TeacherDemoCatalog::INTERVENTION_AFTER;
                $range = TeacherDemoCatalog::STORY_RANGE;
                $mistakes = [];
            }

            $plan[] = [
                'at' => $moment->copy()->addSeconds($index + 1),
                'accuracy' => $accuracy,
                'range' => $range,
                'mistakes' => $mistakes,
            ];
        }

        return $plan;
    }

    /**
     * @param  list<Carbon>  $moments
     * @return list<Carbon>
     */
    private function sampleMoments(array $moments, int $count): array
    {
        $total = count($moments);
        if ($count >= $total) {
            return $moments;
        }

        $picked = [];
        for ($i = 0; $i < $count; $i++) {
            $index = (int) round($i * ($total - 1) / max(1, $count - 1));
            $picked[] = $moments[$index]->copy();
        }

        return $picked;
    }

    /**
     * @param  array{number: int, profile: string, ordinal: int}  $definition
     */
    private function accuracy(array $definition, int $index): int
    {
        if ($definition['profile'] === 'new') {
            return 72;
        }

        $band = TeacherDemoCatalog::ACTIVITY[$definition['profile']];
        $span = $band['max'] - $band['min'];

        return $band['min'] + (($definition['ordinal'] + ($index * 3)) % ($span + 1));
    }

    /**
     * @param  array{profile: string, ordinal: int}  $definition
     * @param  array{surah: int, from: int, to: int}  $range
     * @return list<array<string, mixed>>
     */
    private function mistakes(array $definition, int $index, array $range): array
    {
        $profile = $definition['profile'];
        $word = $this->mistake($range, min($range['to'], max($range['from'], 2)), 1, 'incorrect', 'الصمد');

        if ($profile === 'excellent') {
            return $index === 0 ? [$word] : [];
        }

        if ($profile === 'good') {
            $recurring = $definition['ordinal'] < 2 && $index < 2;
            $once = $definition['ordinal'] >= 2 && $index === 0;

            return ($recurring || $once) ? [$word] : [];
        }

        if ($profile === 'average') {
            $items = [];
            if ($index % 2 === 0) {
                $items[] = $word;
            }
            if ($index === 0) {
                $items[] = $this->mistake($range, $range['from'], 3, 'skipped', 'رب');
            }

            return $items;
        }

        if ($profile === 'struggling') {
            $items = [
                $word,
                $this->mistake($range, $range['from'], 2, 'skipped', 'قل'),
                $this->mistake($range, $range['from'], 4, 'extra', 'و'),
            ];
            if ($definition['ordinal'] === 0) {
                $items[] = $this->mistake($range, $word['ayah'], 5, 'repeated', 'الله');
            }
            if ($index >= 2) {
                $items[] = $this->mistake($range, min($range['to'], $range['from'] + 2), 1, 'incorrect', 'أحد');
            }

            return $items;
        }

        if ($profile === 'inactive') {
            return [$word];
        }

        return [];
    }

    /**
     * @param  array{surah: int, from: int, to: int}  $range
     * @return array<string, mixed>
     */
    private function mistake(array $range, int $ayah, int $wordIndex, string $status, string $text): array
    {
        return [
            'surah' => $range['surah'],
            'ayah' => $ayah,
            'word_index' => $wordIndex,
            'status' => $status,
            'text' => $text,
        ];
    }

    /**
     * @param  array{number: int, email: string}  $definition
     * @param  array{surah: int, from: int, to: int}  $range
     */
    private function session(User $user, array $definition, array $range, Carbon $at, int $index, bool $paused): void
    {
        $session = new UserSession;
        $session->forceFill([
            'user_id' => $user->id,
            'surah_number' => $range['surah'],
            'ayah_number' => $range['from'],
            'current_step' => 4,
            'memorisation_mode' => 'advanced',
            'status' => $paused ? UserSessionStatus::Paused : UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'repetitions_completed' => $paused ? 2 : 5,
            'session_duration_seconds' => 480 + (($definition['number'] + $index) % 8) * 60,
            'last_activity_at' => $at,
            'started_at' => $at->copy()->subMinutes(12),
            'paused_at' => $paused ? $at : null,
            'ended_at' => $paused ? null : $at,
            'attempt_number' => $index + 1,
            'start_idempotency_key' => 'teacher-demo:'.$definition['email'].':session:'.$index,
            'metadata' => [
                'range_start' => $range['from'],
                'range_end' => $range['to'],
                'config' => [
                    'rangeStart' => $range['from'],
                    'rangeEnd' => $range['to'],
                ],
            ],
            'created_at' => $at,
            'updated_at' => $at,
        ])->save();
        $this->sessionCount++;
    }

    /**
     * @param  array{email: string}  $definition
     * @param  array{at: Carbon, accuracy: int, range: array{surah: int, from: int, to: int}, mistakes: list<array<string, mixed>>}  $plan
     * @return array{at: Carbon, range: array{surah: int, from: int, to: int}, mistakes: list<array<string, mixed>>}
     */
    private function attempt(User $user, array $definition, array $plan, int $number): array
    {
        $wrong = 0;
        $skipped = 0;
        $extra = 0;
        $repeated = 0;
        $statuses = [];
        foreach ($plan['mistakes'] as $mistake) {
            $statuses[] = $mistake;
            match ($mistake['status']) {
                'incorrect' => $wrong++,
                'skipped' => $skipped++,
                'extra' => $extra++,
                'repeated' => $repeated++,
                default => null,
            };
        }
        $correct = max(0, (int) round($plan['accuracy'] / 10) - $wrong);
        for ($i = 0; $i < $correct; $i++) {
            $statuses[] = [
                'surah' => $plan['range']['surah'],
                'ayah' => $plan['range']['from'],
                'word_index' => 10 + $i,
                'status' => 'correct',
                'text' => 'word',
            ];
        }

        $attempt = new AiReciteAttempt;
        $attempt->forceFill([
            'user_id' => $user->id,
            'source' => AiReciteAttempt::SOURCE_DASHBOARD,
            'attempt_number' => $number,
            'accuracy_percent' => $plan['accuracy'],
            'band' => RecitationScoringThresholds::bandForAccuracy($plan['accuracy']),
            'peek_used' => false,
            'duration_ms' => 18000 + ($number * 250),
            'ayah_range' => [
                'surah' => $plan['range']['surah'],
                'from' => $plan['range']['from'],
                'to' => $plan['range']['to'],
                'surah_name' => QuranMetadata::name($plan['range']['surah']),
            ],
            'color_counts' => [
                'green' => $correct,
                'amber' => 0,
                'red' => $wrong,
                'black' => $skipped,
                'gray' => $extra,
            ],
            'weak_words' => array_values(array_filter(
                $plan['mistakes'],
                fn (array $mistake) => $mistake['status'] === 'incorrect'
            )),
            'word_statuses' => $statuses,
            'plan_snapshot' => null,
            'created_at' => $plan['at'],
            'updated_at' => $plan['at'],
        ])->save();
        $this->attemptCount++;

        return [
            'at' => $plan['at'],
            'range' => $plan['range'],
            'mistakes' => $plan['mistakes'],
        ];
    }

    private function unassessedAttempt(User $user, Carbon $at, int $number): void
    {
        $at = $at->copy()->addHours(2);
        $assessment = new MemorisationAssessment;
        $assessment->forceFill([
            'user_id' => $user->id,
            'surah_number' => TeacherDemoCatalog::STORY_RANGE['surah'],
            'start_ayah' => TeacherDemoCatalog::STORY_RANGE['from'],
            'end_ayah' => TeacherDemoCatalog::STORY_RANGE['to'],
            'assessment_type' => MemorisationAssessment::TYPE_DASHBOARD_AI_RECITE,
            'status' => MemorisationAssessment::STATUS_FAILED,
            'idempotency_key' => 'teacher-demo-unassessed-'.$user->id,
            'surah_name' => QuranMetadata::name(TeacherDemoCatalog::STORY_RANGE['surah']),
            'failure_reason' => 'audio_unusable',
            'friendly_summary' => 'This recitation could not be assessed.',
            'created_at' => $at,
            'updated_at' => $at,
        ])->save();

        $attempt = new AiReciteAttempt;
        $attempt->forceFill([
            'user_id' => $user->id,
            'memorisation_assessment_id' => $assessment->id,
            'source' => AiReciteAttempt::SOURCE_DASHBOARD,
            'attempt_number' => $number,
            'accuracy_percent' => null,
            'band' => null,
            'peek_used' => false,
            'duration_ms' => 4000,
            'ayah_range' => [
                'surah' => TeacherDemoCatalog::STORY_RANGE['surah'],
                'from' => TeacherDemoCatalog::STORY_RANGE['from'],
                'to' => TeacherDemoCatalog::STORY_RANGE['to'],
                'surah_name' => QuranMetadata::name(TeacherDemoCatalog::STORY_RANGE['surah']),
            ],
            'color_counts' => null,
            'weak_words' => null,
            'word_statuses' => null,
            'plan_snapshot' => ['demo' => 'unassessed', 'reason' => 'audio_unusable'],
            'created_at' => $at,
            'updated_at' => $at,
        ])->save();
        $this->attemptCount++;
    }

    /**
     * @param  array{profile: string}  $definition
     * @param  array{surah: int, from: int, to: int}  $range
     */
    private function progress(User $user, array $definition, array $range): void
    {
        for ($ayah = $range['from']; $ayah <= $range['to']; $ayah++) {
            $status = match ($definition['profile']) {
                'excellent', 'good' => 'memorised',
                'average' => $ayah === $range['from'] ? 'memorised' : 'learning',
                default => 'learning',
            };
            $row = new MemorisationProgress;
            $row->forceFill([
                'user_id' => $user->id,
                'surah_number' => $range['surah'],
                'ayah_number' => $ayah,
                'status' => $status,
                'mastery_level' => $status === 'memorised' ? 4 : 1,
                'repetitions' => $status === 'memorised' ? 12 : 2,
                'completed_at' => $status === 'memorised' ? now()->subDays(4) : null,
            ])->save();
        }
    }

    /**
     * @param  list<array{at: Carbon, range: array{surah: int, from: int, to: int}, mistakes: list<array<string, mixed>>}>  $attempts
     */
    private function weakSpots(User $user, array $attempts): void
    {
        $words = [];
        $ayahs = [];

        foreach ($attempts as $attempt) {
            $seenWords = [];
            $seenAyahs = [];
            foreach ($attempt['mistakes'] as $mistake) {
                if ($mistake['status'] !== 'incorrect') {
                    continue;
                }
                $wordKey = $mistake['surah'].':'.$mistake['ayah'].':'.$mistake['word_index'];
                $ayahKey = $mistake['surah'].':'.$mistake['ayah'];
                if (! isset($seenWords[$wordKey])) {
                    $words[$wordKey]['count'] = ($words[$wordKey]['count'] ?? 0) + 1;
                    $words[$wordKey]['mistake'] = $mistake;
                    $words[$wordKey]['first'] = $words[$wordKey]['first'] ?? $attempt['at'];
                    $words[$wordKey]['last'] = $attempt['at'];
                    $seenWords[$wordKey] = true;
                }
                if (! isset($seenAyahs[$ayahKey])) {
                    $ayahs[$ayahKey]['count'] = ($ayahs[$ayahKey]['count'] ?? 0) + 1;
                    $ayahs[$ayahKey]['surah'] = $mistake['surah'];
                    $ayahs[$ayahKey]['ayah'] = $mistake['ayah'];
                    $ayahs[$ayahKey]['first'] = $ayahs[$ayahKey]['first'] ?? $attempt['at'];
                    $ayahs[$ayahKey]['last'] = $attempt['at'];
                    $seenAyahs[$ayahKey] = true;
                }
            }
        }

        foreach ($words as $spot) {
            $this->storeSpot($user, MemorisationWeakSpot::TYPE_WORD, $spot['mistake']['surah'], $spot['mistake']['ayah'], $spot['mistake']['word_index'], $spot['count'], $spot['first'], $spot['last']);
        }

        foreach ($ayahs as $spot) {
            if ($spot['count'] < 2) {
                continue;
            }
            $this->storeSpot($user, MemorisationWeakSpot::TYPE_AYAH, $spot['surah'], $spot['ayah'], null, $spot['count'], $spot['first'], $spot['last']);
        }
    }

    private function storeSpot(User $user, string $type, int $surah, int $ayah, ?int $wordIndex, int $count, Carbon $first, Carbon $last): void
    {
        $spot = new MemorisationWeakSpot;
        $spot->forceFill([
            'user_id' => $user->id,
            'spot_type' => $type,
            'surah_number' => $surah,
            'ayah_number' => $ayah,
            'word_index' => $wordIndex,
            'verse_key' => $surah.':'.$ayah,
            'spot_key' => MemorisationWeakSpot::buildSpotKey($type, $surah, $ayah, $wordIndex),
            'severity' => $count >= 4 ? 'high' : ($count >= 2 ? 'moderate' : 'low'),
            'status' => MemorisationWeakSpot::STATUS_ACTIVE,
            'trend' => $count >= 4 ? 'regressing' : ($count === 1 ? 'improving' : 'stable'),
            'affected_attempt_count' => $count,
            'first_identified_at' => $first,
            'last_identified_at' => $last,
            'last_recalled_at' => $last,
        ])->save();
    }

    /**
     * @param  array{profile: string}  $definition
     * @param  array{surah: int, from: int, to: int}  $range
     */
    private function plan(User $user, array $definition, array $range, Carbon $identified): void
    {
        if ($definition['profile'] === 'new') {
            return;
        }

        $overdue = in_array($definition['profile'], ['average', 'struggling', 'inactive'], true);
        $reviewAt = $overdue ? now()->subDays(3) : now()->addDays(5);
        $assessment = new MemorisationAssessment;
        $assessment->forceFill([
            'user_id' => $user->id,
            'surah_number' => $range['surah'],
            'start_ayah' => $range['from'],
            'end_ayah' => $range['to'],
            'assessment_type' => 'memorisation_detection',
            'status' => MemorisationAssessment::STATUS_COMPLETED,
            'idempotency_key' => 'teacher-demo-plan-'.$user->id,
            'surah_name' => QuranMetadata::name($range['surah']),
            'overall_accuracy' => $overdue ? 62 : 90,
            'friendly_summary' => 'Demo revision plan for '.$this->rangeLabel($range).'.',
            'created_at' => $identified,
            'updated_at' => $identified,
        ])->save();

        $plan = new MemorisationPracticePlan;
        $plan->forceFill([
            'user_id' => $user->id,
            'assessment_id' => $assessment->id,
            'title' => 'Review '.$this->rangeLabel($range),
            'explanation' => $overdue
                ? 'This range was due for muraja\'ah and has not been reviewed.'
                : 'Scheduled muraja\'ah for a range this student already practises.',
            'status' => MemorisationPracticePlan::STATUS_ACTIVE,
            'practice_scope' => MemorisationPracticePlan::SCOPE_FULL_RANGE,
            'surah_number' => $range['surah'],
            'start_ayah' => $range['from'],
            'end_ayah' => $range['to'],
            'recommended_review_at' => $reviewAt,
            'accepted_at' => $identified,
            'created_at' => $identified,
            'updated_at' => $identified,
        ])->save();
    }

    private function seedAssignments(): void
    {
        foreach (TeacherDemoCatalog::students() as $definition) {
            $student = $this->students[$definition['number']];
            $teacher = $this->teacherForGroup($definition['group']);
            $profile = $definition['profile'];
            $practice = $this->practiceRange($definition['number']);

            if (in_array($profile, ['excellent', 'good', 'average'], true)) {
                $this->assignment($teacher, [$student], AssignmentKind::Practice, $practice, now()->subDays(25)->subMinutes(10), now()->addDays(3), null, null);
            }

            if ($definition['number'] === TeacherDemoCatalog::INTERVENTION) {
                $this->assignment(
                    $teacher,
                    [$student],
                    AssignmentKind::AiRecite,
                    TeacherDemoCatalog::STORY_RANGE,
                    now()->subDays(15),
                    now()->addDays(7),
                    null,
                    TeacherDemoCatalog::INTERVENTION_FEEDBACK,
                );
            }

            if (in_array($profile, ['average', 'struggling', 'inactive'], true)) {
                $this->assignment($teacher, [$student], AssignmentKind::Practice, TeacherDemoCatalog::OVERDUE_RANGE, now()->subDays(12), now()->subDay(), null, null);
            }

            if ($profile === 'struggling') {
                $this->assignment($teacher, [$student], AssignmentKind::Practice, TeacherDemoCatalog::PROGRESS_RANGE, now()->subDays(4), now()->addDays(6), now()->subDays(2), null);
            }

            if (in_array($profile, ['inactive', 'new'], true)) {
                $this->assignment($teacher, [$student], AssignmentKind::AiRecite, TeacherDemoCatalog::PENDING_RANGE, now()->subDays(2), now()->addDays(10), null, null);
            }
        }

        foreach (TeacherDemoCatalog::groups() as $definition) {
            $teacher = $this->teacherForGroup($definition['key']);
            $members = [];
            foreach (TeacherDemoCatalog::students() as $student) {
                if ($student['group'] === $definition['key']) {
                    $members[] = $this->students[$student['number']];
                }
            }
            $this->assignment(
                $teacher,
                $members,
                AssignmentKind::Practice,
                ['surah' => 1, 'from' => 1, 'to' => 7],
                now()->subDays(20),
                now()->addDays(14),
                null,
                null,
                $this->groups[$definition['key']],
            );
        }
    }

    /**
     * @param  list<User>  $students
     * @param  array{surah: int, from: int, to: int}  $range
     */
    private function assignment(User $teacher, array $students, AssignmentKind $kind, array $range, Carbon $createdAt, Carbon $dueAt, ?Carbon $startedAt, ?string $feedback, ?LearningGroup $group = null): void
    {
        $assignment = new TeacherAssignment;
        $assignment->forceFill([
            'teacher_id' => $teacher->id,
            'organisation_id' => $teacher->organisation_id,
            'learning_group_id' => $group?->id,
            'kind' => $kind,
            'surah_number' => $range['surah'],
            'ayah_start' => $range['from'],
            'ayah_end' => $range['to'],
            'repetition_target' => 1,
            'due_at' => $dueAt,
            'feedback' => $feedback,
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ])->save();

        foreach ($students as $student) {
            $recipient = new TeacherAssignmentRecipient;
            $recipient->forceFill([
                'teacher_assignment_id' => $assignment->id,
                'student_id' => $student->id,
                'status' => AssignmentStatus::Pending,
                'started_at' => $startedAt,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ])->save();
        }

        $this->assignmentCount++;
    }

    private function seedNotes(): void
    {
        $intervention = $this->students[TeacherDemoCatalog::INTERVENTION];
        $repeated = $this->students[TeacherDemoCatalog::REPEATED];
        $this->note($this->teacherForStudent(TeacherDemoCatalog::INTERVENTION), $intervention, TeacherNoteKind::Feedback, TeacherDemoCatalog::INTERVENTION_FEEDBACK);
        $this->note($this->teacherForStudent(TeacherDemoCatalog::REPEATED), $repeated, TeacherNoteKind::Note, TeacherDemoCatalog::PRIVATE_NOTE);

        foreach (TeacherDemoCatalog::teachers() as $definition) {
            $teacher = $this->teachers[$definition['key']];
            $seen = 0;
            foreach (TeacherDemoCatalog::students() as $student) {
                if (! in_array($student['group'], $definition['groups'], true) || $seen >= 1) {
                    continue;
                }
                if (in_array($student['number'], [TeacherDemoCatalog::INTERVENTION, TeacherDemoCatalog::REPEATED], true)) {
                    continue;
                }
                $this->note($teacher, $this->students[$student['number']], TeacherNoteKind::Feedback, 'Demo feedback: keep the same ayah range and repeat it once more this week.');
                $seen++;
            }
        }
    }

    private function note(User $teacher, User $student, TeacherNoteKind $kind, string $body): void
    {
        $note = new TeacherNote;
        $note->forceFill([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'organisation_id' => $teacher->organisation_id,
            'kind' => $kind,
            'body' => $body,
        ])->save();
    }

    private function refreshAssignmentStatuses(): void
    {
        $assignments = app(TeacherAssignmentService::class);
        $access = app(StudentAccessAuthorizer::class);
        foreach ($this->teachers as $teacher) {
            $assignments->refreshStatuses($teacher, $access->authorizedStudentIds($teacher)->all());
        }
    }

    private function assertVolumes(): void
    {
        if ($this->sessionCount < 300 || $this->sessionCount > 500) {
            throw new RuntimeException("Teacher demo seeded {$this->sessionCount} sessions; expected 300–500.");
        }
        if ($this->attemptCount < 150 || $this->attemptCount > 250) {
            throw new RuntimeException("Teacher demo seeded {$this->attemptCount} AI attempts; expected 150–250.");
        }
        if ($this->assignmentCount < 40 || $this->assignmentCount > 60) {
            throw new RuntimeException("Teacher demo seeded {$this->assignmentCount} assignments; expected 40–60.");
        }
    }

    /**
     * @return array{surah: int, from: int, to: int}
     */
    private function practiceRange(int $number): array
    {
        return TeacherDemoCatalog::PRACTICE_RANGES[($number - 1) % count(TeacherDemoCatalog::PRACTICE_RANGES)];
    }

    /**
     * @param  array{number: int, profile: string}  $definition
     */
    private function sessionTotal(array $definition): int
    {
        if ($definition['number'] === TeacherDemoCatalog::NEW_EMPTY) {
            return 1;
        }
        if ($definition['number'] === TeacherDemoCatalog::NEW_MINIMAL) {
            return 2;
        }

        return TeacherDemoCatalog::ACTIVITY[$definition['profile']]['sessions'];
    }

    /**
     * @param  array{number: int, profile: string}  $definition
     */
    private function attemptTotal(array $definition): int
    {
        if ($definition['number'] === TeacherDemoCatalog::NEW_EMPTY) {
            return 0;
        }
        if ($definition['number'] === TeacherDemoCatalog::NEW_MINIMAL) {
            return 1;
        }

        return TeacherDemoCatalog::ACTIVITY[$definition['profile']]['attempts'];
    }

    private function teacherForGroup(string $groupKey): User
    {
        foreach (TeacherDemoCatalog::teachers() as $definition) {
            if (in_array($groupKey, $definition['groups'], true)) {
                return $this->teachers[$definition['key']];
            }
        }

        throw new RuntimeException("No demo teacher owns group [{$groupKey}].");
    }

    private function teacherForStudent(int $number): User
    {
        foreach (TeacherDemoCatalog::students() as $definition) {
            if ($definition['number'] === $number) {
                return $this->teacherForGroup($definition['group']);
            }
        }

        throw new RuntimeException("No demo student [{$number}].");
    }

    private function groupOrganisationKey(string $groupKey): string
    {
        foreach (TeacherDemoCatalog::groups() as $definition) {
            if ($definition['key'] === $groupKey) {
                return $definition['org'];
            }
        }

        throw new RuntimeException("Unknown demo group [{$groupKey}].");
    }

    /**
     * @param  array{surah: int, from: int, to: int}  $range
     */
    private function rangeLabel(array $range): string
    {
        return QuranMetadata::name($range['surah']).' '.$range['from'].'–'.$range['to'];
    }

    private function report(): void
    {
        $command = $this->command;
        if ($command === null) {
            return;
        }

        $emails = TeacherDemoCatalog::emails();
        $ids = User::query()->whereIn('email', $emails)->pluck('id');
        $command->newLine();
        $command->info('Teacher demo data is ready. Password for every account: '.TeacherDemoCatalog::PASSWORD);
        $command->line('Development only. These accounts are not created in production.');
        $command->newLine();
        $command->table(
            ['Role', 'Name', 'Email', 'Sees'],
            $this->credentialRows()
        );
        $command->newLine();
        $command->table(['Record', 'Count'], [
            ['Organisations', Organisation::query()->whereIn('name', array_column(TeacherDemoCatalog::organisations(), 'name'))->count()],
            ['Teachers', count(TeacherDemoCatalog::teachers())],
            ['Students', count(TeacherDemoCatalog::students())],
            ['Groups', LearningGroup::query()->whereIn('organisation_id', Organisation::query()->whereIn('name', array_column(TeacherDemoCatalog::organisations(), 'name'))->pluck('id'))->count()],
            ['Practice sessions', UserSession::query()->whereIn('user_id', $ids)->count()],
            ['AI attempts', AiReciteAttempt::query()->whereIn('user_id', $ids)->count()],
            ['Assignments', TeacherAssignment::query()->whereIn('teacher_id', User::query()->whereIn('email', array_column(TeacherDemoCatalog::teachers(), 'email'))->pluck('id'))->count()],
            ['Teacher notes', TeacherNote::query()->whereIn('teacher_id', User::query()->whereIn('email', array_column(TeacherDemoCatalog::teachers(), 'email'))->pluck('id'))->count()],
        ]);
        $command->newLine();
        $command->line('Stories: high performer student 01, intervention student 06, paused session student 13, repeated mistake student 21, inactive students 26–28, new students 29 (no AI) and 30 (one attempt).');
        $command->line('Reset only these accounts with: php artisan mutqin:reset-teacher-demo');
    }

    /**
     * @return list<list<string>>
     */
    private function credentialRows(): array
    {
        $rows = [];
        $access = app(StudentAccessAuthorizer::class);
        foreach (TeacherDemoCatalog::teachers() as $definition) {
            $teacher = User::query()->where('email', $definition['email'])->first();
            $groups = implode(', ', array_map(
                fn (string $key) => collect(TeacherDemoCatalog::groups())->firstWhere('key', $key)['name'] ?? $key,
                $definition['groups']
            ));
            $count = $teacher ? $access->authorizedStudentIds($teacher)->count() : 0;
            $rows[] = ['Teacher', $definition['name'], $definition['email'], $groups.' ('.$count.' students)'];
        }
        $rows[] = ['Students', '30 students', 'teacher.demo.student.01@example.com to 30', 'Own group only'];

        return $rows;
    }
}
