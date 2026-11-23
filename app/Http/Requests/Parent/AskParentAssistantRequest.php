<?php

namespace App\Http\Requests\Parent;

use Illuminate\Foundation\Http\FormRequest;

class AskParentAssistantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'question' => ['nullable', 'string', 'max:500', 'required_without:prompt'],
            'prompt' => ['nullable', 'string', 'in:progress,practice,homework,feedback,routine,month,wording'],
            'child_id' => ['nullable', 'integer'],
        ];
    }
}
