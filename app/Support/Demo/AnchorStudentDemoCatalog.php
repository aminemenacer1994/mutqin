<?php

namespace App\Support\Demo;

use App\Models\User;

/**
 * Synthetic student definitions for configured teacher-anchor mailboxes.
 */
final class AnchorStudentDemoCatalog
{
    /**
     * Stable classroom profile for a linked anchor student.
     *
     * @return array{key: string, name: string, email: string, number: int, profile: string, ordinal: int}
     */
    public static function definition(User $student): array
    {
        $email = strtolower(trim($student->email));
        $hash = crc32($email);

        $profile = OrganisationNetworkCatalog::PROFILES[$hash % count(OrganisationNetworkCatalog::PROFILES)];
        $number = ($hash % OrganisationNetworkCatalog::STUDENT_COUNT) + 1;
        $ordinal = ($hash % 3) + 1;

        if ($email === strtolower(ParentDemoCatalog::CHILD_EMAIL)) {
            $profile = 'good';
            $number = 7;
            $ordinal = 2;
        }

        return [
            'key' => 'anchor-'.substr(hash('sha256', $email), 0, 10),
            'name' => $student->name,
            'email' => $email,
            'number' => $number,
            'profile' => $profile,
            'ordinal' => $ordinal,
        ];
    }
}