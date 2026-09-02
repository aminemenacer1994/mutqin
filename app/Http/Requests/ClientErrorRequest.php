<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ClientErrorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'max:120'],
            'message' => ['nullable', 'string', 'max:500'],
            'stack' => ['nullable', 'string', 'max:4000'],
            'kind' => ['nullable', 'string', 'max:60'],
            'feature' => ['nullable', 'string', 'max:60'],
            'route' => ['nullable', 'string', 'max:200'],
            'release' => ['nullable', 'string', 'max:80'],
            'request_id' => ['nullable', 'string', 'max:80'],
            'status' => ['nullable', 'integer', 'min:0', 'max:599'],
            'latency_ms' => ['nullable', 'integer', 'min:0', 'max:120000'],
            'environment' => ['nullable', 'string', 'max:40'],
            'meta' => ['nullable', 'array', 'max:20'],
            'meta.*' => ['nullable', 'string', 'max:200'],
        ];
    }
}
