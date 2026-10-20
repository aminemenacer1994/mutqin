<?php

namespace App\Support\Registration;

use App\Enums\OrganisationType;
use App\Models\Organisation;

/**
 * Organisations offered during student/teacher registration.
 */
final class OrganisationRegistrationCatalog
{
    /**
     * @return list<array{type: string, name: string}>
     */
    public static function options(): array
    {
        return Organisation::query()
            ->orderBy('name')
            ->get(['name', 'type'])
            ->map(function (Organisation $organisation) {
                $type = $organisation->type instanceof OrganisationType
                    ? $organisation->type->value
                    : (string) $organisation->type;

                return [
                    'type' => $type,
                    'name' => $organisation->name,
                ];
            })
            ->values()
            ->all();
    }
}
