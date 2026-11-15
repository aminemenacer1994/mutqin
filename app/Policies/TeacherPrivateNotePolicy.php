<?php

namespace App\Policies;

use App\Models\TeacherPrivateNote;
use App\Models\User;
use App\Services\Organisations\StudentAccessAuthorizer;

/**
 * Private notes are author-only. Sharing a student with another teacher never
 * grants access to these rows — only the owning teacher may view or mutate them,
 * and only while StudentAccessAuthorizer still allows that student.
 */
class TeacherPrivateNotePolicy
{
    public function __construct(
        private readonly StudentAccessAuthorizer $access,
    ) {}

    public function view(User $user, TeacherPrivateNote $note): bool
    {
        return $this->ownsAndMayAccessStudent($user, $note);
    }

    public function update(User $user, TeacherPrivateNote $note): bool
    {
        return $this->ownsAndMayAccessStudent($user, $note);
    }

    public function delete(User $user, TeacherPrivateNote $note): bool
    {
        return $this->ownsAndMayAccessStudent($user, $note);
    }

    public function share(User $user, TeacherPrivateNote $note): bool
    {
        return $this->ownsAndMayAccessStudent($user, $note);
    }

    private function ownsAndMayAccessStudent(User $user, TeacherPrivateNote $note): bool
    {
        if ((int) $user->id !== (int) $note->teacher_id) {
            return false;
        }

        $student = $note->relationLoaded('student')
            ? $note->student
            : User::query()->find($note->student_id);

        if ($student === null) {
            return false;
        }

        return $this->access->allows($user, $student);
    }
}
