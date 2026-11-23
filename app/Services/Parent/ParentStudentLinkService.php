<?php

namespace App\Services\Parent;

use App\Enums\AccountRole;
use App\Enums\ParentGuardianPermission;
use App\Enums\ParentLinkStatus;
use App\Models\ParentStudentLink;
use App\Models\ParentStudentLinkEvent;
use App\Models\User;
use App\Services\Auth\UserRoleService;
use App\Support\ParentFeatures;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ParentStudentLinkService
{
    public function __construct(
        private readonly UserRoleService $roles,
    ) {}

    /**
     * @param  list<string>|null  $permissions
     */
    public function request(
        User $parent,
        User $student,
        ?User $requestedBy = null,
        ?string $relationship = null,
        ?array $permissions = null,
        ?Request $request = null,
    ): ParentStudentLink {
        ParentFeatures::abortUnlessEnabled();

        if ((int) $parent->id === (int) $student->id) {
            throw ValidationException::withMessages([
                'student' => __('parent.link_self_invalid'),
            ]);
        }

        $this->roles->grant($parent, AccountRole::Parent, $requestedBy);

        return DB::transaction(function () use ($parent, $student, $requestedBy, $relationship, $permissions, $request) {
            $link = ParentStudentLink::query()->firstOrCreate(
                [
                    'parent_user_id' => $parent->id,
                    'student_user_id' => $student->id,
                ],
                [
                    'status' => ParentLinkStatus::Pending,
                    'relationship' => $relationship,
                    'permissions' => $permissions ?? ParentGuardianPermission::defaultGranted(),
                    'requested_by_user_id' => $requestedBy?->id ?? $parent->id,
                ],
            );

            if (! $link->wasRecentlyCreated && in_array($link->status, [ParentLinkStatus::Revoked, ParentLinkStatus::Rejected], true)) {
                $link->forceFill([
                    'status' => ParentLinkStatus::Pending,
                    'relationship' => $relationship ?? $link->relationship,
                    'revoked_at' => null,
                    'revoked_by_user_id' => null,
                    'revoked_reason' => null,
                    'decided_at' => null,
                    'decided_by_user_id' => null,
                    'approved_at' => null,
                ])->save();
            }

            $this->recordEvent($link, 'requested', $requestedBy ?? $parent, $request, [
                'relationship' => $relationship,
            ]);

            return $link->refresh();
        });
    }

    /**
     * @param  list<string>|null  $permissions
     */
    public function approve(
        ParentStudentLink $link,
        User $decidedBy,
        ?array $permissions = null,
        ?Request $request = null,
    ): ParentStudentLink {
        ParentFeatures::abortUnlessEnabled();

        return DB::transaction(function () use ($link, $decidedBy, $permissions, $request) {
            $locked = ParentStudentLink::query()->whereKey($link->id)->lockForUpdate()->firstOrFail();

            $locked->forceFill([
                'status' => ParentLinkStatus::Approved,
                'permissions' => $permissions ?? $locked->permissions ?? ParentGuardianPermission::defaultGranted(),
                'decided_by_user_id' => $decidedBy->id,
                'decided_at' => now(),
                'approved_at' => now(),
            ])->save();

            $this->recordEvent($locked, 'approved', $decidedBy, $request, [
                'permissions' => $locked->effectivePermissions(),
            ]);

            return $locked->refresh();
        });
    }

    public function reject(ParentStudentLink $link, User $decidedBy, ?Request $request = null): ParentStudentLink
    {
        ParentFeatures::abortUnlessEnabled();

        return DB::transaction(function () use ($link, $decidedBy, $request) {
            $locked = ParentStudentLink::query()->whereKey($link->id)->lockForUpdate()->firstOrFail();

            $locked->forceFill([
                'status' => ParentLinkStatus::Rejected,
                'decided_by_user_id' => $decidedBy->id,
                'decided_at' => now(),
            ])->save();

            $this->recordEvent($locked, 'rejected', $decidedBy, $request);

            return $locked->refresh();
        });
    }

    public function revoke(
        ParentStudentLink $link,
        User $revokedBy,
        ?string $reason = null,
        ?Request $request = null,
    ): ParentStudentLink {
        ParentFeatures::abortUnlessEnabled();

        return DB::transaction(function () use ($link, $revokedBy, $reason, $request) {
            $locked = ParentStudentLink::query()->whereKey($link->id)->lockForUpdate()->firstOrFail();

            $locked->forceFill([
                'status' => ParentLinkStatus::Revoked,
                'revoked_by_user_id' => $revokedBy->id,
                'revoked_at' => now(),
                'revoked_reason' => $reason,
            ])->save();

            $this->recordEvent($locked, 'revoked', $revokedBy, $request, [
                'reason' => $reason,
            ]);

            return $locked->refresh();
        });
    }

    /**
     * @param  list<string>  $permissions
     */
    public function updatePermissions(
        ParentStudentLink $link,
        array $permissions,
        User $actor,
        ?Request $request = null,
    ): ParentStudentLink {
        ParentFeatures::abortUnlessEnabled();

        $valid = array_values(array_intersect($permissions, ParentGuardianPermission::values()));

        return DB::transaction(function () use ($link, $valid, $actor, $request) {
            $locked = ParentStudentLink::query()->whereKey($link->id)->lockForUpdate()->firstOrFail();

            $locked->forceFill(['permissions' => $valid])->save();

            $this->recordEvent($locked, 'permissions_updated', $actor, $request, [
                'permissions' => $valid,
            ]);

            return $locked->refresh();
        });
    }

    private function recordEvent(
        ParentStudentLink $link,
        string $event,
        ?User $actor,
        ?Request $request,
        array $metadata = [],
    ): void {
        ParentStudentLinkEvent::query()->create([
            'parent_student_link_id' => $link->id,
            'actor_user_id' => $actor?->id,
            'event' => $event,
            'metadata' => $metadata === [] ? null : $metadata,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'created_at' => now(),
        ]);
    }
}
