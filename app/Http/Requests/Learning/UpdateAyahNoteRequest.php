<?php

namespace App\Http\Requests\Learning;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAyahNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'title' => ['nullable', 'string', 'max:120'],
            'body' => ['required', 'string', 'min:1', 'max:2000'],
        ];
    }
}
