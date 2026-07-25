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
        $allowedTechniques = ['talqin', 'focus', 'blur', 'chaining', 'anchor'];

        if (array_key_exists('technique', $settings) && $settings['technique'] !== null && $settings['technique'] !== '') {
            $technique = strtolower(trim((string) $settings['technique']));
            if (in_array($technique, $allowedTechniques, true)) {
                $clean['technique'] = $technique;
            }
        }
        if (array_key_exists('complementary_technique', $settings) && $settings['complementary_technique'] !== null && $settings['complementary_technique'] !== '') {
            $complementary = strtolower(trim((string) $settings['complementary_technique']));
            if (in_array($complementary, $allowedTechniques, true)) {
                $clean['complementary_technique'] = $complementary;
            }
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
        foreach (['focus_enabled', 'blur_enabled', 'talqin_enabled', 'chaining_enabled', 'anchor_mode_enabled'] as $flag) {
            if (array_key_exists($flag, $settings)) {
                $clean[$flag] = filter_var($settings[$flag], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? (bool) $settings[$flag];
            }
        }
        if (array_key_exists('chaining_method', $settings) && in_array((string) $settings['chaining_method'], ['linking', 'cumulative'], true)) {
            $clean['chaining_method'] = (string) $settings['chaining_method'];
        }
        if (array_key_exists('chaining_repetitions', $settings) && is_numeric($settings['chaining_repetitions'])) {
            $clean['chaining_repetitions'] = max(1, min(5, (int) round((float) $settings['chaining_repetitions'])));
        }
        if (array_key_exists('anchor_count', $settings) && is_numeric($settings['anchor_count'])) {
            $clean['anchor_count'] = max(1, min(4, (int) round((float) $settings['anchor_count'])));
        }
        if (array_key_exists('tip_technique', $settings) && $settings['tip_technique'] !== null && $settings['tip_technique'] !== '') {
            $tipTechnique = strtolower(trim((string) $settings['tip_technique']));
            if (in_array($tipTechnique, $allowedTechniques, true)) {
                $clean['tip_technique'] = $tipTechnique;
            }
        }

        $weakSource = null;
        if (array_key_exists('practice_weak_words', $settings) && is_array($settings['practice_weak_words'])) {
            $weakSource = $settings['practice_weak_words'];
        } elseif (array_key_exists('weak_words', $settings) && is_array($settings['weak_words'])) {
            $weakSource = $settings['weak_words'];
        }
        if ($weakSource !== null) {
            $cleanedWords = [];
            foreach (array_slice(array_values($weakSource), 0, 12) as $word) {
                if (! is_array($word)) {
                    continue;
                }
                $wordIndex = $word['ayahWordIndex'] ?? $word['wordIndex'] ?? $word['index'] ?? null;
                if (! is_numeric($wordIndex) || (int) $wordIndex < 0) {
                    continue;
                }
                $item = [
                    'text' => mb_substr((string) ($word['text'] ?? $word['word'] ?? $word['ar'] ?? ''), 0, 120),
                    'wordIndex' => (int) $wordIndex,
                ];
                if (isset($word['ayahNumber']) && is_numeric($word['ayahNumber'])) {
                    $item['ayahNumber'] = (int) $word['ayahNumber'];
                }
                if (isset($word['surahId']) && is_numeric($word['surahId'])) {
                    $item['surahId'] = (int) $word['surahId'];
                }
                $verseKey = $word['verseKey'] ?? $word['ayahKey'] ?? null;
                if ($verseKey !== null && $verseKey !== '') {
                    $item['verseKey'] = (string) $verseKey;
                }
                $reason = $word['reason'] ?? $word['status'] ?? null;
                if ($reason !== null && $reason !== '') {
                    $item['reason'] = (string) $reason;
                }
                $cleanedWords[] = $item;
            }
            if ($cleanedWords !== []) {
                $clean['practice_weak_words'] = $cleanedWords;
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
            'settings.technique' => ['sometimes', 'nullable', 'string', 'in:talqin,focus,blur,chaining,anchor'],
            'settings.complementary_technique' => ['sometimes', 'nullable', 'string', 'in:talqin,focus,blur,chaining,anchor'],
            'settings.reciter' => ['sometimes', 'nullable', 'string', 'max:64'],
            'settings.playback_speed' => ['sometimes', 'nullable', 'numeric', 'min:0.5', 'max:1.5'],
            'settings.repetitions' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:8'],
            'settings.ayat_per_step' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:10'],
            'settings.focus_enabled' => ['sometimes', 'boolean'],
            'settings.blur_enabled' => ['sometimes', 'boolean'],
            'settings.talqin_enabled' => ['sometimes', 'boolean'],
            'settings.chaining_enabled' => ['sometimes', 'boolean'],
            'settings.anchor_mode_enabled' => ['sometimes', 'boolean'],
            'settings.chaining_method' => ['sometimes', 'nullable', 'string', 'in:linking,cumulative'],
            'settings.chaining_repetitions' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:5'],
            'settings.anchor_count' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:4'],
            'settings.tip_technique' => ['sometimes', 'nullable', 'string', 'in:talqin,focus,blur,chaining,anchor'],
            'settings.practice_weak_words' => ['sometimes', 'array', 'max:12'],
            'settings.practice_weak_words.*.text' => ['sometimes', 'nullable', 'string', 'max:120'],
            'settings.practice_weak_words.*.wordIndex' => ['sometimes', 'integer', 'min:0', 'max:200'],
            'settings.practice_weak_words.*.ayahNumber' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:300'],
            'settings.practice_weak_words.*.surahId' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:114'],
            'settings.practice_weak_words.*.verseKey' => ['sometimes', 'nullable', 'string', 'max:32'],
            'settings.practice_weak_words.*.reason' => ['sometimes', 'nullable', 'string', 'max:40'],
        ];
    }
}
