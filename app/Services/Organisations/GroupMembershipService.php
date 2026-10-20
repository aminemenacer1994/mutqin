<?php

namespace App\Services\Organisations;

use App\Enums\AnalyticsConsentStatus;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\GroupMembership;
use App\Models\LearningGroup;
use App\Models\User;
use App\Support\TeacherFeatures;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

/**
 * Membership decisions are made by the member. A teacher cannot approve
 * another person or record analytics consent on their behalf.
 */
class GroupMembershipService
{
    public function accept(User $actor, GroupMembership $membership): GroupMembership
    {
        TeacherFeatures::abortUnlessEnabled();
        Gate::forUser($actor)->authorize('accept', $membership);

        $membership->forceFill([
            'status' => MembershipStatus::Approved->value,
            'decided_by' => $actor->id,
            'decided_at' => now(),
        ])->save();

        return $membership->refresh();
    }

    public function reject(User $actor, GroupMembership $membership): GroupMembership
    {
        TeacherFeatures::abortUnlessEnabled();
        Gate::forUser($actor)->authorize('reject', $membership);

        $membership->forceFill([
            'status' => MembershipStatus::Rejected->value,
            'decided_by' => $actor->id,
            'decided_at' => now(),
            'analytics_consent_status' => AnalyticsConsentStatus::None->value,
            'analytics_consent_at' => null,
            'analytics_consent_version' => null,
            'analytics_consent_user_id' => null,
        ])->save();

        return $membership->refresh();
    }

    public function grantAnalyticsConsent(User $actor, GroupMembership $membership): GroupMembership
    {
        TeacherFeatures::abortUnlessEnabled();
        Gate::forUser($actor)->authorize('grantAnalyticsConsent', $membership);

        $membership->forceFill([
            'analytics_consent_status' => AnalyticsConsentStatus::Granted->value,
            'analytics_consent_at' => now(),
            'analytics_consent_version' => GroupMembership::ANALYTICS_CONSENT_VERSION,
            'analytics_consent_user_id' => $actor->id,
        ])->save();

        return $membership->refresh();
    }

    public function revokeAnalyticsConsent(User $actor, GroupMembership $membership): GroupMembership
    {
        TeacherFeatures::abortUnlessEnabled();
        Gate::forUser($actor)->authorize('revokeAnalyticsConsent', $membership);

        $membership->forceFill([
            'analytics_consent_status' => AnalyticsConsentStatus::Revoked->value,
            'analytics_consent_at' => now(),
            'analytics_consent_version' => null,
            'analytics_consent_user_id' => $actor->id,
        ])->save();

        return $membership->refresh();
    }

    public function requestJoin(User $student, LearningGroup $group): GroupMembership
    {
        TeacherFeatures::abortUnlessEnabled();
        Gate::forUser($student)->authorize('requestJoin', $group);

        return DB::transaction(function () use ($student, $group) {
            $existing = GroupMembership::query()
                ->where('learning_group_id', $group->id)
                ->where('user_id', $student->id)
                ->lockForUpdate()
                ->first();

            if ($existing && $existing->membership_role !== MembershipRole::Student) {
                throw ValidationException::withMessages([
                    'group' => 'This group membership cannot be requested.',
                ]);
            }

            if ($existing && $existing->status === MembershipStatus::Approved) {
                throw ValidationException::withMessages([
                    'group' => 'You already belong to this group.',
                ]);
            }

            if ($existing) {
                $existing->forceFill([
                    'membership_role' => MembershipRole::Student->value,
                    'status' => MembershipStatus::Pending->value,
                    'decided_by' => null,
                    'decided_at' => null,
                    'analytics_consent_status' => AnalyticsConsentStatus::None->value,
                    'analytics_consent_at' => null,
                    'analytics_consent_version' => null,
                    'analytics_consent_user_id' => null,
                ])->save();

                return $existing->refresh();
            }

            $membership = new GroupMembership;
            $membership->forceFill([
                'learning_group_id' => $group->id,
                'user_id' => $student->id,
                'membership_role' => MembershipRole::Student->value,
                'status' => MembershipStatus::Pending->value,
                'analytics_consent_status' => AnalyticsConsentStatus::None->value,
            ])->save();

            return $membership->refresh();
        });
    }

    public function joinAsTeacher(User $teacher, LearningGroup $group): GroupMembership
    {
        TeacherFeatures::abortUnlessEnabled();
        Gate::forUser($teacher)->authorize('teach', $group);

        return DB::transaction(function () use ($teacher, $group) {
            $existing = GroupMembership::query()
                ->where('learning_group_id', $group->id)
                ->where('user_id', $teacher->id)
                ->lockForUpdate()
                ->first();

            if ($existing && $existing->membership_role !== MembershipRole::Teacher) {
                throw ValidationException::withMessages([
                    'group' => 'A student membership cannot be converted into a teacher membership.',
                ]);
            }

            if ($existing && $existing->status === MembershipStatus::Approved) {
                return $existing;
            }

            if ($existing) {
                $existing->forceFill([
                    'membership_role' => MembershipRole::Teacher->value,
                    'status' => MembershipStatus::Approved->value,
                    'decided_by' => $teacher->id,
                    'decided_at' => now(),
                ])->save();

                return $existing->refresh();
            }

            $membership = new GroupMembership;
            $membership->forceFill([
                'learning_group_id' => $group->id,
                'user_id' => $teacher->id,
                'membership_role' => MembershipRole::Teacher->value,
                'status' => MembershipStatus::Approved->value,
                'decided_by' => $teacher->id,
                'decided_at' => now(),
                'analytics_consent_status' => AnalyticsConsentStatus::None->value,
            ])->save();

            return $membership->refresh();
        });
    }

    public function teacherApprove(User $teacher, GroupMembership $membership): GroupMembership
    {
        TeacherFeatures::abortUnlessEnabled();
        Gate::forUser($teacher)->authorize('review', $membership);

        if ($membership->status !== MembershipStatus::Pending) {
            throw ValidationException::withMessages([
                'membership' => 'Only a pending request can be approved.',
            ]);
        }

        $consented = $membership->analytics_consent_status === AnalyticsConsentStatus::Granted
            && $membership->analytics_consent_version === GroupMembership::ANALYTICS_CONSENT_VERSION
            && (int) $membership->analytics_consent_user_id === (int) $membership->user_id;

        if (! $consented) {
            throw ValidationException::withMessages([
                'membership' => 'The student has not allowed practice sharing.',
            ]);
        }

        $membership->forceFill([
            'status' => MembershipStatus::Approved->value,
            'decided_by' => $teacher->id,
            'decided_at' => now(),
        ])->save();

        return $membership->refresh();
    }

    public function teacherReject(User $teacher, GroupMembership $membership): GroupMembership
    {
        TeacherFeatures::abortUnlessEnabled();
        Gate::forUser($teacher)->authorize('review', $membership);

        if ($membership->status !== MembershipStatus::Pending) {
            throw ValidationException::withMessages([
                'membership' => 'Only a pending request can be rejected.',
            ]);
        }

        $this->closeMembership($membership, $teacher);

        return $membership->refresh();
    }

    public function teacherRemove(User $teacher, GroupMembership $membership): GroupMembership
    {
        TeacherFeatures::abortUnlessEnabled();
        Gate::forUser($teacher)->authorize('review', $membership);

        if ($membership->status !== MembershipStatus::Approved) {
            throw ValidationException::withMessages([
                'membership' => 'Only an approved student can be removed.',
            ]);
        }

        $this->closeMembership($membership, $teacher);

        return $membership->refresh();
    }

    private function closeMembership(GroupMembership $membership, User $teacher): void
    {
        $membership->forceFill([
            'status' => MembershipStatus::Rejected->value,
            'decided_by' => $teacher->id,
            'decided_at' => now(),
            'analytics_consent_status' => AnalyticsConsentStatus::None->value,
            'analytics_consent_at' => null,
            'analytics_consent_version' => null,
            'analytics_consent_user_id' => null,
        ])->save();
    }
}
