<?php

namespace App\Http\Requests;

use App\Models\User;
use App\Support\SessionVoiceAccess;
use Illuminate\Foundation\Http\FormRequest;

class InterpretSessionVoiceCommandRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user instanceof User && SessionVoiceAccess::visible($user);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'transcript' => ['required', 'string', 'max:2000'],
            'overrides' => ['nullable', 'array'],
            'overrides.mode' => ['nullable', 'string', 'in:recite,memorise,revise,test'],
            'overrides.surah' => ['nullable', 'integer', 'min:1', 'max:114'],
            'overrides.start_ayah' => ['nullable', 'integer', 'min:1', 'max:286'],
            'overrides.end_ayah' => ['nullable', 'integer', 'min:1', 'max:286'],
            'overrides.reciter' => ['nullable', 'string', 'max:80'],
            'overrides.speed' => ['nullable', 'numeric', 'min:0.1', 'max:3'],
            'overrides.repetitions' => ['nullable', 'integer', 'min:1', 'max:50'],
        ];
    }
}
