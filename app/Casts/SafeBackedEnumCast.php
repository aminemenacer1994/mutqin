<?php

namespace App\Casts;

use BackedEnum;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use InvalidArgumentException;

/**
 * Reads backed enums without throwing on legacy or mixed-case DB values.
 *
 * MySQL ci collations can match "Active" when querying "active"; Laravel's
 * native enum cast then throws ValueError and 500s pages like /dashboard.
 *
 * @template TEnum of \BackedEnum
 */
final class SafeBackedEnumCast implements CastsAttributes
{
    /** @param class-string<TEnum> $enumClass */
    public function __construct(private string $enumClass)
    {
        if (! is_subclass_of($this->enumClass, BackedEnum::class)) {
            throw new InvalidArgumentException($this->enumClass.' must be a backed enum.');
        }
    }

    public function get(mixed $model, string $key, mixed $value, array $attributes): mixed
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof $this->enumClass) {
            return $value;
        }

        return $this->resolve($value);
    }

    public function set(mixed $model, string $key, mixed $value, array $attributes): mixed
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof BackedEnum) {
            return $value->value;
        }

        $resolved = $this->resolve($value);

        // Never persist unknown values — a later native enum cast would 500.
        return $resolved?->value;
    }

    private function resolve(mixed $value): ?BackedEnum
    {
        $enum = $this->enumClass;

        if (is_int($value) || is_float($value)) {
            return $enum::tryFrom((int) $value);
        }

        $raw = trim((string) $value);
        if ($raw === '') {
            return null;
        }

        if (method_exists($enum, 'tryFromMixed')) {
            $mapped = $enum::tryFromMixed($raw);
            if ($mapped instanceof BackedEnum) {
                return $mapped;
            }
        }

        return $enum::tryFrom($raw)
            ?? $enum::tryFrom(strtolower($raw))
            ?? $enum::tryFrom(str_replace('-', '_', strtolower($raw)));
    }
}
