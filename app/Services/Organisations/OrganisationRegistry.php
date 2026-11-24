<?php

namespace App\Services\Organisations;

use App\Enums\OrganisationType;
use App\Models\Organisation;
use App\Support\Registration\OrganisationName;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrganisationRegistry
{
    public function find(OrganisationType $type, string $rawName): ?Organisation
    {
        $canonical = OrganisationName::canonical($rawName);
        if (mb_strlen($canonical) < 2) {
            return null;
        }

        return Organisation::query()
            ->where('type', $type->value)
            ->where('name_canonical', $canonical)
            ->first();
    }

    /**
     * @return list<array{type: string, name: string}>
     */
    public function search(?OrganisationType $type = null, ?string $query = null, int $limit = 40): array
    {
        $builder = Organisation::query()->orderBy('name');

        if ($type !== null) {
            $builder->where('type', $type->value);
        }

        $needle = OrganisationName::canonical((string) $query);
        if ($needle !== '') {
            $builder->where('name_canonical', 'like', '%'.$needle.'%');
        }

        return $builder
            ->limit(max(1, min($limit, 100)))
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

    public function findOrCreate(OrganisationType $type, string $rawName): Organisation
    {
        $display = OrganisationName::display($rawName);
        $canonical = OrganisationName::canonical($rawName);

        if (mb_strlen($canonical) < 2) {
            throw ValidationException::withMessages([
                'organisation_name' => __('ui.auth_org_name_required'),
            ]);
        }

        return DB::transaction(function () use ($type, $display, $canonical) {
            $existing = Organisation::query()
                ->where('type', $type->value)
                ->where('name_canonical', $canonical)
                ->lockForUpdate()
                ->first();

            if ($existing) {
                return $existing;
            }

            try {
                $organisation = new Organisation;
                $organisation->forceFill([
                    'type' => $type->value,
                    'name' => $display,
                    'name_canonical' => $canonical,
                ])->save();

                return $organisation;
            } catch (UniqueConstraintViolationException) {
                return Organisation::query()
                    ->where('type', $type->value)
                    ->where('name_canonical', $canonical)
                    ->firstOrFail();
            }
        });
    }
}

