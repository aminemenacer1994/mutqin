<?php

namespace App\Http\Requests\Memorisation;

use App\Models\MemorisationAssessment;
use App\Models\SessionRecommendation;
use App\Models\UserSession;
use Illuminate\Validation\Validator;

trait ValidatesOwnedAssessmentForeignKeys
{
    protected function validateOwnedAssessmentForeignKeys(Validator $validator): void
    {
        $user = $this->user();
        if (! $user) {
            return;
        }

        $sessionId = $this->input('user_session_id');
        if ($sessionId !== null && $sessionId !== '') {
            $owns = UserSession::query()
                ->where('user_id', $user->id)
                ->whereKey((int) $sessionId)
                ->exists();
            if (! $owns) {
                $validator->errors()->add('user_session_id', 'The selected session is invalid.');
            }
        }

        $recommendationId = $this->input('session_recommendation_id');
        if ($recommendationId !== null && $recommendationId !== '') {
            $owns = SessionRecommendation::query()
                ->where('user_id', $user->id)
                ->whereKey((int) $recommendationId)
                ->exists();
            if (! $owns) {
                $validator->errors()->add('session_recommendation_id', 'The selected recommendation is invalid.');
            }
        }

        $previousId = $this->input('previous_assessment_id');
        if ($previousId !== null && $previousId !== '') {
            $owns = MemorisationAssessment::query()
                ->where('user_id', $user->id)
                ->whereKey((int) $previousId)
                ->exists();
            if (! $owns) {
                $validator->errors()->add('previous_assessment_id', 'The selected assessment is invalid.');
            }
        }
    }
}
