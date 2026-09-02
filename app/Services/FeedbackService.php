<?php

namespace App\Services;

use App\Models\AiReciteAttempt;
use App\Models\Feedback;
use App\Models\MemorisationAssessment;
use App\Models\SessionRecommendation;
use App\Models\User;
use App\Support\UserFilesDisk;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class FeedbackService
{
    private const SCREENSHOT_MAX_KB = 5120;

    private const SCREENSHOT_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    /**
     * @param  array<string, mixed>  $payload
     */
    public function store(User $user, array $payload, ?UploadedFile $screenshot = null): Feedback
    {
        $type = (string) ($payload['type'] ?? '');
        $message = trim((string) ($payload['message'] ?? ''));
        $clientContext = is_array($payload['context'] ?? null) ? $payload['context'] : [];
        $aiCheckId = isset($payload['ai_check_id']) ? (int) $payload['ai_check_id'] : null;
        $aiCheckSource = isset($payload['ai_check_source']) ? (string) $payload['ai_check_source'] : null;
        $aiReason = isset($payload['ai_reason']) ? (string) $payload['ai_reason'] : null;

        if ($aiCheckId !== null && $aiCheckId <= 0) {
            $aiCheckId = null;
            $aiCheckSource = null;
        }

        if ($aiCheckId !== null) {
            $this->assertOwnedAiCheck($user, $aiCheckId, $aiCheckSource);
        } else {
            $aiCheckSource = null;
            $aiReason = null;
        }

        if ($type === Feedback::TYPE_AI_RECITATION && $aiCheckId === null) {
            $aiCheckId = $this->resolveAiCheckFromContext($user, $clientContext);
            if ($aiCheckId !== null) {
                $aiCheckSource = $aiCheckSource ?: Feedback::AI_CHECK_AI_RECITE;
            }
        }

        if ($type === Feedback::TYPE_AI_RECITATION && $aiCheckId === null) {
            throw ValidationException::withMessages([
                'ai_check_id' => [__('feedback.ai_check_required')],
            ]);
        }

        if ($type !== Feedback::TYPE_AI_RECITATION) {
            $aiReason = null;
        } elseif ($aiReason !== null && $aiReason !== '' && ! in_array($aiReason, Feedback::AI_REASONS, true)) {
            throw ValidationException::withMessages([
                'ai_reason' => [__('feedback.ai_reason_invalid')],
            ]);
        }

        $context = $this->buildSafeContext($user, $clientContext);

        if ($type === Feedback::TYPE_AI_RECITATION && $aiCheckId !== null) {
            $duplicate = Feedback::query()
                ->where('user_id', $user->id)
                ->where('type', Feedback::TYPE_AI_RECITATION)
                ->where('ai_check_id', $aiCheckId)
                ->where('ai_check_source', $aiCheckSource)
                ->exists();

            if ($duplicate) {
                throw ValidationException::withMessages([
                    'ai_check_id' => [__('feedback.duplicate_ai_complaint')],
                ]);
            }
        }

        $feedback = DB::transaction(function () use ($user, $type, $message, $context, $aiCheckId, $aiCheckSource, $aiReason, $screenshot) {
            $feedback = Feedback::query()->create([
                'user_id' => $user->id,
                'type' => $type,
                'message' => $message,
                'status' => Feedback::STATUS_NEW,
                'context' => $context,
                'ai_check_id' => $aiCheckId,
                'ai_check_source' => $aiCheckSource,
                'ai_reason' => $aiReason ?: null,
            ]);

            if ($screenshot !== null) {
                $feedback->forceFill([
                    'screenshot_path' => $this->storeScreenshot($feedback, $screenshot),
                ])->save();
            }

            return $feedback->fresh(['user:id,name,email']);
        });

        AdminDashboardService::invalidateCaches();

        return $feedback;
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array{items: list<array<string, mixed>>, total: int, page: int, per_page: int, total_pages: int}
     */
    public function adminList(array $filters = []): array
    {
        $status = (string) ($filters['status'] ?? '');
        $type = (string) ($filters['type'] ?? '');
        $search = trim((string) ($filters['q'] ?? ''));
        $dateFrom = (string) ($filters['date_from'] ?? '');
        $dateTo = (string) ($filters['date_to'] ?? '');
        $page = max(1, (int) ($filters['page'] ?? 1));
        $perPage = min(50, max(10, (int) ($filters['per_page'] ?? 20)));

        $query = Feedback::query()->with(['user:id,name,email']);

        if ($status !== '' && in_array($status, Feedback::STATUSES, true)) {
            $query->where('status', $status);
        }

        if ($type !== '' && in_array($type, Feedback::TYPES, true)) {
            $query->where('type', $type);
        }

        if ($search !== '') {
            $query->where(function ($inner) use ($search) {
                $inner->where('message', 'like', '%'.$search.'%')
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('name', 'like', '%'.$search.'%')
                            ->orWhere('email', 'like', '%'.$search.'%');
                    });
            });
        }

        if ($dateFrom !== '') {
            $query->whereDate('created_at', '>=', $dateFrom);
        }

        if ($dateTo !== '') {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        $total = (clone $query)->count();
        $totalPages = max(1, (int) ceil($total / $perPage));
        if ($page > $totalPages) {
            $page = $totalPages;
        }

        $rows = $query
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->forPage($page, $perPage)
            ->get();

        return [
            'items' => $rows->map(fn (Feedback $row) => $this->serializeAdminRow($row))->values()->all(),
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'total_pages' => $totalPages,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function adminShow(Feedback $feedback): array
    {
        $feedback->loadMissing(['user:id,name,email']);

        $payload = $this->serializeAdminRow($feedback, true);
        $payload['admin_note'] = $feedback->admin_note;
        $payload['screenshot_url'] = $feedback->screenshot_path
            ? route('api.admin.feedback.screenshot', $feedback)
            : null;
        $payload['related_ai_check'] = $this->resolveRelatedAiCheck($feedback);

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    public function updateAdmin(Feedback $feedback, array $payload): array
    {
        $updates = [];

        if (array_key_exists('status', $payload)) {
            $status = (string) $payload['status'];
            if (! in_array($status, Feedback::STATUSES, true)) {
                throw ValidationException::withMessages([
                    'status' => [__('feedback.status_invalid')],
                ]);
            }
            $updates['status'] = $status;
        }

        if (array_key_exists('admin_note', $payload)) {
            $note = trim((string) ($payload['admin_note'] ?? ''));
            $updates['admin_note'] = $note !== '' ? $note : null;
        }

        if ($updates !== []) {
            $feedback->forceFill($updates)->save();
            AdminDashboardService::invalidateCaches();
        }

        return $this->adminShow($feedback->fresh(['user:id,name,email']));
    }

    public function destroyAdmin(Feedback $feedback): void
    {
        $screenshotPath = $feedback->screenshot_path;

        $feedback->delete();

        if (is_string($screenshotPath) && $screenshotPath !== '' && UserFilesDisk::disk()->exists($screenshotPath)) {
            UserFilesDisk::disk()->delete($screenshotPath);
        }

        AdminDashboardService::invalidateCaches();
    }

    /**
     * @return array{complaints: int, valid_checks: int, complaint_rate_percent: float|null}
     */
    public function aiComplaintMetrics(): array
    {
        $complaints = Feedback::query()->aiRecitationComplaints()->count();

        $assessmentChecks = MemorisationAssessment::query()->validScored()->count();
        $reciteChecks = AiReciteAttempt::query()->validScored()->count();
        $validChecks = $assessmentChecks + $reciteChecks;

        return [
            'complaints' => $complaints,
            'valid_checks' => $validChecks,
            'complaint_rate_percent' => $validChecks > 0
                ? round(($complaints / $validChecks) * 100, 2)
                : null,
        ];
    }

    public function screenshotContents(Feedback $feedback): ?array
    {
        if (! $feedback->screenshot_path || ! UserFilesDisk::disk()->exists($feedback->screenshot_path)) {
            return null;
        }

        $mime = UserFilesDisk::disk()->mimeType($feedback->screenshot_path) ?: 'application/octet-stream';

        return [
            'contents' => UserFilesDisk::disk()->get($feedback->screenshot_path),
            'mime' => $mime,
        ];
    }

    private function storeScreenshot(Feedback $feedback, UploadedFile $file): string
    {
        $mime = (string) $file->getMimeType();
        if (! in_array($mime, self::SCREENSHOT_MIMES, true)) {
            throw ValidationException::withMessages([
                'screenshot' => [__('feedback.screenshot_invalid')],
            ]);
        }

        if ($file->getSize() > self::SCREENSHOT_MAX_KB * 1024) {
            throw ValidationException::withMessages([
                'screenshot' => [__('feedback.screenshot_too_large')],
            ]);
        }

        $extension = match ($mime) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
            default => 'bin',
        };

        $filename = sprintf('%s/%d-%s.%s', UserFilesDisk::screenshotPrefix(), $feedback->id, Str::uuid(), $extension);
        UserFilesDisk::disk()->put($filename, file_get_contents($file->getRealPath()));

        return $filename;
    }

    /**
     * @param  array<string, mixed>  $clientContext
     * @return array<string, mixed>
     */
    private function buildSafeContext(User $user, array $clientContext): array
    {
        $blockedKeys = [
            'password', 'token', 'csrf', 'authorization', 'cookie', 'secret',
            'transcript', 'recording', 'audio', 'microphone', 'word_results',
            'recognition_data', 'word_statuses', 'weak_words',
        ];

        $safeClient = [];
        foreach ($clientContext as $key => $value) {
            $normalized = strtolower((string) $key);
            if (in_array($normalized, $blockedKeys, true)) {
                continue;
            }
            if (is_scalar($value) || $value === null) {
                $safeClient[$key] = $value;
            } elseif (is_array($value)) {
                $encoded = json_encode($value);
                if ($encoded !== false && strlen($encoded) <= 500) {
                    $safeClient[$key] = $value;
                }
            }
        }

        return array_merge($safeClient, [
            'user_id' => (int) $user->id,
            'locale' => $user->locale,
            'theme' => $user->theme,
            'submitted_at' => now()->toIso8601String(),
            'app_build' => (string) config('error_tracking.asset_build', 'unknown'),
        ]);
    }

    private function assertOwnedAiCheck(User $user, int $aiCheckId, ?string $source): void
    {
        if ($source === Feedback::AI_CHECK_ASSESSMENT) {
            $owned = MemorisationAssessment::query()
                ->whereKey($aiCheckId)
                ->where('user_id', $user->id)
                ->exists();
        } elseif ($source === Feedback::AI_CHECK_AI_RECITE) {
            $owned = AiReciteAttempt::query()
                ->whereKey($aiCheckId)
                ->where('user_id', $user->id)
                ->exists();
        } else {
            throw ValidationException::withMessages([
                'ai_check_source' => [__('feedback.ai_check_source_invalid')],
            ]);
        }

        if (! $owned) {
            throw ValidationException::withMessages([
                'ai_check_id' => [__('feedback.ai_check_not_found')],
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $clientContext
     */
    private function resolveAiCheckFromContext(User $user, array $clientContext): ?int
    {
        $recommendationId = (int) ($clientContext['recommendation_id'] ?? 0);
        if ($recommendationId <= 0) {
            return null;
        }

        $owned = SessionRecommendation::query()
            ->whereKey($recommendationId)
            ->where('user_id', $user->id)
            ->exists();
        if (! $owned) {
            return null;
        }

        $attempt = AiReciteAttempt::query()
            ->where('user_id', $user->id)
            ->where('session_recommendation_id', $recommendationId)
            ->orderByDesc('id')
            ->first();

        return $attempt ? (int) $attempt->id : null;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeAdminRow(Feedback $feedback, bool $full = false): array
    {
        $context = is_array($feedback->context) ? $feedback->context : [];
        $preview = Str::limit(trim($feedback->message), $full ? 10000 : 120);

        return [
            'id' => (int) $feedback->id,
            'type' => $feedback->type,
            'message' => $full ? $feedback->message : $preview,
            'message_preview' => Str::limit(trim($feedback->message), 120),
            'status' => $feedback->status,
            'user' => [
                'id' => (int) ($feedback->user?->id ?? $feedback->user_id),
                'name' => (string) ($feedback->user?->name ?? ''),
                'email' => (string) ($feedback->user?->email ?? ''),
            ],
            'route' => (string) ($context['route'] ?? $context['page'] ?? ''),
            'device' => (string) ($context['device'] ?? $context['browser'] ?? ''),
            'language' => (string) ($context['language'] ?? $context['locale'] ?? ''),
            'theme' => (string) ($context['theme'] ?? ''),
            'mushaf_layout' => (string) ($context['mushaf_layout'] ?? ''),
            'context' => $context,
            'ai_check_id' => $feedback->ai_check_id,
            'ai_check_source' => $feedback->ai_check_source,
            'ai_reason' => $feedback->ai_reason,
            'has_screenshot' => $feedback->screenshot_path !== null,
            'created_at' => $feedback->created_at?->toIso8601String(),
            'updated_at' => $feedback->updated_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function resolveRelatedAiCheck(Feedback $feedback): ?array
    {
        if ($feedback->ai_check_id === null || $feedback->ai_check_source === null) {
            return null;
        }

        if ($feedback->ai_check_source === Feedback::AI_CHECK_ASSESSMENT) {
            $check = MemorisationAssessment::query()->find($feedback->ai_check_id);
            if (! $check) {
                return null;
            }

            return [
                'source' => Feedback::AI_CHECK_ASSESSMENT,
                'id' => (int) $check->id,
                'surah_number' => $check->surah_number,
                'start_ayah' => $check->start_ayah,
                'end_ayah' => $check->end_ayah,
                'overall_accuracy' => $check->overall_accuracy,
                'status' => $check->status,
                'completed_at' => $check->completed_at?->toIso8601String(),
            ];
        }

        $attempt = AiReciteAttempt::query()->find($feedback->ai_check_id);
        if (! $attempt) {
            return null;
        }

        return [
            'source' => Feedback::AI_CHECK_AI_RECITE,
            'id' => (int) $attempt->id,
            'accuracy_percent' => $attempt->accuracy_percent,
            'band' => $attempt->band,
            'ayah_range' => $attempt->ayah_range,
            'created_at' => $attempt->created_at?->toIso8601String(),
        ];
    }
}
