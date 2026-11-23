<?php

namespace App\Services\Auth;

use App\Enums\AccountRole;
use App\Models\User;
use App\Models\UserAccountRole;

/**
 * Supplemental account roles (e.g. Parent on top of Teacher) without changing the primary account_role.
 */
class UserRoleService
{
    public function grant(User $user, AccountRole $role, ?User $grantedBy = null): UserAccountRole
    {
        $record = UserAccountRole::query()->firstOrCreate(
            [
                'user_id' => $user->id,
                'role' => $role->value,
            ],
            [
                'granted_by_user_id' => $grantedBy?->id,
                'granted_at' => now(),
            ],
        );

        if ($record->wasRecentlyCreated === false && $grantedBy !== null) {
            $record->forceFill([
                'granted_by_user_id' => $grantedBy->id,
                'granted_at' => $record->granted_at ?? now(),
            ])->save();
        }

        if ($user->account_role === null && $role !== AccountRole::Parent) {
            // Primary role column stays unset for supplemental-only grants.
        } elseif ($user->account_role === null && $role === AccountRole::Parent) {
            $user->forceFill(['account_role' => AccountRole::Parent->value])->save();
        }

        return $record->refresh();
    }

    public function revoke(User $user, AccountRole $role): void
    {
        UserAccountRole::query()
            ->where('user_id', $user->id)
            ->where('role', $role->value)
            ->delete();

        if ($user->account_role === $role) {
            $nextPrimary = UserAccountRole::query()
                ->where('user_id', $user->id)
                ->orderByDesc('granted_at')
                ->value('role');

            $user->forceFill([
                'account_role' => $nextPrimary ?? AccountRole::Individual->value,
            ])->save();
        }
    }

    public function syncPrimaryRoleGrant(User $user, AccountRole $role, ?User $grantedBy = null): void
    {
        if ($role->isSupplementalCapable() && $user->account_role !== null && $user->account_role !== $role) {
            $this->grant($user, $role, $grantedBy);

            return;
        }

        $this->grant($user, $role, $grantedBy);
    }
}
