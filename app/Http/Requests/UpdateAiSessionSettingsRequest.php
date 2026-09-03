<?php

namespace App\Http\Requests;

use App\Services\Auth\AiSessionSettingsService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAiSessionSettingsRequest extends FormRequest
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
            'ai_recite' => ['sometimes', 'array'],
            'ai_recite.recall_mode_enabled' => ['sometimes', 'boolean'],
            'ai_recite.strict_progression' => ['sometimes', 'boolean'],
            'ai_recite.persist_mistakes' => ['sometimes', 'boolean'],
            'amd' => ['sometimes', 'array'],
            'amd.hide_percent' => ['sometimes', 'integer', Rule::in(AiSessionSettingsService::AMD_HIDE_PERCENTS)],
            'amd.mistake_sound_enabled' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Only whitelisted namespaces / keys reach the service.
     *
     * @return array{ai_recite?: array<string, bool>, amd?: array{hide_percent?: int, mistake_sound_enabled?: bool}}
     */
    public function settingsPatch(): array
    {
        $validated = $this->validated();
        $patch = [];

        if (isset($validated['ai_recite']) && is_array($validated['ai_recite'])) {
            $ai = [];
            foreach (['recall_mode_enabled', 'strict_progression', 'persist_mistakes'] as $key) {
                if (array_key_exists($key, $validated['ai_recite'])) {
                    $ai[$key] = (bool) $validated['ai_recite'][$key];
                }
            }
            if ($ai !== []) {
                $patch['ai_recite'] = $ai;
            }
        }

        if (isset($validated['amd']) && is_array($validated['amd'])) {
            $amd = [];
            if (array_key_exists('hide_percent', $validated['amd'])) {
                $amd['hide_percent'] = (int) $validated['amd']['hide_percent'];
            }
            if (array_key_exists('mistake_sound_enabled', $validated['amd'])) {
                $amd['mistake_sound_enabled'] = (bool) $validated['amd']['mistake_sound_enabled'];
            }
            if ($amd !== []) {
                $patch['amd'] = $amd;
            }
        }

        return $patch;
    }
}
