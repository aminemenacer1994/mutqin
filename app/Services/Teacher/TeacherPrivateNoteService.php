<?php

namespace App\Services\Teacher;

use App\Enums\TeacherNoteKind;
use App\Enums\TeacherPrivateNoteCategory;
use App\Models\TeacherAssignment;
use App\Models\TeacherNote;
use App\Models\TeacherPrivateNote;
use App\Models\User;
use App\Services\Organisations\StudentAccessAuthorizer;
use App\Support\QuranMetadata;
use App\Support\TeacherFeatures;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TeacherPrivateNoteService
{
    public const BODY_MAX = 4000;

    public function __construct(
        private readonly StudentAccessAuthorizer $access,
    ) {}

    /**
     * @param  array{q?: string, category?: string, archived?: bool|string|int}  $filters
     * @return array{notes: list<array<string, mixed>>, categories: list<string>, filters: array<string, mixed>}
     */
    public function listForStudent(User $teacher, User $student, array $filters = []): array
    {
        TeacherFeatures::abortUnlessEnabled();
        $this->assertAuthorised($teacher, $student);

        $query = TeacherPrivateNote::query()
            ->where('teacher_id', $teacher->id)
            ->where('student_id', $student->id)
            ->with(['assignment:id,surah_number,ayah_start,ayah_end,kind']);

        $includeArchived = filter_var($filters['archived'] ?? false, FILTER_VALIDATE_BOOL);
        if ($includeArchived) {
            $query->whereNotNull('archived_at');
        } else {
            $query->whereNull('archived_at');
        }

        $category = isset($filters['category']) ? trim((string) $filters['category']) : '';
        if ($category !== '' && in_array($category, TeacherPrivateNoteCategory::values(), true)) {
            $query->where('category', $category);
        }

        $search = isset($filters['q']) ? trim((string) $filters['q']) : '';
        if ($search !== '') {
            $like = '%'.str_replace(['%', '_'], ['\\%', '\\_'], mb_strtolower($search)).'%';
            $query->whereRaw('LOWER(body) LIKE ?', [$like]);
        }

        $notes = $query
            ->orderByDesc('pinned')
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->map(fn (TeacherPrivateNote $note) => $this->present($note))
            ->all();

        $assignmentOptions = TeacherAssignment::query()
            ->where('teacher_id', $teacher->id)
            ->whereHas('recipients', fn ($query) => $query->where('student_id', $student->id))
            ->latest('id')
            ->limit(40)
            ->get(['id', 'surah_number', 'ayah_start', 'ayah_end'])
            ->map(fn (TeacherAssignment $assignment) => [
                'id' => (int) $assignment->id,
                'label' => QuranMetadata::name((int) $assignment->surah_number).' '.$assignment->ayah_start.'–'.$assignment->ayah_end,
            ])
            ->all();

        return [
            'notes' => $notes,
            'categories' => TeacherPrivateNoteCategory::values(),
            'assignment_options' => $assignmentOptions,
            'filters' => [
                'q' => $search,
                'category' => $category !== '' ? $category : null,
                'archived' => $includeArchived,
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     */
    public function create(User $teacher, User $student, array $input): TeacherPrivateNote
    {
        TeacherFeatures::abortUnlessEnabled();
        $this->assertAuthorised($teacher, $student);

        $payload = $this->validatedPayload($teacher, $student, $input);

        $note = new TeacherPrivateNote;
        $note->forceFill([
            'teacher_id' => $teacher->id,
            'student_id' => $student->id,
            'organisation_id' => $teacher->organisation_id,
            ...$payload,
            'pinned' => (bool) ($input['pinned'] ?? false),
            'archived_at' => null,
            'shared_feedback_note_id' => null,
            'shared_at' => null,
        ])->save();

        return $note->fresh(['assignment:id,surah_number,ayah_start,ayah_end,kind']);
    }

    /**
     * @param  array<string, mixed>  $input
     */
    public function update(User $teacher, TeacherPrivateNote $note, array $input): TeacherPrivateNote
    {
        TeacherFeatures::abortUnlessEnabled();
        $this->assertOwns($teacher, $note);

        $student = User::query()->findOrFail($note->student_id);
        $merged = [
            'category' => $input['category'] ?? (
                $note->category instanceof TeacherPrivateNoteCategory
                    ? $note->category->value
                    : (string) $note->category
            ),
            'body' => array_key_exists('body', $input) ? $input['body'] : $note->body,
            'surah_number' => array_key_exists('surah_number', $input) ? $input['surah_number'] : $note->surah_number,
            'ayah_start' => array_key_exists('ayah_start', $input) ? $input['ayah_start'] : $note->ayah_start,
            'ayah_end' => array_key_exists('ayah_end', $input) ? $input['ayah_end'] : $note->ayah_end,
            'teacher_assignment_id' => array_key_exists('teacher_assignment_id', $input)
                ? $input['teacher_assignment_id']
                : $note->teacher_assignment_id,
        ];
        $payload = $this->validatedPayload($teacher, $student, $merged, requireBody: true);

        if (array_key_exists('body', $input)) {
            $note->body = $payload['body'];
        }
        if (array_key_exists('category', $input)) {
            $note->category = $payload['category'];
        }
        if (array_key_exists('pinned', $input)) {
            $note->pinned = (bool) $input['pinned'];
        }
        if (
            array_key_exists('surah_number', $input)
            || array_key_exists('ayah_start', $input)
            || array_key_exists('ayah_end', $input)
            || array_key_exists('teacher_assignment_id', $input)
        ) {
            $note->surah_number = $payload['surah_number'];
            $note->ayah_start = $payload['ayah_start'];
            $note->ayah_end = $payload['ayah_end'];
            $note->teacher_assignment_id = $payload['teacher_assignment_id'];
        }

        $note->save();

        return $note->fresh(['assignment:id,surah_number,ayah_start,ayah_end,kind']);
    }

    public function archive(User $teacher, TeacherPrivateNote $note): TeacherPrivateNote
    {
        TeacherFeatures::abortUnlessEnabled();
        $this->assertOwns($teacher, $note);

        $note->forceFill([
            'archived_at' => now(),
            'pinned' => false,
        ])->save();

        return $note->fresh(['assignment:id,surah_number,ayah_start,ayah_end,kind']);
    }

    public function unarchive(User $teacher, TeacherPrivateNote $note): TeacherPrivateNote
    {
        TeacherFeatures::abortUnlessEnabled();
        $this->assertOwns($teacher, $note);

        $note->forceFill(['archived_at' => null])->save();

        return $note->fresh(['assignment:id,surah_number,ayah_start,ayah_end,kind']);
    }

    public function delete(User $teacher, TeacherPrivateNote $note): void
    {
        TeacherFeatures::abortUnlessEnabled();
        $this->assertOwns($teacher, $note);
        $note->delete();
    }

    /**
     * Explicit share action: copies selected feedback into the student-visible
     * TeacherNote feedback channel. The private note itself stays private.
     */
    public function shareWithStudent(User $teacher, TeacherPrivateNote $note, ?string $bodyOverride = null): TeacherPrivateNote
    {
        TeacherFeatures::abortUnlessEnabled();
        $this->assertOwns($teacher, $note);

        $student = User::query()->findOrFail($note->student_id);
        $body = trim((string) ($bodyOverride ?? $note->body));
        if ($body === '' || mb_strlen($body) > 2000) {
            throw ValidationException::withMessages([
                'body' => 'Enter feedback of up to 2000 characters to share.',
            ]);
        }

        return DB::transaction(function () use ($teacher, $student, $note, $body) {
            $feedback = new TeacherNote;
            $feedback->forceFill([
                'teacher_id' => $teacher->id,
                'student_id' => $student->id,
                'organisation_id' => $teacher->organisation_id,
                'teacher_assignment_id' => $note->teacher_assignment_id,
                'surah_number' => $note->surah_number,
                'ayah_start' => $note->ayah_start,
                'ayah_end' => $note->ayah_end,
                'kind' => TeacherNoteKind::Feedback->value,
                'body' => $body,
            ])->save();

            $note->forceFill([
                'shared_feedback_note_id' => $feedback->id,
                'shared_at' => now(),
            ])->save();

            return $note->fresh(['assignment:id,surah_number,ayah_start,ayah_end,kind']);
        });
    }

    /**
     * Permanently remove soft-deleted notes and archived notes past retention.
     */
    public function purgeExpired(?int $archivedDays = null, ?int $deletedDays = null): int
    {
        $archivedDays ??= (int) config('mutqin.teacher_private_notes.archive_purge_days', 365);
        $deletedDays ??= (int) config('mutqin.teacher_private_notes.soft_delete_purge_days', 30);
        $removed = 0;

        if ($archivedDays > 0) {
            $cutoff = Carbon::now()->subDays($archivedDays);
            $removed += TeacherPrivateNote::query()
                ->whereNotNull('archived_at')
                ->where('archived_at', '<=', $cutoff)
                ->forceDelete();
        }

        if ($deletedDays > 0) {
            $cutoff = Carbon::now()->subDays($deletedDays);
            $removed += TeacherPrivateNote::onlyTrashed()
                ->where('deleted_at', '<=', $cutoff)
                ->forceDelete();
        }

        return $removed;
    }

    /**
     * @return array<string, mixed>
     */
    public function present(TeacherPrivateNote $note): array
    {
        $category = $note->category instanceof TeacherPrivateNoteCategory
            ? $note->category->value
            : (string) $note->category;

        $passage = null;
        if ($note->surah_number) {
            $passage = [
                'surah_number' => (int) $note->surah_number,
                'surah_name' => QuranMetadata::name((int) $note->surah_number),
                'ayah_start' => (int) ($note->ayah_start ?: 1),
                'ayah_end' => (int) ($note->ayah_end ?: $note->ayah_start ?: 1),
            ];
        }

        $assignment = null;
        if ($note->teacher_assignment_id) {
            $row = $note->assignment;
            $assignment = [
                'id' => (int) $note->teacher_assignment_id,
                'label' => $row
                    ? QuranMetadata::name((int) $row->surah_number).' '.$row->ayah_start.'–'.$row->ayah_end
                    : '#'.$note->teacher_assignment_id,
            ];
        }

        return [
            'id' => (int) $note->id,
            'category' => $category,
            'body' => (string) $note->body,
            'pinned' => (bool) $note->pinned,
            'archived' => $note->isArchived(),
            'archived_at' => $note->archived_at?->toIso8601String(),
            'passage' => $passage,
            'assignment' => $assignment,
            'shared' => $note->isShared(),
            'shared_at' => $note->shared_at?->toIso8601String(),
            'shared_feedback_note_id' => $note->shared_feedback_note_id
                ? (int) $note->shared_feedback_note_id
                : null,
            'author' => [
                'id' => (int) $note->teacher_id,
            ],
            'created_at' => $note->created_at?->toIso8601String(),
            'updated_at' => $note->updated_at?->toIso8601String(),
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array{
     *     category: string,
     *     body: string,
     *     surah_number: ?int,
     *     ayah_start: ?int,
     *     ayah_end: ?int,
     *     teacher_assignment_id: ?int
     * }
     */
    private function validatedPayload(User $teacher, User $student, array $input, bool $requireBody = true): array
    {
        $category = TeacherPrivateNoteCategory::tryFrom((string) ($input['category'] ?? ''));
        if ($category === null) {
            throw ValidationException::withMessages([
                'category' => 'Choose a valid note category.',
            ]);
        }

        $body = trim((string) ($input['body'] ?? ''));
        if ($requireBody && ($body === '' || mb_strlen($body) > self::BODY_MAX)) {
            throw ValidationException::withMessages([
                'body' => 'Enter a note of up to '.self::BODY_MAX.' characters.',
            ]);
        }
        if (! $requireBody && $body !== '' && mb_strlen($body) > self::BODY_MAX) {
            throw ValidationException::withMessages([
                'body' => 'Enter a note of up to '.self::BODY_MAX.' characters.',
            ]);
        }

        $assignmentId = isset($input['teacher_assignment_id']) && $input['teacher_assignment_id'] !== ''
            ? (int) $input['teacher_assignment_id']
            : null;
        $surahNumber = isset($input['surah_number']) && $input['surah_number'] !== ''
            ? (int) $input['surah_number']
            : null;
        $ayahStart = isset($input['ayah_start']) && $input['ayah_start'] !== ''
            ? (int) $input['ayah_start']
            : null;
        $ayahEnd = isset($input['ayah_end']) && $input['ayah_end'] !== ''
            ? (int) $input['ayah_end']
            : null;

        if ($assignmentId !== null) {
            $assignment = TeacherAssignment::query()
                ->whereKey($assignmentId)
                ->where('teacher_id', $teacher->id)
                ->whereHas('recipients', fn ($query) => $query->where('student_id', $student->id))
                ->first();
            if ($assignment === null) {
                abort(404);
            }
            $surahNumber ??= (int) $assignment->surah_number;
            $ayahStart ??= (int) $assignment->ayah_start;
            $ayahEnd ??= (int) $assignment->ayah_end;
        }

        if ($surahNumber !== null) {
            if ($surahNumber < 1 || $surahNumber > 114) {
                throw ValidationException::withMessages([
                    'surah_number' => 'Choose a valid surah.',
                ]);
            }
            $maxAyah = QuranMetadata::ayahCount($surahNumber) ?? 0;
            $ayahStart ??= 1;
            $ayahEnd = max($ayahStart, $ayahEnd ?? $ayahStart);
            if ($maxAyah < 1 || $ayahStart < 1 || $ayahStart > $maxAyah || $ayahEnd > $maxAyah) {
                throw ValidationException::withMessages([
                    'ayah_start' => 'Choose a valid ayah range for this surah.',
                ]);
            }
        } else {
            $ayahStart = null;
            $ayahEnd = null;
        }

        return [
            'category' => $category->value,
            'body' => $body,
            'surah_number' => $surahNumber,
            'ayah_start' => $ayahStart,
            'ayah_end' => $ayahEnd,
            'teacher_assignment_id' => $assignmentId,
        ];
    }

    private function assertAuthorised(User $teacher, User $student): void
    {
        if (! $this->access->allows($teacher, $student)) {
            abort(404);
        }
    }

    private function assertOwns(User $teacher, TeacherPrivateNote $note): void
    {
        if ((int) $note->teacher_id !== (int) $teacher->id) {
            abort(404);
        }

        $student = User::query()->find($note->student_id);
        if ($student === null || ! $this->access->allows($teacher, $student)) {
            abort(404);
        }
    }
}
