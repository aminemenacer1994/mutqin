<?php

namespace App\Rules;

use App\Support\QuranMetadata;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Validates that (surah_number, ayah_number) form a real Qur'an ayah identity.
 */
final class ValidQuranAyah implements ValidationRule
{
    public function __construct(
        private readonly string $surahField = 'surah_number',
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $surah = (int) request()->input($this->surahField);
        $ayah = (int) $value;

        if (! QuranMetadata::isValidAyah($surah, $ayah)) {
            $fail('The :attribute is not a valid ayah for the given surah.');
        }
    }
}
