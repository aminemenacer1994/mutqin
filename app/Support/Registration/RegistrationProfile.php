<?php

namespace App\Support\Registration;

use App\Enums\AccountRole;
use App\Support\ParentFeatures;
use App\Support\TeacherFeatures;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

final class RegistrationProfile
{
    public const CUSTOM_NAME_VALUE = '__custom__';

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function normalize(array $data): array
    {
        // Organisation is collected later via Connect — strip any leftover register fields.
        unset($data['organisation_type'], $data['organisation_name'], $data['organisation_name_custom']);

        return $data;
    }

    /**
     * @return list<string>
     */
    public static function allowedAccountRoles(): array
    {
        $roles = [AccountRole::Individual->value];

        if (TeacherFeatures::enabled()) {
            $roles[] = AccountRole::Student->value;
            $roles[] = AccountRole::Teacher->value;
        }

        if (ParentFeatures::enabled()) {
            $roles[] = AccountRole::Parent->value;
        }

        return $roles;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function rules(array $data): array
    {
        $allowed = self::allowedAccountRoles();

        return [
            'account_role' => ['nullable', 'string', Rule::in($allowed)],
            // Accepted but ignored — institution linking happens later via Connect.
            'organisation_type' => ['nullable'],
            'organisation_name' => ['nullable'],
            'organisation_name_custom' => ['nullable'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function messages(): array
    {
        return [
            'account_role.in' => __('ui.auth_role_invalid'),
        ];
    }

    /**
     * @param  array<string, mixed>|null  $input
     * @return array{account_role: AccountRole, organisation_type: null, organisation_name: null}
     */
    public static function validated(?array $input): array
    {
        $input ??= [];

        if (! isset($input['account_role']) || $input['account_role'] === '' || $input['account_role'] === null) {
            $input['account_role'] = AccountRole::Individual->value;
        }

        $input = self::normalize($input);
        $data = Validator::make($input, self::rules($input), self::messages())->validate();

        return [
            'account_role' => AccountRole::from($data['account_role']),
            'organisation_type' => null,
            'organisation_name' => null,
        ];
    }
}
