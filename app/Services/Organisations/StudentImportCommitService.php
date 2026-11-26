<?php

namespace App\Services\Organisations;

use App\Enums\AccountRole;
use App\Enums\AnalyticsConsentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\StudentImportBatchStatus;
use App\Enums\StudentImportRowStatus;
use App\Models\GroupMembership;
use App\Models\OrganisationMembership;
use App\Models\StudentImportBatch;
use App\Models\StudentImportRow;
use App\Models\User;
use App\Support\TeacherFeatures;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Writes reviewed import rows into live teaching records (never during analysis).
 */
class StudentImportCommitService
{
    public function commit(User $teacher, StudentImportBatch $batch): StudentImportBatch
    {
        TeacherFeatures::abortUnlessEnabled();
        Gate::forUser($teacher)->authorize('manage', $batch);
        Gate::forUser($teacher)->authorize('manage', $batch->learningGroup);

        if (! in_array($batch->status, [StudentImportBatchStatus::Ready, StudentImportBatchStatus::ReviewRequired], true)) {
            throw ValidationException::withMessages([
                'batch' => 'This import batch is not ready to commit.',
            ]);
        }

        $batch->forceFill([
            'status' => StudentImportBatchStatus::Importing,
            'importing_started_at' => now(),
            'progress_percent' => 0,
        ])->save();

        $group = $batch->learningGroup;
        $organisationId = (int) $batch->organisation_id;
        $imported = 0;
        $failed = 0;

        $rows = StudentImportRow::query()
            ->where('student_import_batch_id', $batch->id)
            ->where('status', StudentImportRowStatus::Valid)
            ->orderBy('id')
            ->get();

        $total = max(1, $rows->count());
        foreach ($rows as $index => $row) {
            try {
                DB::transaction(function () use ($row, $group, $organisationId, $teacher, &$imported): void {
                    $email = strtolower(trim((string) ($row->normalized['email'] ?? '')));
                    $name = trim((string) ($row->normalized['name'] ?? ''));
                    if ($email === '') {
                        throw new \RuntimeException('Missing email.');
                    }

                    $user = User::query()->whereRaw('LOWER(email) = ?', [$email])->first();
                    if ($user === null) {
                        $user = new User;
                        $user->forceFill([
                            'name' => $name !== '' ? $name : $email,
                            'email' => $email,
                            'password' => Hash::make(Str::password(32)),
                            'account_role' => AccountRole::Student->value,
                            'organisation_id' => $organisationId,
                        ])->save();
                    } elseif ($user->organisation_id === null) {
                        $user->forceFill(['organisation_id' => $organisationId])->save();
                    } elseif ((int) $user->organisation_id !== $organisationId) {
                        throw new \RuntimeException('Student email belongs to another institution.');
                    }

                    if ($name !== '') {
                        $currentName = trim((string) $user->name);
                        if ($currentName === '' || strcasecmp($currentName, $name) !== 0) {
                            $user->forceFill(['name' => $name])->save();
                        }
                    }

                    $this->ensureOrganisationMembership($user, $organisationId, $teacher);
                    $this->ensureEnrolledGroupMembership($user, $group, $teacher);

                    $row->forceFill([
                        'status' => StudentImportRowStatus::Imported,
                        'matched_user_id' => $user->id,
                    ])->save();
                    $imported++;
                });
            } catch (\Throwable $e) {
                report($e);
                $row->forceFill([
                    'status' => StudentImportRowStatus::Failed,
                    'errors' => array_merge($row->errors ?? [], [$e->getMessage()]),
                ])->save();
                $failed++;
            }

            $batch->forceFill([
                'progress_percent' => (int) min(99, round((($index + 1) / $total) * 100)),
            ])->save();
        }

        $batch->forceFill([
            'status' => StudentImportBatchStatus::Completed,
            'rows_imported' => $imported,
            'completed_at' => now(),
            'progress_percent' => 100,
            'error_summary' => $failed > 0 ? "{$failed} row(s) failed during import." : null,
        ])->save();

        return $batch->refresh();
    }

    private function ensureOrganisationMembership(User $user, int $organisationId, User $teacher): void
    {
        $membership = OrganisationMembership::query()
            ->where('user_id', $user->id)
            ->where('organisation_id', $organisationId)
            ->first();

        if ($membership !== null && $membership->status === MembershipStatus::Approved) {
            return;
        }

        OrganisationMembership::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'organisation_id' => $organisationId,
            ],
            [
                'membership_role' => MembershipRole::Student->value,
                'status' => MembershipStatus::Approved->value,
                'decided_by' => $teacher->id,
                'decided_at' => now(),
            ],
        );
    }

    private function ensureEnrolledGroupMembership(User $user, \App\Models\LearningGroup $group, User $teacher): void
    {
        $existing = GroupMembership::query()
            ->where('learning_group_id', $group->id)
            ->where('user_id', $user->id)
            ->first();

        if ($existing !== null
            && $existing->status === MembershipStatus::Approved
            && $existing->analytics_consent_status === AnalyticsConsentStatus::Granted) {
            return;
        }

        $at = now();
        $membership = $existing ?? new GroupMembership;
        $membership->forceFill([
            'learning_group_id' => $group->id,
            'user_id' => $user->id,
            'membership_role' => MembershipRole::Student->value,
            'status' => MembershipStatus::Approved->value,
            'decided_by' => $teacher->id,
            'decided_at' => $at,
            'analytics_consent_status' => AnalyticsConsentStatus::Granted->value,
            'analytics_consent_at' => $at,
            'analytics_consent_version' => GroupMembership::ANALYTICS_CONSENT_VERSION,
            'analytics_consent_user_id' => $user->id,
        ])->save();
    }
}