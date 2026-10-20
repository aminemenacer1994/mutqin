<?php

namespace App\Support\Registration;

use App\Enums\AccountRole;
use App\Enums\OrganisationType;
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
        $picked = $data['organisation_name'] ?? null;
        $custom = is_string($data['organisation_name_custom'] ?? null)
            ? trim($data['organisation_name_custom'])
            : '';

        if (is_string($picked) && ($picked === self::CUSTOM_NAME_VALUE || trim($picked) === '')) {
            $data['organisation_name'] = $custom;
        }

        return $data;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function rules(array $data): array
    {
        $data = self::normalize($data);

        if (! TeacherFeatures::enabled()) {
            return [
                'account_role' => ['nullable', 'string', Rule::in([AccountRole::Individual->value])],
                'organisation_type' => ['prohibited'],
                'organisation_name' => ['prohibited'],
            ];
        }

        $role = $data['account_role'] ?? AccountRole::Individual->value;
        if (! is_string($role) || $role === '') {
            $role = AccountRole::Individual->value;
        }

        $needsOrganisation = in_array($role, [
            AccountRole::Student->value,
            AccountRole::Teacher->value,
        ], true);

        return [
            'account_role' => ['nullable', 'string', Rule::in(AccountRole::values())],
            'organisation_type' => [
                $needsOrganisation ? 'required' : 'nullable',
                'string',
                Rule::in(OrganisationType::values()),
            ],
            'organisation_name' => [
                $needsOrganisation ? 'required' : 'nullable',
                'string',
                'max:120',
                function (string $attribute, mixed $value, \Closure $fail) use ($needsOrganisation): void {
                    if (! $needsOrganisation || ! is_string($value)) {
                        return;
                    }

                    if (mb_strlen(OrganisationName::canonical($value)) < 2) {
                        $fail(__('ui.auth_org_name_required'));
                    }
                },
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function messages(): array
    {
        return [
            'account_role.in' => __('ui.auth_role_invalid'),
            'organisation_type.required' => __('ui.auth_org_type_required'),
            'organisation_type.in' => __('ui.auth_org_type_required'),
            'organisation_name.required' => __('ui.auth_org_name_required'),
            'organisation_name.max' => __('ui.auth_org_name_max'),
        ];
    }

    /**
     * @param  array<string, mixed>|null  $input
     * @return array{account_role: AccountRole, organisation_type: ?OrganisationType, organisation_name: ?string}
     */
    public static function validated(?array $input): array
    {
        $input ??= [];

        if (! isset($input['account_role']) || $input['account_role'] === '' || $input['account_role'] === null) {
            $input['account_role'] = AccountRole::Individual->value;
        }

        $input = self::normalize($input);
        $data = Validator::make($input, self::rules($input), self::messages())->validate();
        $role = AccountRole::from($data['account_role']);

        if (! $role->needsOrganisation()) {
            return [
                'account_role' => $role,
                'organisation_type' => null,
                'organisation_name' => null,
            ];
        }

        return [
            'account_role' => $role,
            'organisation_type' => OrganisationType::from($data['organisation_type']),
            'organisation_name' => (string) $data['organisation_name'],
        ];
    }
}
