<?php

namespace App\Services\Learning;

use App\Enums\OrganisationType;
use App\Models\User;
use App\Services\Organisations\StudentAccessAuthorizer;

/**
 * Direct student–teacher chat follows the existing relationship check,
 * then the class safeguarding rule. School classes keep feedback and
 * assignment threads, and do not open a free direct conversation.
 */
final class StudentMessagingPolicy
{
    public function __construct(private readonly StudentAccessAuthorizer $access) {}

    /**
     * @return array{allowed: bool, reason: ?string}
     */
    public function decision(User $student, User $teacher): array
    {
        if (! $this->access->allows($teacher, $student)) {
            return ['allowed' => false, 'reason' => 'relationship'];
        }

        $teacher->loadMissing('organisation');
        $type = $teacher->organisation?->type;
        $value = $type instanceof OrganisationType ? $type->value : (string) $type;
        if ($value === OrganisationType::School->value) {
            return ['allowed' => false, 'reason' => 'age_safeguarding'];
        }

        return ['allowed' => true, 'reason' => null];
    }

    public function assertStudentMayMessage(User $student, User $teacher): void
    {
        $decision = $this->decision($student, $teacher);
        if ($decision['allowed']) {
            return;
        }

        abort($decision['reason'] === 'relationship' ? 404 : 403);
    }
}
