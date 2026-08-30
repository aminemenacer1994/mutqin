<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class MaxJsonBytes implements ValidationRule
{
    public const STATE_BYTES = 2_097_152;

    public const HIFZ_BYTES = 262_144;

    public function __construct(private int $maxBytes)
    {
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_array($value)) {
            return;
        }

        $encoded = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($encoded === false || strlen($encoded) > $this->maxBytes) {
            $fail(__('ui.api_payload_too_large'));
        }
    }
}
