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

    // Adaptive memorisation check evidence
    case SessionIncomplete = 'session_incomplete';
    case LowRecall = 'low_recall';
    case SequenceErrors = 'sequence_errors';
    case HighHintDependency = 'high_hint_dependency';
    case VisualDependency = 'visual_dependency';
    case AudioDependency = 'audio_dependency';
    case SpokenHesitation = 'spoken_hesitation';
    case OmissionErrors = 'omission_errors';
    case SimilarAyahConfusion = 'similar_ayah_confusion';
    case LowDelayedRetention = 'low_delayed_retention';
    case HighPerformance = 'high_performance';
    case LowConfidence = 'low_confidence';
    case Overconfidence = 'overconfidence';
    case ReviewOverdue = 'review_overdue';
    case AdaptiveCheckStrong = 'adaptive_check_strong';
    case AdaptiveCheckMixed = 'adaptive_check_mixed';
    case AdaptiveCheckWeak = 'adaptive_check_weak';
}
