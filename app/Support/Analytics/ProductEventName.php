<?php

namespace App\Support\Analytics;

/** Allow-listed product events. Names match docs/product-events.md. */
final class ProductEventName
{
    public const LANDING_PAGE_VIEWED = 'landing_page_viewed';

    public const SIGNUP_STARTED = 'signup_started';

    public const SIGNUP_COMPLETED = 'signup_completed';

    public const ONBOARDING_STARTED = 'onboarding_started';

    public const ONBOARDING_STEP_VIEWED = 'onboarding_step_viewed';

    public const ONBOARDING_STEP_COMPLETED = 'onboarding_step_completed';

    public const ONBOARDING_ABANDONED = 'onboarding_abandoned';

    public const ONBOARDING_COMPLETED = 'onboarding_completed';

    public const SESSION_STARTED = 'session_started';

    public const SESSION_COMPLETED = 'session_completed';

    public const SESSION_ABANDONED = 'session_abandoned';

    public const PROGRESSIVE_HIDING_USED = 'progressive_hiding_used';

    public const AI_RECITE_STARTED = 'ai_recite_started';

    public const AI_RECITE_COMPLETED = 'ai_recite_completed';

    public const REVISION_STARTED = 'revision_started';

    public const REVISION_COMPLETED = 'revision_completed';

    public const RECOMMENDATION_FOLLOWED = 'recommendation_followed';

    public const USER_RETURNED = 'user_returned';

    public const REFERRAL_LINK_OPENED = 'referral_link_opened';

    public const REFERRAL_SIGNUP_COMPLETED = 'referral_signup_completed';

    public const TUTORIAL_PLAYED = 'tutorial_played';

    public const TUTORIAL_COMPLETED = 'tutorial_completed';

    public const FEEDBACK_SUBMITTED = 'feedback_submitted';

    public const DAILY_MUTQIN_STARTED = 'daily_mutqin_started';

    public const DAILY_MUTQIN_STEP_VIEWED = 'daily_mutqin_step_viewed';

    public const DAILY_MUTQIN_COMPLETED = 'daily_mutqin_completed';

    public const ACHIEVEMENT_UNLOCKED = 'achievement_unlocked';

    public const ACHIEVEMENT_VIEWED = 'achievement_viewed';

    public const ACHIEVEMENT_PROGRESS_VIEWED = 'achievement_progress_viewed';

    /**
     * Events the browser may submit. Completion of accounts, sessions,
     * assessments, recommendations, and feedback is recorded on the server.
     *
     * @return list<string>
     */
    public static function clientEvents(): array
    {
        return [
            self::LANDING_PAGE_VIEWED,
            self::SIGNUP_STARTED,
            self::ONBOARDING_STARTED,
            self::ONBOARDING_STEP_VIEWED,
            self::ONBOARDING_STEP_COMPLETED,
            self::ONBOARDING_ABANDONED,
            self::ONBOARDING_COMPLETED,
            self::PROGRESSIVE_HIDING_USED,
            self::AI_RECITE_STARTED,
            self::REFERRAL_LINK_OPENED,
            self::TUTORIAL_PLAYED,
            self::TUTORIAL_COMPLETED,
            self::DAILY_MUTQIN_STARTED,
            self::DAILY_MUTQIN_STEP_VIEWED,
            self::DAILY_MUTQIN_COMPLETED,
            self::ACHIEVEMENT_VIEWED,
            self::ACHIEVEMENT_PROGRESS_VIEWED,
        ];
    }

    /**
     * @return list<string>
     */
    public static function all(): array
    {
        return [
            self::LANDING_PAGE_VIEWED,
            self::SIGNUP_STARTED,
            self::SIGNUP_COMPLETED,
            self::ONBOARDING_STARTED,
            self::ONBOARDING_STEP_VIEWED,
            self::ONBOARDING_STEP_COMPLETED,
            self::ONBOARDING_ABANDONED,
            self::ONBOARDING_COMPLETED,
            self::SESSION_STARTED,
            self::SESSION_COMPLETED,
            self::SESSION_ABANDONED,
            self::PROGRESSIVE_HIDING_USED,
            self::AI_RECITE_STARTED,
            self::AI_RECITE_COMPLETED,
            self::REVISION_STARTED,
            self::REVISION_COMPLETED,
            self::RECOMMENDATION_FOLLOWED,
            self::USER_RETURNED,
            self::REFERRAL_LINK_OPENED,
            self::REFERRAL_SIGNUP_COMPLETED,
            self::TUTORIAL_PLAYED,
            self::TUTORIAL_COMPLETED,
            self::FEEDBACK_SUBMITTED,
            self::DAILY_MUTQIN_STARTED,
            self::DAILY_MUTQIN_STEP_VIEWED,
            self::DAILY_MUTQIN_COMPLETED,
            self::ACHIEVEMENT_UNLOCKED,
            self::ACHIEVEMENT_VIEWED,
            self::ACHIEVEMENT_PROGRESS_VIEWED,
        ];
    }

    /**
     * Ordered activation funnel used for abandonment.
     *
     * @return list<string>
     */
    public static function funnel(): array
    {
        return [
            self::LANDING_PAGE_VIEWED,
            self::SIGNUP_STARTED,
            self::SIGNUP_COMPLETED,
            self::ONBOARDING_STARTED,
            self::ONBOARDING_COMPLETED,
            self::SESSION_STARTED,
            self::SESSION_COMPLETED,
        ];
    }

    /**
     * Feature counters. Only events that mean the feature was actually used.
     *
     * @return list<string>
     */
    public static function features(): array
    {
        return [
            self::PROGRESSIVE_HIDING_USED,
            self::AI_RECITE_STARTED,
            self::AI_RECITE_COMPLETED,
            self::REVISION_STARTED,
            self::RECOMMENDATION_FOLLOWED,
            self::TUTORIAL_PLAYED,
            self::TUTORIAL_COMPLETED,
            self::DAILY_MUTQIN_STARTED,
            self::DAILY_MUTQIN_COMPLETED,
            self::ACHIEVEMENT_UNLOCKED,
            self::ACHIEVEMENT_VIEWED,
            self::ACHIEVEMENT_PROGRESS_VIEWED,
        ];
    }
}
