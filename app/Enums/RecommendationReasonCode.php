<?php

namespace App\Enums;

enum RecommendationReasonCode: string
{
    case StrongPreviousPerformance = 'strong_previous_performance';
    case ContinueCurrentSurah = 'continue_current_surah';
    case RevisionRequired = 'revision_required';
    case DifficultAyahDetected = 'difficult_ayah_detected';
    case CompleteRemainingAyat = 'complete_remaining_ayat';
    case SurahCompleted = 'surah_completed';
    case ResumeIncompleteSession = 'resume_incomplete_session';
    case ReinforceRecentRange = 'reinforce_recent_range';
    case LearningPlanComplete = 'learning_plan_complete';
    case ManualFallback = 'manual_fallback';
}
