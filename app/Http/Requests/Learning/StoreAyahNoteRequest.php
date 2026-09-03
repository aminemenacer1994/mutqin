<?php

namespace App\Http\Requests\Learning;

use App\Rules\ValidQuranAyah;
use Illuminate\Foundation\Http\FormRequest;

class StoreAyahNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'surah_number' => ['required', 'integer', 'min:1', 'max:114'],
            'ayah_number' => ['required', 'integer', 'min:1', new ValidQuranAyah],
            'title' => ['nullable', 'string', 'max:120'],
            'body' => ['required', 'string', 'min:1', 'max:2000'],
        ];
    }
}
