<?php

namespace App\Policies;

use App\Models\StudentImportBatch;
use App\Models\User;
use App\Support\TeacherFeatures;

class StudentImportBatchPolicy
{
    public function view(User $user, StudentImportBatch $batch): bool
    {
        if (! TeacherFeatures::enabled()) {
            return false;
        }

        if ($user->organisation_id === null || (int) $user->organisation_id !== (int) $batch->organisation_id) {
            return false;
        }

        return (int) $batch->initiated_by_user_id === (int) $user->id
            || app(LearningGroupPolicy::class)->manage($user, $batch->learningGroup);
    }

    public function manage(User $user, StudentImportBatch $batch): bool
    {
        return $this->view($user, $batch)
            && app(LearningGroupPolicy::class)->manage($user, $batch->learningGroup);
    }
}