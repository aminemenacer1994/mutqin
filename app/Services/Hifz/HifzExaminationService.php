<?php

namespace App\Services\Hifz;

use App\Models\HifzExaminationAttempt;
use App\Models\HifzExaminationQuestion;
use App\Models\MemorisationWeakSpot;
use App\Models\TeacherAssignment;
use App\Models\TeacherAssignmentRecipient;
use App\Models\User;
use App\Support\AssignmentHifzExaminationSettings;
use App\Support\QuranJuzBounds;
use App\Support\QuranRangeResolver;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class HifzExaminationService
{
    /**
     * @return array{attempt: HifzExaminationAttempt, questions: list<HifzExaminationQuestion>}
     */
    public function ensureAttempt(User $student, TeacherAssignmentRecipient $recipient): array
    {
        $recipient->loadMissing('assignment');
        $assignment = $recipient->assignment;
        if ($assignment === null || $assignment->activity !== 'examination') {
            throw ValidationException::withMessages([
                'assignment' => 'This task is not a Hifz examination.',
            ]);
        }

        if ((int) $recipient->student_id !== (int) $student->id) {
            throw ValidationException::withMessages([
                'assignment' => 'This examination is not assigned to you.',
            ]);
        }

        $existing = HifzExaminationAttempt::query()
            ->where('teacher_assignment_recipient_id', $recipient->id)
            ->with('questions')
            ->first();

        if ($existing !== null && $existing->questions->isNotEmpty()) {
            return ['attempt' => $existing, 'questions' => $existing->questions->all()];
        }

        return DB::transaction(function () use ($student, $recipient, $assignment, $existing) {
            $settings = $this->examinationSettings($assignment);
            $seed = hash('sha256', implode('|', [
                $recipient->id,
                $assignment->id,
                $assignment->updated_at?->timestamp ?? 0,
            ]));

            $attempt = $existing ?? new HifzExaminationAttempt;
            $attempt->forceFill([
                'teacher_assignment_recipient_id' => $recipient->id,
                'student_id' => $student->id,
                'status' => 'in_progress',
                'generation_seed' => $seed,
                'settings_snapshot' => $settings,
                'started_at' => now(),
            ])->save();

            $rows = $this->buildQuestions($assignment, $settings, (int) $student->id, $seed);
            HifzExaminationQuestion::query()->where('hifz_examination_attempt_id', $attempt->id)->delete();

            $questions = [];
            foreach ($rows as $index => $row) {
                $question = new HifzExaminationQuestion;
                $question->forceFill([
                    'hifz_examination_attempt_id' => $attempt->id,
                    'position' => $index + 1,
                    ...$row,
                ])->save();
                $questions[] = $question;
            }

            $attempt->forceFill([
                'question_count' => count($questions),
                'completed_question_count' => 0,
            ])->save();

            return ['attempt' => $attempt->fresh('questions'), 'questions' => $questions];
        });
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function recordQuestionOutcome(
        User $student,
        HifzExaminationQuestion $question,
        array $payload,
    ): HifzExaminationQuestion {
        $attempt = $question->attempt()->with('recipient')->first();
        if ($attempt === null || (int) $attempt->student_id !== (int) $student->id) {
            throw ValidationException::withMessages(['question' => 'Question not found.']);
        }

        $question->forceFill([
            'wording_result' => $this->nullableString($payload['wording_result'] ?? null, 32),
            'hesitation' => array_key_exists('hesitation', $payload) ? filter_var($payload['hesitation'], FILTER_VALIDATE_BOOL) : $question->hesitation,
            'prompts_used' => isset($payload['prompts_used']) ? max(0, min(20, (int) $payload['prompts_used'])) : $question->prompts_used,
            'completed' => array_key_exists('completed', $payload) ? filter_var($payload['completed'], FILTER_VALIDATE_BOOL) : true,
            'fluency' => $this->nullableString($payload['fluency'] ?? null, 32),
            'answered_at' => now(),
            'memorisation_assessment_id' => isset($payload['memorisation_assessment_id']) ? (int) $payload['memorisation_assessment_id'] : $question->memorisation_assessment_id,
            'ai_recite_attempt_id' => isset($payload['ai_recite_attempt_id']) ? (int) $payload['ai_recite_attempt_id'] : $question->ai_recite_attempt_id,
        ])->save();

        $this->syncAttemptProgress($attempt->fresh());

        return $question->fresh();
    }

    public function submitAttempt(User $student, HifzExaminationAttempt $attempt): HifzExaminationAttempt
    {
        if ((int) $attempt->student_id !== (int) $student->id) {
            throw ValidationException::withMessages(['attempt' => 'Examination not found.']);
        }

        $attempt->forceFill([
            'status' => 'submitted',
            'submitted_at' => now(),
        ])->save();

        return $attempt->fresh('questions');
    }

    /**
     * @return array<string, mixed>
     */
    public function presentAttempt(HifzExaminationAttempt $attempt): array
    {
        $attempt->loadMissing('questions');

        return [
            'id' => $attempt->id,
            'status' => $attempt->status,
            'question_count' => $attempt->question_count,
            'completed_question_count' => $attempt->completed_question_count,
            'started_at' => $attempt->started_at?->toIso8601String(),
            'submitted_at' => $attempt->submitted_at?->toIso8601String(),
            'settings' => $attempt->settings_snapshot,
            'questions' => $attempt->questions->map(fn (HifzExaminationQuestion $q) => $this->presentQuestion($q))->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function presentQuestion(HifzExaminationQuestion $question): array
    {
        return [
            'id' => $question->id,
            'position' => $question->position,
            'mode' => $question->mode,
            'surah' => $question->surah_number,
            'ayah' => $question->ayah_number,
            'end_surah' => $question->end_surah_number,
            'end_ayah' => $question->end_ayah_number,
            'recitation_length_ayahs' => $question->recitation_length_ayahs,
            'prompt_seed' => $question->prompt_seed,
            'meta' => $question->meta,
            'wording_result' => $question->wording_result,
            'hesitation' => $question->hesitation,
            'prompts_used' => $question->prompts_used,
            'completed' => $question->completed,
            'fluency' => $question->fluency,
            'answered_at' => $question->answered_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function examinationSettings(TeacherAssignment $assignment): array
    {
        $session = is_array($assignment->session_settings) ? $assignment->session_settings : [];
        $exam = AssignmentHifzExaminationSettings::sanitize($session['examination'] ?? null);
        if ($exam === null) {
            throw ValidationException::withMessages([
                'session_settings' => 'Examination settings are missing for this task.',
            ]);
        }

        return $exam;
    }

    /**
     * @param  array<string, mixed>  $settings
     * @return list<array<string, mixed>>
     */
    private function buildQuestions(TeacherAssignment $assignment, array $settings, int $studentId, string $seed): array
    {
        $pool = QuranRangeResolver::expandPool(
            (string) $settings['pool_type'],
            is_array($settings['pool'] ?? null) ? $settings['pool'] : [],
            (int) $assignment->surah_number,
            (int) $assignment->ayah_start,
            (int) $assignment->ayah_end,
        );

        if ($pool === []) {
            throw ValidationException::withMessages([
                'assignment' => 'The examination passage could not be resolved.',
            ]);
        }

        $length = (int) ($settings['recitation_length_ayahs'] ?? 3);
        $targetCount = (int) ($settings['question_count'] ?? 5);
        $modes = $settings['exam_modes'] ?? ['continue_recitation'];
        $generation = (string) ($settings['generation_mode'] ?? 'random');

        if ($generation === 'manual') {
            return $this->buildManualQuestions($settings, $pool, $length, $modes, $seed);
        }

        if ($generation === 'weak_ayah') {
            $starts = $this->weakAyahStarts($studentId, $pool, $targetCount, $seed);
        } else {
            $starts = $this->randomStarts($pool, $targetCount, $seed, $length);
        }

        return $this->composeQuestionRows($starts, $modes, $pool, $length, $seed);
    }

    /**
     * @param  array<string, mixed>  $settings
     * @param  list<array{surah: int, ayah: int, key: string}>  $pool
     * @param  list<string>  $modes
     * @return list<array<string, mixed>>
     */
    private function buildManualQuestions(array $settings, array $pool, int $length, array $modes, string $seed): array
    {
        $manual = is_array($settings['manual_questions'] ?? null) ? $settings['manual_questions'] : [];
        if ($manual === []) {
            throw ValidationException::withMessages([
                'session_settings' => 'Add at least one manual examination question.',
            ]);
        }

        $rows = [];
        foreach ($manual as $index => $entry) {
            $surah = (int) ($entry['surah'] ?? 0);
            $ayah = (int) ($entry['ayah'] ?? 0);
            if (! $this->ayahInPool($pool, $surah, $ayah)) {
                continue;
            }
            $mode = (string) ($entry['mode'] ?? 'continue_recitation');
            $rows[] = $this->questionRow($mode, $surah, $ayah, $pool, $length, "{$seed}-m{$index}");
        }

        if ($rows === []) {
            throw ValidationException::withMessages([
                'session_settings' => 'Manual questions must fall inside the examination passage.',
            ]);
        }

        return $rows;
    }

    /**
     * @param  list<array{surah: int, ayah: int, mode?: string}>  $starts
     * @param  list<string>  $modes
     * @param  list<array{surah: int, ayah: int, key: string}>  $pool
     * @return list<array<string, mixed>>
     */
    private function composeQuestionRows(array $starts, array $modes, array $pool, int $length, string $seed): array
    {
        $rows = [];
        $mixed = in_array('mixed', $modes, true);
        $usableModes = array_values(array_filter($modes, fn (string $m) => $m !== 'mixed'));
        if ($usableModes === []) {
            $usableModes = ['continue_recitation'];
        }

        foreach ($starts as $index => $start) {
            $mode = $start['mode'] ?? null;
            if ($mode === null || $mode === 'mixed') {
                $mode = $mixed
                    ? $usableModes[$index % count($usableModes)]
                    : $usableModes[0];
            }
            $rows[] = $this->questionRow(
                (string) $mode,
                (int) $start['surah'],
                (int) $start['ayah'],
                $pool,
                $length,
                "{$seed}-q{$index}",
            );
        }

        return $rows;
    }

    /**
     * @param  list<array{surah: int, ayah: int, key: string}>  $pool
     * @return list<array{surah: int, ayah: int}>
     */
    private function randomStarts(array $pool, int $count, string $seed, int $length): array
    {
        $eligible = array_values(array_filter(
            $pool,
            fn (array $row) => $this->canStartRecitation($pool, (int) $row['surah'], (int) $row['ayah'], $length),
        ));

        if ($eligible === []) {
            $eligible = $pool;
        }

        $eligible = $this->dedupeAmbiguousStarts($eligible, $pool, $length);
        shuffle($eligible);
        $picked = array_slice($eligible, 0, min($count, count($eligible)));

        return array_map(fn (array $row) => ['surah' => $row['surah'], 'ayah' => $row['ayah']], $picked);
    }

    /**
     * @param  list<array{surah: int, ayah: int, key: string}>  $pool
     * @return list<array{surah: int, ayah: int}>
     */
    private function weakAyahStarts(int $studentId, array $pool, int $count, string $seed): array
    {
        $keys = array_flip(array_column($pool, 'key'));
        $weak = MemorisationWeakSpot::query()
            ->where('user_id', $studentId)
            ->orderByDesc('updated_at')
            ->limit(80)
            ->get(['surah_number', 'ayah_number']);

        $starts = [];
        foreach ($weak as $spot) {
            $key = "{$spot->surah_number}:{$spot->ayah_number}";
            if (! isset($keys[$key])) {
                continue;
            }
            $starts[] = ['surah' => (int) $spot->surah_number, 'ayah' => (int) $spot->ayah_number];
            if (count($starts) >= $count) {
                break;
            }
        }

        if (count($starts) < $count) {
            $fallback = $this->randomStarts($pool, $count - count($starts), $seed, 3);
            $starts = array_merge($starts, $fallback);
        }

        return array_slice($starts, 0, $count);
    }

    /**
     * @param  list<array{surah: int, ayah: int, key: string}>  $pool
     * @return list<array{surah: int, ayah: int, key: string}>
     */
    private function dedupeAmbiguousStarts(array $eligible, array $pool, int $length): array
    {
        $seen = [];
        $out = [];
        foreach ($eligible as $row) {
            $end = QuranRangeResolver::recitationEnd($pool, (int) $row['surah'], (int) $row['ayah'], $length);
            $signature = $end
                ? "{$row['surah']}:{$row['ayah']}-{$end['surah']}:{$end['ayah']}"
                : $row['key'];
            if (isset($seen[$signature])) {
                continue;
            }
            $seen[$signature] = true;
            $out[] = $row;
        }

        return $out;
    }

    /**
     * @param  list<array{surah: int, ayah: int, key: string}>  $pool
     */
    private function canStartRecitation(array $pool, int $surah, int $ayah, int $length): bool
    {
        if ($length <= 1) {
            return $this->ayahInPool($pool, $surah, $ayah);
        }

        return QuranRangeResolver::recitationEnd($pool, $surah, $ayah, $length) !== null;
    }

    /**
     * @param  list<array{surah: int, ayah: int, key: string}>  $pool
     */
    private function ayahInPool(array $pool, int $surah, int $ayah): bool
    {
        foreach ($pool as $row) {
            if ((int) $row['surah'] === $surah && (int) $row['ayah'] === $ayah) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  list<array{surah: int, ayah: int, key: string}>  $pool
     * @return array<string, mixed>
     */
    private function questionRow(string $mode, int $surah, int $ayah, array $pool, int $length, string $promptSeed): array
    {
        if ($mode === 'previous_ayah') {
            $prev = QuranJuzBounds::previousAyah($surah, $ayah);
            $surah = $prev['surah'];
            $ayah = $prev['ayah'];
            $length = 1;
        }

        $end = QuranRangeResolver::recitationEnd($pool, $surah, $ayah, max(1, $length));

        return [
            'mode' => $mode,
            'surah_number' => $surah,
            'ayah_number' => $ayah,
            'end_surah_number' => $end['surah'] ?? $surah,
            'end_ayah_number' => $end['ayah'] ?? $ayah,
            'recitation_length_ayahs' => max(1, $length),
            'prompt_seed' => substr(hash('sha256', $promptSeed), 0, 32),
            'meta' => ['examination' => true],
        ];
    }

    private function syncAttemptProgress(HifzExaminationAttempt $attempt): void
    {
        $completed = HifzExaminationQuestion::query()
            ->where('hifz_examination_attempt_id', $attempt->id)
            ->whereNotNull('answered_at')
            ->count();

        $attempt->forceFill(['completed_question_count' => $completed])->save();
    }

    private function nullableString(mixed $value, int $max): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        $text = trim((string) $value);

        return $text === '' ? null : mb_substr($text, 0, $max);
    }
}