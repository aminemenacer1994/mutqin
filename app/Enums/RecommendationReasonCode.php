<?php

namespace App\Enums;

enum RecommendationReasonCode: string
{
    case StrongPreviousPerformance = 'strong_previous_performance';
    case ContinueCurrentSurah = 'continue_current_surah';
    case ContinueWhileFresh = 'continue_while_fresh';
    case RevisionRequired = 'revision_required';
    case NeedsMorePractice = 'needs_more_practice';
    case DifficultAyahDetected = 'difficult_ayah_detected';
    case CompleteRemainingAyat = 'complete_remaining_ayat';
    case SurahCompleted = 'surah_completed';
    case ResumeIncompleteSession = 'resume_incomplete_session';
    case ReinforceRecentRange = 'reinforce_recent_range';
    case LearningPlanComplete = 'learning_plan_complete';
    case ManualFallback = 'manual_fallback';
    case AiReciteStrong = 'ai_recite_strong';
    case AiReciteMixed = 'ai_recite_mixed';
    case AiReciteWeak = 'ai_recite_weak';
    case ConfidenceConfident = 'confidence_confident';
    case ConfidenceNeedsPractice = 'confidence_needs_practice';
}
