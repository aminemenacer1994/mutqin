<?php

namespace App\Support;

/** Hifz examination configuration on teacher assignment session_settings.examination */
final class AssignmentHifzExaminationSettings
{
    public const POOL_TYPES = ['surah', 'juz', 'hizb', 'custom'];

    public const GENERATION_MODES = ['random', 'manual', 'weak_ayah'];

    public const EXAM_MODES = ['continue_recitation', 'previous_ayah', 'mushaf_hide', 'mixed'];

    public const DELIVERY_MODES = ['live', 'async'];

    public const PROMPTS = ['repeat', 'start_ayah', 'continue', 'finish_ayah'];

    /**
     * @param  array<string, mixed>|null  $input
     * @return array<string, mixed>|null
     */
    public static function sanitize(?array $input): ?array
    {
        if ($input === null || $input === []) {
            return null;
        }

        $enabled = filter_var($input['enabled'] ?? true, FILTER_VALIDATE_BOOL);
        if (! $enabled) {
            return null;
        }

        $poolType = strtolower(trim((string) ($input['pool_type'] ?? 'custom')));
        if (! in_array($poolType, self::POOL_TYPES, true)) {
            $poolType = 'custom';
        }

        $generationMode = strtolower(trim((string) ($input['generation_mode'] ?? 'random')));
        if (! in_array($generationMode, self::GENERATION_MODES, true)) {
            $generationMode = 'random';
        }

        $questionCount = isset($input['question_count']) && is_numeric($input['question_count'])
            ? (int) round((float) $input['question_count'])
            : 5;
        $questionCount = max(1, min(30, $questionCount));

        $recitationLength = isset($input['recitation_length_ayahs']) && is_numeric($input['recitation_length_ayahs'])
            ? (int) round((float) $input['recitation_length_ayahs'])
            : 3;
        $recitationLength = max(1, min(15, $recitationLength));

        $repetitions = isset($input['repetitions']) && is_numeric($input['repetitions'])
            ? (int) round((float) $input['repetitions'])
            : 1;
        $repetitions = max(1, min(5, $repetitions));

        $delivery = strtolower(trim((string) ($input['delivery'] ?? 'async')));
        if (! in_array($delivery, self::DELIVERY_MODES, true)) {
            $delivery = 'async';
        }

        $examModes = [];
        $rawModes = $input['exam_modes'] ?? ['continue_recitation'];
        if (is_array($rawModes)) {
            foreach ($rawModes as $mode) {
                $m = strtolower(trim((string) $mode));
                if (in_array($m, self::EXAM_MODES, true) && ! in_array($m, $examModes, true)) {
                    $examModes[] = $m;
                }
            }
        }
        if ($examModes === []) {
            $examModes = ['continue_recitation'];
        }

        $prompts = [];
        $rawPrompts = $input['permitted_prompts'] ?? ['repeat', 'start_ayah'];
        if (is_array($rawPrompts)) {
            foreach ($rawPrompts as $prompt) {
                $p = strtolower(trim((string) $prompt));
                if (in_array($p, self::PROMPTS, true) && ! in_array($p, $prompts, true)) {
                    $prompts[] = $p;
                }
            }
        }
        if ($prompts === []) {
            $prompts = ['repeat', 'start_ayah'];
        }

        $pool = is_array($input['pool'] ?? null) ? $input['pool'] : [];

        $manual = [];
        if (is_array($input['manual_questions'] ?? null)) {
            foreach ($input['manual_questions'] as $row) {
                if (! is_array($row)) {
                    continue;
                }
                $surah = (int) ($row['surah'] ?? 0);
                $ayah = (int) ($row['ayah'] ?? 0);
                if ($surah < 1 || $surah > 114 || $ayah < 1) {
                    continue;
                }
                $mode = strtolower(trim((string) ($row['mode'] ?? 'continue_recitation')));
                if (! in_array($mode, self::EXAM_MODES, true) || $mode === 'mixed') {
                    $mode = 'continue_recitation';
                }
                $manual[] = ['surah' => $surah, 'ayah' => $ayah, 'mode' => $mode];
            }
        }

        return [
            'enabled' => true,
            'pool_type' => $poolType,
            'pool' => $pool,
            'generation_mode' => $generationMode,
            'question_count' => $questionCount,
            'recitation_length_ayahs' => $recitationLength,
            'repetitions' => $repetitions,
            'exam_modes' => $examModes,
            'permitted_prompts' => $prompts,
            'delivery' => $delivery,
            'ai_wording_assessment' => filter_var($input['ai_wording_assessment'] ?? false, FILTER_VALIDATE_BOOL),
            'manual_questions' => $manual,
            'disclaimer_acknowledged' => filter_var($input['disclaimer_acknowledged'] ?? true, FILTER_VALIDATE_BOOL),
        ];
    }

    /**
     * @param  array<string, mixed>|null  $settings
     */
    public static function isEnabled(?array $settings): bool
    {
        return is_array($settings)
            && is_array($settings['examination'] ?? null)
            && ! empty($settings['examination']['enabled']);
    }

    /**
     * @param  array<string, mixed>|null  $settings
     * @return array<string, mixed>
     */
    public static function present(?array $settings): array
    {
        $exam = self::sanitize(
            is_array($settings['examination'] ?? null) ? $settings['examination'] : null
        );

        return $exam ?? [];
    }

    /**
     * @param  array<string, scalar|null>  $params
     * @param  array<string, mixed>|null  $settings
     * @return array<string, scalar|null>
     */
    public static function mergeIntoMemorisationQuery(?array $settings, array $params): array
    {
        if (! self::isEnabled($settings)) {
            return $params;
        }

        $params['hifz_examination'] = '1';

        return $params;
    }
}