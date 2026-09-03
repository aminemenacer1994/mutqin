<?php

namespace App\Http\Requests\Learning;

use App\Support\QuranMetadata;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class SaveProgressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'max:2000'],
            'items.*.surah_number' => ['required', 'integer', 'min:1', 'max:114'],
            'items.*.ayah_number' => ['required', 'integer', 'min:1', 'max:286'],
            'items.*.status' => ['nullable', 'string', 'in:learning,reviewing,memorised,mastered'],
            'items.*.mastery_level' => ['nullable', 'integer', 'min:0', 'max:100'],
            'items.*.repetitions' => ['nullable', 'integer', 'min:0'],
            'items.*.completed_at' => ['nullable', 'date'],
            'items.*.metadata' => ['nullable', 'array'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $items = $this->input('items', []);
            if (! is_array($items)) {
                return;
            }
            foreach ($items as $index => $item) {
                if (! is_array($item)) {
                    continue;
                }
                $surah = (int) ($item['surah_number'] ?? 0);
                $ayah = (int) ($item['ayah_number'] ?? 0);
                if ($surah > 0 && $ayah > 0 && ! QuranMetadata::isValidAyah($surah, $ayah)) {
                    $validator->errors()->add(
                        "items.{$index}.ayah_number",
                        'The ayah_number is not a valid ayah for the given surah.'
                    );
                }
            }
        });
    }
}
