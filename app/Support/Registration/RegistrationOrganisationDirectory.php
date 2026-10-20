<?php

namespace App\Support\Registration;

use App\Enums\OrganisationType;
use App\Models\Organisation;

/**
 * Organisations offered in registration (halaqa, madrassa, school).
 *
 * When a student or teacher registers with one of these type + name pairs,
 * they are placed in the organisation's shared registration group so teachers
 * can see students from the same organisation.
 */
final class RegistrationOrganisationDirectory
{
    public const REGISTRATION_GROUP = 'Shared class';

    /**
     * @return list<array{type: string, name: string, group: string}>
     */
    public static function entries(): array
    {
        return [
            [
                'type' => OrganisationType::Halaqa->value,
                'name' => 'Nur al-Huda Halaqa',
                'group' => self::REGISTRATION_GROUP,
            ],
            [
                'type' => OrganisationType::Madrassa->value,
                'name' => 'Al-Noor Madrassa',
                'group' => self::REGISTRATION_GROUP,
            ],
            [
                'type' => OrganisationType::School->value,
                'name' => 'Madinah Islamic School',
                'group' => self::REGISTRATION_GROUP,
            ],
        ];
    }

    /**
     * @return array{type: string, name: string, group: string}|null
     */
    public static function entryFor(Organisation $organisation): ?array
    {
        $type = $organisation->type instanceof OrganisationType
            ? $organisation->type->value
            : (string) $organisation->type;
        $canonical = (string) $organisation->name_canonical;

        foreach (self::entries() as $entry) {
            if ($entry['type'] === $type && OrganisationName::canonical($entry['name']) === $canonical) {
                return $entry;
            }
        }

        return null;
    }

    public static function isRegistrationOrganisation(Organisation $organisation): bool
    {
        return self::entryFor($organisation) !== null;
    }
}
