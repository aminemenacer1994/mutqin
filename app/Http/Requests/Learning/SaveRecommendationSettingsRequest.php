<?php

namespace App\Http\Requests\Learning;

use Illuminate\Foundation\Http\FormRequest;

class SaveRecommendationSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        $settings = $this->input('settings');
        if (! is_array($settings)) {
            return;
        }

        $this->merge([
            'settings' => $this->sanitizeSettings($settings),
        ]);
    }

    /**
     * @param  array<string, mixed>  $settings
     * @return array<string, mixed>
     */
    private function sanitizeSettings(array $settings): array
    {
        $clean = [];

        if (array_key_exists('technique', $settings) && $settings['technique'] !== null && $settings['technique'] !== '') {
            $clean['technique'] = strtolower(trim((string) $settings['technique']));
        }
        if (array_key_exists('reciter', $settings) && $settings['reciter'] !== null && $settings['reciter'] !== '') {
            $clean['reciter'] = (string) $settings['reciter'];
        }
        if (array_key_exists('playback_speed', $settings) && is_numeric($settings['playback_speed'])) {
            $clean['playback_speed'] = round((float) $settings['playback_speed'], 2);
        }
        if (array_key_exists('repetitions', $settings) && is_numeric($settings['repetitions'])) {
            $clean['repetitions'] = (int) round((float) $settings['repetitions']);
        }
        if (array_key_exists('ayat_per_step', $settings) && $settings['ayat_per_step'] !== null && is_numeric($settings['ayat_per_step'])) {
            $clean['ayat_per_step'] = (int) round((float) $settings['ayat_per_step']);
        }
        foreach (['focus_enabled', 'blur_enabled', 'talqin_enabled'] as $flag) {
            if (array_key_exists($flag, $settings)) {
                $clean[$flag] = filter_var($settings[$flag], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? (bool) $settings[$flag];
            }
        }

        return $clean;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'recommendation_id' => ['required', 'integer', 'min:1'],
            'reset' => ['sometimes', 'boolean'],
            'settings' => ['required_without:reset', 'array'],
            'settings.technique' => ['sometimes', 'nullable', 'string', 'in:talqin,focus,blur'],
            'settings.reciter' => ['sometimes', 'nullable', 'string', 'max:64'],
            'settings.playback_speed' => ['sometimes', 'nullable', 'numeric', 'min:0.5', 'max:1.5'],
            'settings.repetitions' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:8'],
            'settings.ayat_per_step' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:10'],
            'settings.focus_enabled' => ['sometimes', 'boolean'],
            'settings.blur_enabled' => ['sometimes', 'boolean'],
            'settings.talqin_enabled' => ['sometimes', 'boolean'],
        ];
    }
}
