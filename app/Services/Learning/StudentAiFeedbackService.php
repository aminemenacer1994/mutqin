<?php

namespace App\Services\Learning;

use App\Models\AiReciteAttempt;
use App\Models\MemorisationAssessment;
use App\Models\TeacherRecitationAssessment;
use App\Models\User;
use App\Support\QuranMetadata;
use App\Support\RecitationAlignmentStatus;

/**
 * Student-facing reading of saved recitation checks.
 * It does not score audio again and does not invent word results.
 */
class StudentAiFeedbackService
{
    /** @var list<string> */
    private const VALID_BANDS = ['strong', 'mixed', 'weak'];

    /** Stored recording states that make word differences unreliable. */
    private const LOW_AUDIO = [
        'noisy',
        'echo',
        'clipping',
        'low_volume',
        'second_speaker',
        'music_or_tv',
        'broken_recording',
        'insufficient_speech',
        'unreliable_recognition',
        'heavy_noise',
        'very_low_volume',
        'severe_clipping',
        'insufficient_usable_speech',
        'multiple_competing_speakers',
    ];

    /**
     * @return array<string, mixed>
     */
    public function presentAttempt(
        AiReciteAttempt $attempt,
        ?MemorisationAssessment $assessment = null,
        ?TeacherRecitationAssessment $review = null,
        ?string $teacherName = null,
    ): array {
        $note = null;
        if ($review) {
            $text = trim((string) $review->annotation);
            if ($text === '') {
                $observations = is_array($review->observations) ? $review->observations : [];
                $text = trim((string) ($observations['published_feedback'] ?? ''));
            }
            $note = $text !== '' ? $text : null;
        }

        return $this->interpret([
            'attempt_id' => (int) $attempt->id,
            'assessment_id' => $attempt->memorisation_assessment_id ? (int) $attempt->memorisation_assessment_id : null,
            'accuracy_percent' => $attempt->accuracy_percent,
            'band' => $attempt->band,
            'word_statuses' => is_array($attempt->word_statuses) ? $attempt->word_statuses : [],
            'ayah_range' => is_array($attempt->ayah_range) ? $attempt->ayah_range : [],
            'session_id' => $attempt->user_session_id ? (int) $attempt->user_session_id : null,
            'assignment_recipient_id' => $attempt->teacher_assignment_recipient_id ? (int) $attempt->teacher_assignment_recipient_id : null,
            'assessment_status' => $assessment?->status,
            'failure_reason' => $assessment?->failure_reason,
            'audio_quality_status' => $this->audioQualityStatus($assessment),
            'teacher_review' => $review ? [
                'teacher_name' => $teacherName,
                'note' => $note,
                'tajweed_score' => $review->tajweed_score,
                'recipient_id' => $attempt->teacher_assignment_recipient_id ? (int) $attempt->teacher_assignment_recipient_id : null,
            ] : null,
        ]);
    }

    /**
     * Ayahs with a wording difference on at least two valid, usable checks.
     * Uncertain-only checks and invalid or low-quality recordings are excluded.
     *
     * @return array<string, mixed>
     */
    public function repeatedAyahs(User $student): array
    {
        $attempts = AiReciteAttempt::query()
            ->where('user_id', $student->id)
            ->validScored()
            ->whereNotNull('memorisation_assessment_id')
            ->whereHas('assessment', fn ($query) => $query->validScored())
            ->with(['assessment:id,status,failure_reason,overall_accuracy,recognition_data'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(200)
            ->get();

        $buckets = [];
        foreach ($attempts as $attempt) {
            $feedback = $this->presentAttempt($attempt, $attempt->assessment);
            if (($feedback['quality'] ?? '') !== 'usable' || ($feedback['valid'] ?? false) !== true) {
                continue;
            }
            $wording = is_array($feedback['wording'] ?? null) ? $feedback['wording'] : [];
            if (($wording['differences_reliable'] ?? false) !== true) {
                continue;
            }
            $links = is_array($feedback['links'] ?? null) ? $feedback['links'] : [];
            $surah = (int) ($links['surah_number'] ?? 0);
            $from = (int) ($links['ayah_start'] ?? 0);
            $to = (int) ($links['ayah_end'] ?? $from);
            if ($surah < 1 || $from < 1) {
                continue;
            }
            $ayahs = $this->differenceAyahs(
                is_array($attempt->word_statuses) ? $attempt->word_statuses : [],
                $from,
                $to,
            );
            foreach ($ayahs as $ayah) {
                $key = $surah.':'.$ayah;
                if (! isset($buckets[$key])) {
                    $buckets[$key] = [
                        'surah_number' => $surah,
                        'ayah_number' => $ayah,
                        'difference_attempts' => 0,
                        'attempt_ids' => [],
                        'session_id' => $links['session_id'] ?? null,
                        'assignment_recipient_id' => $links['assignment_recipient_id'] ?? null,
                    ];
                }
                if (in_array((int) $attempt->id, $buckets[$key]['attempt_ids'], true)) {
                    continue;
                }
                $buckets[$key]['attempt_ids'][] = (int) $attempt->id;
                $buckets[$key]['difference_attempts']++;
            }
        }

        $items = [];
        foreach ($buckets as $bucket) {
            if ((int) $bucket['difference_attempts'] < 2) {
                continue;
            }
            $surah = (int) $bucket['surah_number'];
            $ayah = (int) $bucket['ayah_number'];
            $name = QuranMetadata::name($surah);
            $items[] = [
                'surah_number' => $surah,
                'ayah_number' => $ayah,
                'label' => trim(($name ?: (string) $surah).' · '.$ayah),
                'difference_attempts' => (int) $bucket['difference_attempts'],
                'session_id' => $bucket['session_id'],
                'assignment_recipient_id' => $bucket['assignment_recipient_id'],
                'practice' => [
                    'tool' => 'revise',
                    'surah_number' => $surah,
                    'ayah_start' => $ayah,
                    'ayah_end' => $ayah,
                    'reason' => 'wording_difference',
                ],
            ];
        }

        usort($items, function (array $left, array $right): int {
            return [$right['difference_attempts'], $left['surah_number'], $left['ayah_number']]
                <=> [$left['difference_attempts'], $right['surah_number'], $right['ayah_number']];
        });

        return [
            'source' => 'valid_historical_assessments',
            'authority' => 'ai_suggestion',
            'is_tajweed' => false,
            'items' => array_slice($items, 0, 8),
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function interpret(array $input): array
    {
        $links = $this->links($input);
        $counts = RecitationAlignmentStatus::countStatuses(
            is_array($input['word_statuses'] ?? null) ? $input['word_statuses'] : []
        );
        $evaluated = (int) ($counts['evaluated'] ?? 0);
        $audio = strtolower(trim((string) ($input['audio_quality_status'] ?? '')));
        $lowAudio = $audio !== '' && in_array($audio, self::LOW_AUDIO, true);
        $valid = $this->isValid($input);

        $quality = 'invalid';
        if ($valid && $lowAudio) {
            $quality = 'low';
        } elseif ($valid && $evaluated < 1) {
            $quality = 'incomplete';
        } elseif ($valid) {
            $quality = 'usable';
        }

        $matched = $uncertain = $mismatch = $skipped = null;
        if ($valid && $quality !== 'incomplete' && $counts !== null && $evaluated > 0) {
            $matched = (int) $counts['matched'];
            $uncertain = (int) $counts['uncertain'];
            $mismatch = (int) $counts['mismatch'];
            $skipped = (int) $counts['skipped'];
        }

        $reliable = $quality === 'usable';
        $reason = null;
        if ($quality === 'low') {
            $reason = 'recording';
        } elseif ($quality === 'incomplete') {
            $reason = 'incomplete';
        } elseif ($reliable && ((int) $mismatch + (int) $skipped) > 0) {
            $reason = 'wording_difference';
        } elseif ($reliable && (int) $uncertain > 0) {
            $reason = 'uncertain';
        }

        $percent = null;
        if ($valid && is_numeric($input['accuracy_percent'] ?? null)) {
            $percent = max(0, min(100, (int) $input['accuracy_percent']));
        }

        return [
            'authority' => 'ai_suggestion',
            'is_tajweed' => false,
            'valid' => $valid,
            'quality' => $quality,
            'links' => $links,
            'wording' => [
                'percent' => $percent,
                'matched' => $matched,
                'uncertain' => $uncertain,
                'mismatch' => $mismatch,
                'skipped' => $skipped,
                'differences_reliable' => $reliable,
            ],
            'practice' => $this->practice($links, $reason),
            'teacher_review' => $valid ? $this->teacherReview($input, $links) : null,
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     */
    private function isValid(array $input): bool
    {
        $band = strtolower(trim((string) ($input['band'] ?? '')));
        $status = strtolower(trim((string) ($input['assessment_status'] ?? '')));
        $failure = trim((string) ($input['failure_reason'] ?? ''));
        $accuracy = $input['accuracy_percent'] ?? null;

        return in_array($band, self::VALID_BANDS, true)
            && $accuracy !== null
            && $accuracy !== ''
            && is_numeric($accuracy)
            && ($status === '' || $status === MemorisationAssessment::STATUS_COMPLETED)
            && $failure === '';
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    private function links(array $input): array
    {
        $range = is_array($input['ayah_range'] ?? null) ? $input['ayah_range'] : [];
        $surah = (int) ($range['surah'] ?? $range['surah_number'] ?? 0);
        $start = (int) ($range['from'] ?? $range['start'] ?? $range['ayah_start'] ?? 0);
        $end = (int) ($range['to'] ?? $range['end'] ?? $range['ayah_end'] ?? $start);

        return [
            'attempt_id' => (int) ($input['attempt_id'] ?? 0) ?: null,
            'assessment_id' => (int) ($input['assessment_id'] ?? 0) ?: null,
            'surah_number' => $surah > 0 ? $surah : null,
            'ayah_start' => $start > 0 ? $start : null,
            'ayah_end' => $end > 0 ? $end : null,
            'session_id' => (int) ($input['session_id'] ?? 0) ?: null,
            'assignment_recipient_id' => (int) ($input['assignment_recipient_id'] ?? 0) ?: null,
        ];
    }

    /**
     * @param  array<string, mixed>  $links
     * @return array<string, mixed>|null
     */
    private function practice(array $links, ?string $reason): ?array
    {
        if ($reason === null || ! $links['surah_number'] || ! $links['ayah_start']) {
            return null;
        }

        return [
            'tool' => 'revise',
            'surah_number' => $links['surah_number'],
            'ayah_start' => $links['ayah_start'],
            'ayah_end' => $links['ayah_end'] ?: $links['ayah_start'],
            'reason' => $reason,
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     * @param  array<string, mixed>  $links
     * @return array<string, mixed>|null
     */
    private function teacherReview(array $input, array $links): ?array
    {
        $raw = $input['teacher_review'] ?? null;
        if (! is_array($raw)) {
            return null;
        }
        $score = is_numeric($raw['tajweed_score'] ?? null) ? (int) $raw['tajweed_score'] : null;
        $note = trim((string) ($raw['note'] ?? ''));
        $name = trim((string) ($raw['teacher_name'] ?? ''));
        $recipient = (int) ($raw['recipient_id'] ?? 0) ?: ($links['assignment_recipient_id'] ?? null);

        return [
            'visible' => true,
            'authority' => 'teacher',
            'is_tajweed' => $score !== null,
            'teacher_name' => $name !== '' ? $name : null,
            'note' => $note !== '' ? $note : null,
            'tajweed_score' => $score,
            'recipient_id' => $recipient,
        ];
    }

    private function audioQualityStatus(?MemorisationAssessment $assessment): ?string
    {
        if (! $assessment) {
            return null;
        }
        $data = is_array($assessment->recognition_data) ? $assessment->recognition_data : [];
        $candidates = [
            $data['audio_quality_status'] ?? null,
            is_array($data['calibration'] ?? null) ? ($data['calibration']['audio_quality_status'] ?? null) : null,
            is_array($data['speaker_analysis'] ?? null) ? ($data['speaker_analysis']['status'] ?? null) : null,
        ];
        foreach ($candidates as $candidate) {
            $value = strtolower(trim((string) $candidate));
            if ($value !== '') {
                return $value;
            }
        }

        return null;
    }

    /**
     * Ayahs in this check that have a stored mismatch or skip.
     * Uncertain words are not treated as differences. Words without an ayah
     * are used only when the check covered one ayah.
     *
     * @param  list<mixed>  $words
     * @return list<int>
     */
    private function differenceAyahs(array $words, int $from, int $to): array
    {
        $single = $from > 0 && $to === $from;
        $hits = [];
        foreach ($words as $word) {
            if (! is_array($word)) {
                continue;
            }
            $state = RecitationAlignmentStatus::classify($word);
            if (! in_array($state, [RecitationAlignmentStatus::MISMATCH, RecitationAlignmentStatus::SKIPPED], true)) {
                continue;
            }
            $ayah = (int) ($word['ayah_number'] ?? $word['ayahNumber'] ?? $word['ayah'] ?? 0);
            if ($ayah < 1 && $single) {
                $ayah = $from;
            }
            if ($ayah < 1 || ($from > 0 && $to >= $from && ($ayah < $from || $ayah > $to))) {
                continue;
            }
            $hits[$ayah] = true;
        }

        return array_map('intval', array_keys($hits));
    }
}
