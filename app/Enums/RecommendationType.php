<?php

namespace App\Enums;

enum RecommendationType: string
{
    case Continue = 'continue';
    case ContinueNextRange = 'continue_next_range';
    case Revision = 'revision';
    case RepeatCurrentRange = 'repeat_current_range';
    case CompleteSurah = 'complete_surah';
    case SurahComplete = 'surah_complete';
    case NextSurah = 'next_surah';
    case PlanComplete = 'plan_complete';
    case TestWithAiRecite = 'test_with_ai_recite';
    case Resume = 'resume';
    case ManualSelection = 'manual_selection';
    case ChooseNewSession = 'choose_new_session';
    case NoRecommendation = 'no_recommendation';

    public function isActionable(): bool
    {
        return ! in_array($this, [
            self::ManualSelection,
            self::ChooseNewSession,
            self::NoRecommendation,
            self::PlanComplete,
            self::SurahComplete,
            self::TestWithAiRecite,
        ], true);
    }

    public function sessionMode(): string
    {
        return match ($this) {
            self::Revision, self::RepeatCurrentRange, self::Resume => 'revision',
            self::NextSurah, self::Continue, self::ContinueNextRange, self::CompleteSurah => 'new_learning',
            default => 'manual',
        };
    }

    public function isRepeat(): bool
    {
        return in_array($this, [self::Revision, self::RepeatCurrentRange], true);
    }

    public function isContinue(): bool
    {
        return in_array($this, [self::Continue, self::ContinueNextRange, self::CompleteSurah], true);
    }
}
