<?php

namespace App\Enums;

enum RecommendationType: string
{
    case Continue = 'continue';
    case Revision = 'revision';
    case CompleteSurah = 'complete_surah';
    case NextSurah = 'next_surah';
    case Resume = 'resume';
    case ManualSelection = 'manual_selection';
    case NoRecommendation = 'no_recommendation';

    public function isActionable(): bool
    {
        return ! in_array($this, [self::ManualSelection, self::NoRecommendation], true);
    }

    public function sessionMode(): string
    {
        return match ($this) {
            self::Revision, self::Resume => 'revision',
            self::NextSurah, self::Continue, self::CompleteSurah => 'new_learning',
            default => 'manual',
        };
    }
}
