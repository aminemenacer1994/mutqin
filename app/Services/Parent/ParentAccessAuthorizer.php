<?php

namespace App\Services\Parent;

use App\Enums\AccountRole;
use App\Enums\ParentLinkStatus;
use App\Models\ParentStudentLink;
use App\Models\User;
use App\Support\ParentFeatures;
use Illuminate\Support\Collection;

/**
 * Parent access is relationship-based: an approved parent–student link with the right permission.
 * Organisation membership and teacher groups are not used here.
 */
class ParentAccessAuthorizer
{
    public function allows(User $parent, User $student, ?string $permission = null): bool
    {
        if (! ParentFeatures::enabled()) {
            return false;
        }

        if ($parent->trashed() || $student->trashed()) {
            return false;
        }

        if ((int) $parent->id === (int) $student->id) {
            return false;
        }

        if (! $parent->isParent()) {
            return false;
        }

        if (! $this->isConfiguredAnchor($student) && ! $student->isStudent()) {
            return false;
        }

        $link = ParentStudentLink::query()
            ->where('parent_user_id', $parent->id)
            ->where('student_user_id', $student->id)
            ->where('status', ParentLinkStatus::Approved->value)
            ->first();

        if ($link === null) {
            return false;
        }

        if ($permission !== null && ! $link->allowsPermission($permission)) {
            return false;
        }

        return true;
    }

    /**
     * @return Collection<int, int>
     */
    public function authorizedStudentIds(User $parent): Collection
    {
        if (! ParentFeatures::enabled() || ! $parent->isParent()) {
            return collect();
        }

        return ParentStudentLink::query()
            ->where('parent_user_id', $parent->id)
            ->where('status', ParentLinkStatus::Approved->value)
            ->whereHas('student', function ($query) {
                $query->where(function ($inner) {
                    $inner->where('account_role', AccountRole::Student->value)
                        ->orWhereHas('accountRoles', function ($roles) {
                            $roles->where('role', AccountRole::Student->value);
                        });
                    $anchors = $this->configuredAnchorEmails();
                    if ($anchors !== []) {
                        $inner->orWhere(function ($emailQuery) use ($anchors) {
                            foreach ($anchors as $email) {
                                $emailQuery->orWhereRaw('LOWER(email) = ?', [$email]);
                            }
                        });
                    }
                });
            })
            ->pluck('student_user_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();
    }

    private function isConfiguredAnchor(User $student): bool
    {
        $email = strtolower(trim((string) $student->email));

        return $email !== '' && in_array($email, $this->configuredAnchorEmails(), true);
    }

    /**
     * @return list<string>
     */
    private function configuredAnchorEmails(): array
    {
        $configured = config('mutqin.teacher_anchor_student_emails', []);
        if (! is_array($configured)) {
            return [];
        }

        return array_values(array_filter(array_map(
            static fn (mixed $email): string => strtolower(trim((string) $email)),
            $configured,
        )));
    }
}
