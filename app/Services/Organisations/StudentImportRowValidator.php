<?php

namespace App\Services\Organisations;

use App\Support\Imports\StudentImportFieldAliases;

final class StudentImportRowValidator
{
    /**
     * @param  array<string, mixed>  $fields
     * @return array{normalized: array<string, string|null>, errors: list<string>, valid: bool}
     */
    public function validate(array $fields): array
    {
        $canonical = StudentImportFieldAliases::canonicalizeRow($fields);
        $errors = [];

        if ($canonical['email'] === null && $canonical['name'] === null) {
            $errors[] = 'Row must include at least a student email or name.';
        }

        if ($canonical['email'] !== null && ! filter_var($canonical['email'], FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Student email is not valid.';
        }

        if ($canonical['parent_email'] !== null && ! filter_var($canonical['parent_email'], FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Parent or guardian email is not valid.';
        }

        if ($canonical['email'] === null && $canonical['name'] !== null) {
            $errors[] = 'Email is required before students can be enrolled.';
        }

        $valid = $errors === [] && $canonical['email'] !== null;

        return [
            'normalized' => $canonical,
            'errors' => $errors,
            'valid' => $valid,
        ];
    }
}