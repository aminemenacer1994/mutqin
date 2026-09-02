<?php

namespace Database\Seeders;

use App\Enums\ConfidenceFeedback;
use App\Enums\RecommendationReasonCode;
use App\Enums\RecommendationStatus;
use App\Enums\RecommendationType;
use App\Enums\UserSessionStatus;
use App\Models\AiReciteAttempt;
use App\Models\AyahNote;
use App\Models\ContactSubmission;
use App\Models\LearningAnalytic;
use App\Models\MemorisationAssessment;
use App\Models\MemorisationPracticePlan;
use App\Models\MemorisationProgress;
use App\Models\MemorisationSyncState;
use App\Models\SessionRecommendation;
use App\Models\User;
use App\Models\UserLastPosition;
use App\Models\UserSession;
use Database\Seeders\Concerns\GuardsDemoSeeding;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class DemoDataSeeder extends Seeder
{
    use GuardsDemoSeeding;

    private const RECITER_ALAFASY = 'ar.alafasy';

    /**
     * Seed realistic Mutqin demo data across learning tables.
     */
    public function run(): void
    {
        $this->guardAgainstProductionSeeding();

        $users = $this->seedUsers();

        foreach ($users as $key => $user) {
            match ($key) {
                'beginner' => $this->seedBeginner($user),
                'active' => $this->seedActiveLearner($user),
                'reviser' => $this->seedWeakReviser($user),
                'arabic' => $this->seedArabicPowerUser($user),
                'paused' => $this->seedPausedLearner($user),
                'trial' => $this->seedTrialUser($user),
                'google' => $this->seedGoogleUser($user),
                'admin' => $this->seedAdminActivity($user),
                default => null,
            };
        }

        $this->enrichPracticeAccounts();
        $this->seedContactSubmissions();
    }

    /**
     * @return array<string, User>
     */
    private function seedUsers(): array
    {
        $now = now();

        $definitions = [
            'admin' => [
                'name' => 'Tester — Admin (Pro)',
                'email' => 'admin@mutqin.test',
                'password' => 'AdminPass1!',
                'locale' => 'en',
                'subscription_tier' => 'pro',
                'subscription_plan' => 'pro_yearly',
                'subscription_status' => 'active',
                'stripe_customer_id' => 'cus_demo_admin',
                'stripe_subscription_id' => 'sub_demo_admin',
                'subscription_current_period_ends_at' => $now->copy()->addYear(),
            ],
            'beginner' => [
                'name' => 'Tester — Beginner (EN)',
                'email' => 'layla.beginner@mutqin.test',
                'password' => 'DemoPass1!',
                'locale' => 'en',
                'subscription_tier' => 'free',
                'subscription_plan' => 'free',
                'subscription_status' => 'free',
            ],
            'active' => [
                'name' => 'Tester — Active Learner (Premium)',
                'email' => 'omar.active@mutqin.test',
                'password' => 'DemoPass1!',
                'locale' => 'en',
                'subscription_tier' => 'premium',
                'subscription_plan' => 'premium_monthly',
                'subscription_status' => 'active',
                'stripe_customer_id' => 'cus_demo_omar',
                'stripe_subscription_id' => 'sub_demo_omar',
                'subscription_current_period_ends_at' => $now->copy()->addMonth(),
            ],
            'reviser' => [
                'name' => 'Tester — Muraja\'ah & AI Recite',
                'email' => 'fatima.reviser@mutqin.test',
                'password' => 'DemoPass1!',
                'locale' => 'en',
                'subscription_tier' => 'premium',
                'subscription_plan' => 'premium_yearly',
                'subscription_status' => 'active',
                'stripe_customer_id' => 'cus_demo_fatima',
                'stripe_subscription_id' => 'sub_demo_fatima',
                'subscription_current_period_ends_at' => $now->copy()->addYear(),
            ],
            'arabic' => [
                'name' => 'يوسف المنصور',
                'email' => 'yusuf.ar@mutqin.test',
                'password' => 'DemoPass1!',
                'locale' => 'ar',
                'subscription_tier' => 'pro',
                'subscription_plan' => 'pro_monthly',
                'subscription_status' => 'active',
                'stripe_customer_id' => 'cus_demo_yusuf',
                'stripe_subscription_id' => 'sub_demo_yusuf',
                'subscription_current_period_ends_at' => $now->copy()->addMonth(),
            ],
            'paused' => [
                'name' => 'Tester — Paused Session',
                'email' => 'noah.paused@mutqin.test',
                'password' => 'DemoPass1!',
                'locale' => 'en',
                'subscription_tier' => 'free',
                'subscription_plan' => 'free',
                'subscription_status' => 'free',
            ],
            'trial' => [
                'name' => 'Aisha Rahman',
                'email' => 'aisha.trial@mutqin.test',
                'password' => 'DemoPass1!',
                'locale' => 'id',
                'subscription_tier' => 'premium',
                'subscription_plan' => 'premium_monthly',
                'subscription_status' => 'trialing',
                'stripe_customer_id' => 'cus_demo_aisha',
                'stripe_subscription_id' => 'sub_demo_aisha',
                'subscription_trial_ends_at' => $now->copy()->addDays(10),
                'subscription_current_period_ends_at' => $now->copy()->addDays(10),
            ],
            'google' => [
                'name' => 'Sofia Mendes',
                'email' => 'sofia.google@mutqin.test',
                'password' => null,
                'google_id' => 'google-demo-sofia-001',
                'avatar' => 'https://lh3.googleusercontent.com/a/default-user',
                'locale' => 'es',
                'subscription_tier' => 'free',
                'subscription_plan' => 'free',
                'subscription_status' => 'free',
            ],
        ];

        $users = [];

        foreach ($definitions as $key => $attrs) {
            $email = $attrs['email'];
            unset($attrs['email']);

            // Never updateOrCreate a real-user mailbox — demo domains only.
            $this->assertSafeDemoEmail($email);

            $users[$key] = User::updateOrCreate(
                ['email' => $email],
                array_merge([
                    'email_verified_at' => $now,
                    'remember_token' => Str::random(10),
                    'is_admin' => $key === 'admin',
                ], $attrs)
            );
        }

        return $users;
    }

    private function seedBeginner(User $user): void
    {
        // Surah Al-Fatiha only — early learner.
        $this->upsertProgressRows($user, [
            [1, 1, 'memorised', 78, 12],
            [1, 2, 'memorised', 72, 10],
            [1, 3, 'learning', 35, 4],
            [1, 4, 'learning', 20, 2],
            [1, 5, 'learning', 10, 1],
        ]);

        $session = $this->createSession($user, [
            'surah_number' => 1,
            'ayah_number' => 3,
            'current_step' => 2,
            'memorisation_mode' => 'advanced',
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => true,
            'repetitions_completed' => 3,
            'session_duration_seconds' => 420,
            'started_at' => now()->subDays(2)->setTime(9, 0),
            'ended_at' => now()->subDays(2)->setTime(9, 7),
            'last_activity_at' => now()->subDays(2)->setTime(9, 7),
            'start_idempotency_key' => "demo-beginner-onboarding-{$user->id}",
            'metadata' => [
                'technique' => 'talqin',
                'ayah_start' => 1,
                'ayah_end' => 3,
                'label' => 'onboarding_example',
            ],
            'completion_settings' => [
                'technique' => 'talqin',
                'reciter' => self::RECITER_ALAFASY,
                'playback_speed' => 0.9,
                'repetitions' => 3,
            ],
        ]);

        $this->createRecommendation($user, [
            'source_session_id' => $session->id,
            'surah_number' => 1,
            'ayah_start' => 4,
            'ayah_end' => 7,
            'recommendation_type' => RecommendationType::Continue->value,
            'reason_code' => RecommendationReasonCode::ContinueCurrentSurah->value,
            'session_mode' => 'new_learning',
            'status' => RecommendationStatus::Generated,
            'recommended_technique' => 'talqin',
            'recommended_reciter' => self::RECITER_ALAFASY,
            'recommended_playback_speed' => 0.9,
            'recommended_repetitions' => 5,
            'recommended_ayat_per_step' => 1,
            'idempotency_key' => "demo-beginner-continue-{$user->id}",
            'payload' => ['message' => 'Continue Al-Fatiha ayahs 4–7'],
        ]);

        $this->upsertLastPosition($user, 1, 3, 2, [
            'mode' => 'advanced',
            'technique' => 'talqin',
        ]);

        $this->seedAnalyticsStreak($user, days: 3, baseMinutes: 8, startStreak: 1);

        $this->upsertSyncState($user, [
            'version' => 1,
            'ayahs' => [
                '1:1' => ['status' => 'reviewed', 'mastery' => 78, 'reps' => 12],
                '1:2' => ['status' => 'reviewed', 'mastery' => 72, 'reps' => 10],
                '1:3' => ['status' => 'learning', 'mastery' => 35, 'reps' => 4],
            ],
            'sessionState' => [
                'mode' => 'advanced',
                'status' => 'completed',
                'completed' => true,
                'current_index' => 2,
                'queue' => [
                    ['ayahId' => '1:1', 'repeatCount' => 3],
                    ['ayahId' => '1:2', 'repeatCount' => 3],
                    ['ayahId' => '1:3', 'repeatCount' => 3],
                ],
            ],
            'stats' => ['streak' => 3, 'totalMinutes' => 24],
        ], 'iphone-demo-layla', 'iPhone 15');

        AyahNote::updateOrCreate(
            ['user_id' => $user->id, 'surah_number' => 1, 'ayah_number' => 1],
            [
                'title' => 'Basmala tip',
                'body' => 'Start slowly and emphasise the madd in الرحمن and الرحيم.',
            ]
        );
    }

    private function seedActiveLearner(User $user): void
    {
        // Mastered Juz Amma short surahs + learning Al-Baqarah opening.
        $fatiha = [];
        for ($ayah = 1; $ayah <= 7; $ayah++) {
            $fatiha[] = [1, $ayah, 'mastered', 90 + ($ayah % 5), 20 + $ayah];
        }
        $ikhlas = [];
        for ($ayah = 1; $ayah <= 4; $ayah++) {
            $ikhlas[] = [112, $ayah, 'memorised', 80 + $ayah, 15];
        }
        $baqarah = [
            [2, 1, 'memorised', 70, 8],
            [2, 2, 'memorised', 65, 7],
            [2, 3, 'reviewing', 45, 5],
            [2, 4, 'learning', 30, 3],
            [2, 5, 'learning', 18, 2],
        ];
        $this->upsertProgressRows($user, array_merge($fatiha, $ikhlas, $baqarah));

        $completed = $this->createSession($user, [
            'surah_number' => 2,
            'ayah_number' => 3,
            'current_step' => 2,
            'memorisation_mode' => 'advanced',
            'status' => UserSessionStatus::Completed,
            'repetitions_completed' => 5,
            'session_duration_seconds' => 1140,
            'started_at' => now()->subDay()->setTime(18, 0),
            'ended_at' => now()->subDay()->setTime(18, 19),
            'last_activity_at' => now()->subDay()->setTime(18, 19),
            'start_idempotency_key' => "demo-active-baqarah-{$user->id}",
            'metadata' => [
                'technique' => 'chaining',
                'ayah_start' => 1,
                'ayah_end' => 3,
            ],
            'completion_settings' => [
                'technique' => 'chaining',
                'reciter' => self::RECITER_ALAFASY,
                'playback_speed' => 1.0,
                'repetitions' => 5,
            ],
        ]);

        $recommendation = $this->createRecommendation($user, [
            'source_session_id' => $completed->id,
            'surah_number' => 2,
            'ayah_start' => 4,
            'ayah_end' => 5,
            'recommendation_type' => RecommendationType::ContinueNextRange->value,
            'reason_code' => RecommendationReasonCode::StrongPreviousPerformance->value,
            'session_mode' => 'new_learning',
            'status' => RecommendationStatus::Accepted,
            'recommended_technique' => 'chaining',
            'recommended_reciter' => self::RECITER_ALAFASY,
            'recommended_playback_speed' => 1.0,
            'recommended_repetitions' => 5,
            'recommended_ayat_per_step' => 2,
            'confidence_feedback' => ConfidenceFeedback::Confident->value,
            'accepted' => true,
            'accepted_at' => now()->subHours(20),
            'idempotency_key' => "demo-active-continue-{$user->id}",
            'recommended_settings' => [
                'technique' => 'chaining',
                'talqin_enabled' => false,
            ],
        ]);

        $followUp = $this->createSession($user, [
            'surah_number' => 2,
            'ayah_number' => 5,
            'current_step' => 1,
            'memorisation_mode' => 'advanced',
            'status' => UserSessionStatus::Completed,
            'repetitions_completed' => 4,
            'session_duration_seconds' => 780,
            'started_at' => now()->subHours(19),
            'ended_at' => now()->subHours(19)->addMinutes(13),
            'last_activity_at' => now()->subHours(19)->addMinutes(13),
            'recommendation_id' => $recommendation->id,
            'recommendation_source' => RecommendationType::ContinueNextRange->value,
            'attempt_number' => 1,
            'start_idempotency_key' => "demo-active-followup-{$user->id}",
            'metadata' => [
                'technique' => 'chaining',
                'ayah_start' => 4,
                'ayah_end' => 5,
            ],
        ]);

        $recommendation->update([
            'status' => RecommendationStatus::Started,
            'started_session_id' => $followUp->id,
        ]);

        $this->createRecommendation($user, [
            'source_session_id' => $followUp->id,
            'surah_number' => 2,
            'ayah_start' => 3,
            'ayah_end' => 3,
            'recommendation_type' => RecommendationType::Revision->value,
            'reason_code' => RecommendationReasonCode::DifficultAyahDetected->value,
            'session_mode' => 'revision',
            'status' => RecommendationStatus::Generated,
            'range_kind' => 'revision',
            'recommended_technique' => 'focus',
            'recommended_reciter' => self::RECITER_ALAFASY,
            'recommended_playback_speed' => 0.85,
            'recommended_repetitions' => 7,
            'recommended_ayat_per_step' => 1,
            'confidence_feedback' => ConfidenceFeedback::NeedsPractice->value,
            'idempotency_key' => "demo-active-revision-{$user->id}",
            'payload' => ['focus_ayahs' => [3]],
        ]);

        $this->upsertLastPosition($user, 2, 5, 1, [
            'mode' => 'advanced',
            'technique' => 'chaining',
        ]);

        $this->seedAnalyticsStreak($user, days: 21, baseMinutes: 22, startStreak: 1);

        $this->upsertSyncState($user, [
            'version' => 1,
            'ayahs' => [
                '2:4' => ['status' => 'learning', 'mastery' => 30, 'reps' => 3],
                '2:5' => ['status' => 'learning', 'mastery' => 18, 'reps' => 2],
            ],
            'sessionState' => [
                'mode' => 'advanced',
                'status' => 'completed',
                'completed' => true,
                'current_index' => 1,
                'queue' => [
                    ['ayahId' => '2:4', 'repeatCount' => 4],
                    ['ayahId' => '2:5', 'repeatCount' => 4],
                ],
            ],
            'stats' => ['streak' => 21, 'totalMinutes' => 480],
        ], 'ipad-demo-omar', 'iPad Pro');

        AyahNote::updateOrCreate(
            ['user_id' => $user->id, 'surah_number' => 2, 'ayah_number' => 3],
            [
                'title' => 'Similar wording',
                'body' => 'Watch the ending — easy to confuse with nearby ayahs that share يؤمنون.',
            ]
        );
    }

    private function seedWeakReviser(User $user): void
    {
        $this->upsertProgressRows($user, [
            [112, 1, 'memorised', 75, 14],
            [112, 2, 'reviewing', 40, 9],
            [112, 3, 'reviewing', 38, 8],
            [112, 4, 'learning', 28, 5],
            [113, 1, 'learning', 22, 3],
            [113, 2, 'learning', 15, 2],
        ]);

        $source = $this->createSession($user, [
            'surah_number' => 112,
            'ayah_number' => 4,
            'current_step' => 3,
            'memorisation_mode' => 'revision',
            'status' => UserSessionStatus::Completed,
            'repetitions_completed' => 6,
            'session_duration_seconds' => 900,
            'started_at' => now()->subHours(6),
            'ended_at' => now()->subHours(6)->addMinutes(15),
            'last_activity_at' => now()->subHours(6)->addMinutes(15),
            'start_idempotency_key' => "demo-reviser-ikhlas-{$user->id}",
            'metadata' => [
                'technique' => 'talqin',
                'ayah_start' => 1,
                'ayah_end' => 4,
            ],
        ]);

        $aiRec = $this->createRecommendation($user, [
            'source_session_id' => $source->id,
            'surah_number' => 112,
            'ayah_start' => 1,
            'ayah_end' => 4,
            'recommendation_type' => RecommendationType::TestWithAiRecite->value,
            'reason_code' => RecommendationReasonCode::LowRecall->value,
            'session_mode' => 'manual',
            'status' => RecommendationStatus::Accepted,
            'accepted' => true,
            'accepted_at' => now()->subHours(5),
            'recommended_technique' => 'talqin',
            'recommended_reciter' => self::RECITER_ALAFASY,
            'recommended_playback_speed' => 0.75,
            'recommended_repetitions' => 8,
            'ai_assessment' => [
                'band' => 'mixed',
                'accuracy_percent' => 62,
                'suggested_action' => 'practice_plan',
            ],
            'idempotency_key' => "demo-reviser-ai-test-{$user->id}",
        ]);

        AiReciteAttempt::updateOrCreate(
            [
                'session_recommendation_id' => $aiRec->id,
                'attempt_number' => 1,
            ],
            [
                'user_id' => $user->id,
                'user_session_id' => $source->id,
                'accuracy_percent' => 48,
                'band' => 'weak',
                'ayah_range' => ['surah' => 112, 'start' => 1, 'end' => 4],
                'color_counts' => ['green' => 6, 'yellow' => 5, 'red' => 7],
                'weak_words' => [
                    ['ayah' => 2, 'word' => 'الصمد', 'confidence' => 0.41],
                    ['ayah' => 3, 'word' => 'يلد', 'confidence' => 0.36],
                    ['ayah' => 4, 'word' => 'كفوا', 'confidence' => 0.33],
                ],
                'word_statuses' => [
                    ['ayah' => 1, 'status' => 'correct'],
                    ['ayah' => 2, 'status' => 'partial'],
                    ['ayah' => 3, 'status' => 'incorrect'],
                    ['ayah' => 4, 'status' => 'partial'],
                ],
                'plan_snapshot' => null,
            ]
        );

        AiReciteAttempt::updateOrCreate(
            [
                'session_recommendation_id' => $aiRec->id,
                'attempt_number' => 2,
            ],
            [
                'user_id' => $user->id,
                'user_session_id' => $source->id,
                'accuracy_percent' => 70,
                'band' => 'mixed',
                'ayah_range' => ['surah' => 112, 'start' => 1, 'end' => 4],
                'color_counts' => ['green' => 11, 'yellow' => 4, 'red' => 3],
                'weak_words' => [
                    ['ayah' => 3, 'word' => 'يولَد', 'confidence' => 0.52],
                    ['ayah' => 4, 'word' => 'كفوا', 'confidence' => 0.48],
                ],
                'word_statuses' => [
                    ['ayah' => 1, 'status' => 'correct'],
                    ['ayah' => 2, 'status' => 'correct'],
                    ['ayah' => 3, 'status' => 'partial'],
                    ['ayah' => 4, 'status' => 'partial'],
                ],
                'plan_snapshot' => [
                    'band' => 'mixed',
                    'difficulty' => 'focused',
                ],
            ]
        );

        $assessment = MemorisationAssessment::updateOrCreate(
            [
                'user_id' => $user->id,
                'user_session_id' => $source->id,
                'assessment_type' => 'memorisation_detection',
            ],
            [
                'session_recommendation_id' => $aiRec->id,
                'surah_number' => 112,
                'start_ayah' => 1,
                'end_ayah' => 4,
                'surah_name' => 'Al-Ikhlas',
                'recognition_data' => [
                    'engine' => 'demo',
                    'sample_rate' => 16000,
                ],
                'word_results' => [
                    ['ayah' => 2, 'word' => 'الصمد', 'correct' => false],
                    ['ayah' => 3, 'word' => 'يلد', 'correct' => false],
                ],
                'ayah_results' => [
                    ['ayah' => 1, 'accuracy' => 92],
                    ['ayah' => 2, 'accuracy' => 58],
                    ['ayah' => 3, 'accuracy' => 45],
                    ['ayah' => 4, 'accuracy' => 61],
                ],
                'error_classifications' => [
                    'omission' => 2,
                    'substitution' => 3,
                    'hesitation' => 1,
                ],
                'weakness_analysis' => [
                    'band' => 'mixed',
                    'primary' => 'similar_ayah_confusion',
                    'focus_ayahs' => [2, 3],
                    'weak_ayahs' => [2, 3, 4],
                ],
                'overall_accuracy' => 62,
                'confidence' => 0.7421,
                'duration_ms' => 48200,
                'friendly_summary' => 'Solid opening, but ayahs 2–3 need reinforcement before moving on.',
            ]
        );

        MemorisationPracticePlan::updateOrCreate(
            [
                'user_id' => $user->id,
                'assessment_id' => $assessment->id,
            ],
            [
                'session_recommendation_id' => $aiRec->id,
                'title' => 'Reinforce Al-Ikhlas',
                'explanation' => 'Focus on الله الصمد and the negation pattern in ayahs 3–4 using talqin then focus drills.',
                'band' => 'mixed',
                'difficulty' => 'focused',
                'status' => MemorisationPracticePlan::STATUS_ACTIVE,
                'surah_number' => 112,
                'start_ayah' => 1,
                'end_ayah' => 4,
                'priority_ayahs' => [2, 3],
                'weak_words' => ['الصمد', 'يلد', 'كفوا'],
                'weak_phrases' => ['الله الصمد', 'لم يلد ولم يولد'],
                'techniques' => ['talqin', 'focus'],
                'repetitions' => ['talqin' => 5, 'focus' => 4],
                'config' => [
                    'playback_speed' => 0.75,
                    'reciter' => self::RECITER_ALAFASY,
                    'ayat_per_step' => 1,
                ],
                'user_adjustments' => null,
                'completion_data' => null,
                'retest_metrics' => null,
                'started_at' => now()->subHours(4),
                'completed_at' => null,
            ]
        );

        $revisionRec = $this->createRecommendation($user, [
            'source_session_id' => $source->id,
            'surah_number' => 112,
            'ayah_start' => 2,
            'ayah_end' => 3,
            'recommendation_type' => RecommendationType::Revision->value,
            'reason_code' => RecommendationReasonCode::AiReciteMixed->value,
            'session_mode' => 'revision',
            'status' => RecommendationStatus::Generated,
            'range_kind' => 'revision',
            'recommended_technique' => 'talqin',
            'recommended_reciter' => self::RECITER_ALAFASY,
            'recommended_playback_speed' => 0.75,
            'recommended_repetitions' => 8,
            'recommended_ayat_per_step' => 1,
            'idempotency_key' => "demo-reviser-revision-{$user->id}",
            'ai_assessment' => ['band' => 'mixed', 'from_attempt' => 2],
        ]);

        // Superseded older recommendation for history.
        $old = $this->createRecommendation($user, [
            'source_session_id' => $source->id,
            'surah_number' => 112,
            'ayah_start' => 1,
            'ayah_end' => 4,
            'recommendation_type' => RecommendationType::RepeatCurrentRange->value,
            'reason_code' => RecommendationReasonCode::NeedsMorePractice->value,
            'session_mode' => 'revision',
            'status' => RecommendationStatus::Superseded,
            'recommended_technique' => 'blur',
            'idempotency_key' => "demo-reviser-old-{$user->id}",
        ]);
        $revisionRec->update(['supersedes_recommendation_id' => $old->id]);

        $this->upsertLastPosition($user, 112, 3, 2, [
            'mode' => 'revision',
            'technique' => 'talqin',
            'practice_plan' => true,
        ]);

        $this->seedAnalyticsStreak($user, days: 10, baseMinutes: 18, startStreak: 1);

        $this->upsertSyncState($user, [
            'version' => 1,
            'ayahs' => [
                '112:2' => ['status' => 'weak', 'mastery' => 40, 'reps' => 9],
                '112:3' => ['status' => 'weak', 'mastery' => 38, 'reps' => 8],
            ],
            'sessionState' => [
                'mode' => 'revision',
                'status' => 'completed',
                'completed' => true,
            ],
            'stats' => ['streak' => 10, 'totalMinutes' => 180],
        ], 'pixel-demo-fatima', 'Pixel 8');

        AyahNote::updateOrCreate(
            ['user_id' => $user->id, 'surah_number' => 112, 'ayah_number' => 3],
            [
                'title' => 'لم / ولم pattern',
                'body' => 'Practice لم يلد ولم يولد as one phrase so the negation chain stays linked.',
            ]
        );
    }

    private function seedArabicPowerUser(User $user): void
    {
        $rows = [];
        foreach ([112, 113, 114] as $surah) {
            $count = $surah === 112 ? 4 : ($surah === 113 ? 5 : 6);
            for ($ayah = 1; $ayah <= $count; $ayah++) {
                $rows[] = [$surah, $ayah, 'mastered', 88 + ($ayah % 8), 25];
            }
        }
        for ($ayah = 1; $ayah <= 7; $ayah++) {
            $rows[] = [1, $ayah, 'mastered', 95, 40];
        }
        $this->upsertProgressRows($user, $rows);

        $session = $this->createSession($user, [
            'surah_number' => 78,
            'ayah_number' => 10,
            'current_step' => 9,
            'memorisation_mode' => 'advanced',
            'status' => UserSessionStatus::Completed,
            'repetitions_completed' => 4,
            'session_duration_seconds' => 1500,
            'started_at' => now()->subHours(3),
            'ended_at' => now()->subHours(3)->addMinutes(25),
            'last_activity_at' => now()->subHours(3)->addMinutes(25),
            'start_idempotency_key' => "demo-arabic-naba-{$user->id}",
            'metadata' => [
                'technique' => 'anchor',
                'ayah_start' => 1,
                'ayah_end' => 10,
                'surah_name' => 'An-Naba',
            ],
        ]);

        $this->createRecommendation($user, [
            'source_session_id' => $session->id,
            'surah_number' => 78,
            'ayah_start' => 11,
            'ayah_end' => 20,
            'recommendation_type' => RecommendationType::Continue->value,
            'reason_code' => RecommendationReasonCode::ContinueWhileFresh->value,
            'session_mode' => 'new_learning',
            'status' => RecommendationStatus::Generated,
            'recommended_technique' => 'anchor',
            'recommended_reciter' => self::RECITER_ALAFASY,
            'recommended_playback_speed' => 1.0,
            'recommended_repetitions' => 4,
            'recommended_ayat_per_step' => 2,
            'confidence_feedback' => ConfidenceFeedback::Confident->value,
            'idempotency_key' => "demo-arabic-continue-{$user->id}",
        ]);

        $this->upsertLastPosition($user, 78, 10, 9, [
            'mode' => 'advanced',
            'technique' => 'anchor',
            'locale' => 'ar',
        ]);

        $this->seedAnalyticsStreak($user, days: 30, baseMinutes: 35, startStreak: 1);

        AyahNote::updateOrCreate(
            ['user_id' => $user->id, 'surah_number' => 78, 'ayah_number' => 1],
            [
                'title' => 'ملاحظة تجويد',
                'body' => 'انتبه إلى قلقلة القاف في عمّ يتساءلون عند الابتداء.',
            ]
        );

        $this->upsertSyncState($user, [
            'version' => 1,
            'ayahs' => [
                '78:10' => ['status' => 'reviewed', 'mastery' => 82, 'reps' => 4],
            ],
            'sessionState' => [
                'mode' => 'advanced',
                'status' => 'completed',
                'completed' => true,
            ],
            'stats' => ['streak' => 30, 'totalMinutes' => 1050],
        ], 'samsung-demo-yusuf', 'Galaxy S24');
    }

    private function seedPausedLearner(User $user): void
    {
        $this->upsertProgressRows($user, [
            [1, 1, 'memorised', 70, 8],
            [1, 2, 'memorised', 68, 7],
            [1, 3, 'learning', 40, 3],
            [1, 4, 'learning', 25, 2],
        ]);

        $paused = $this->createSession($user, [
            'surah_number' => 1,
            'ayah_number' => 4,
            'current_step' => 3,
            'memorisation_mode' => 'advanced',
            'status' => UserSessionStatus::Paused,
            'repetitions_completed' => 1,
            'session_duration_seconds' => 360,
            'started_at' => now()->subHours(2),
            'paused_at' => now()->subHour(),
            'last_activity_at' => now()->subHour(),
            'ended_at' => null,
            'start_idempotency_key' => "demo-paused-fatiha-{$user->id}",
            'metadata' => [
                'technique' => 'talqin',
                'ayah_start' => 1,
                'ayah_end' => 7,
                'paused' => true,
            ],
        ]);

        $this->createRecommendation($user, [
            'source_session_id' => $paused->id,
            'surah_number' => 1,
            'ayah_start' => 4,
            'ayah_end' => 7,
            'recommendation_type' => RecommendationType::Resume->value,
            'reason_code' => RecommendationReasonCode::ResumeIncompleteSession->value,
            'session_mode' => 'revision',
            'status' => RecommendationStatus::Generated,
            'recommended_technique' => 'talqin',
            'recommended_reciter' => self::RECITER_ALAFASY,
            'recommended_playback_speed' => 0.9,
            'idempotency_key' => "demo-paused-resume-{$user->id}",
        ]);

        // Earlier abandoned / ended-early history.
        $this->createSession($user, [
            'surah_number' => 114,
            'ayah_number' => 2,
            'current_step' => 1,
            'memorisation_mode' => 'manual',
            'status' => UserSessionStatus::EndedEarly,
            'repetitions_completed' => 1,
            'session_duration_seconds' => 180,
            'started_at' => now()->subDays(4),
            'ended_at' => now()->subDays(4)->addMinutes(3),
            'last_activity_at' => now()->subDays(4)->addMinutes(3),
            'start_idempotency_key' => "demo-paused-ended-early-{$user->id}",
            'metadata' => ['ayah_start' => 1, 'ayah_end' => 6, 'reason' => 'user_ended_early'],
        ]);

        $this->createSession($user, [
            'surah_number' => 113,
            'ayah_number' => 1,
            'current_step' => 0,
            'memorisation_mode' => 'advanced',
            'status' => UserSessionStatus::Abandoned,
            'repetitions_completed' => 0,
            'session_duration_seconds' => 45,
            'started_at' => now()->subDays(5),
            'ended_at' => now()->subDays(5)->addMinute(),
            'last_activity_at' => now()->subDays(5)->addMinute(),
            'start_idempotency_key' => "demo-paused-abandoned-{$user->id}",
            'metadata' => ['ayah_start' => 1, 'ayah_end' => 5],
        ]);

        $this->upsertLastPosition($user, 1, 4, 3, [
            'mode' => 'advanced',
            'paused' => true,
        ]);

        $this->seedAnalyticsStreak($user, days: 2, baseMinutes: 10, startStreak: 1);
    }

    private function seedTrialUser(User $user): void
    {
        $this->upsertProgressRows($user, [
            [1, 1, 'memorised', 80, 10],
            [1, 2, 'memorised', 76, 9],
            [1, 3, 'memorised', 74, 8],
            [1, 4, 'reviewing', 55, 6],
            [1, 5, 'learning', 40, 4],
            [1, 6, 'learning', 30, 3],
            [1, 7, 'learning', 20, 2],
        ]);

        $first = $this->createSession($user, [
            'surah_number' => 1,
            'ayah_number' => 5,
            'current_step' => 4,
            'memorisation_mode' => 'advanced',
            'status' => UserSessionStatus::Completed,
            'repetitions_completed' => 4,
            'session_duration_seconds' => 600,
            'started_at' => now()->subDays(1)->setTime(7, 30),
            'ended_at' => now()->subDays(1)->setTime(7, 40),
            'last_activity_at' => now()->subDays(1)->setTime(7, 40),
            'start_idempotency_key' => "demo-trial-first-{$user->id}",
            'metadata' => ['technique' => 'focus', 'ayah_start' => 1, 'ayah_end' => 5],
        ]);

        $repeat = $this->createSession($user, [
            'surah_number' => 1,
            'ayah_number' => 5,
            'current_step' => 4,
            'memorisation_mode' => 'revision',
            'status' => UserSessionStatus::Completed,
            'repetitions_completed' => 6,
            'session_duration_seconds' => 720,
            'started_at' => now()->subHours(5),
            'ended_at' => now()->subHours(5)->addMinutes(12),
            'last_activity_at' => now()->subHours(5)->addMinutes(12),
            'repeated_from_session_id' => $first->id,
            'attempt_number' => 2,
            'recommendation_source' => RecommendationType::RepeatCurrentRange->value,
            'start_idempotency_key' => "demo-trial-repeat-{$user->id}",
            'metadata' => ['technique' => 'focus', 'ayah_start' => 1, 'ayah_end' => 5, 'attempt' => 2],
        ]);

        $this->createRecommendation($user, [
            'source_session_id' => $repeat->id,
            'surah_number' => 1,
            'ayah_start' => 6,
            'ayah_end' => 7,
            'recommendation_type' => RecommendationType::CompleteSurah->value,
            'reason_code' => RecommendationReasonCode::CompleteRemainingAyat->value,
            'session_mode' => 'new_learning',
            'status' => RecommendationStatus::Generated,
            'recommended_technique' => 'focus',
            'recommended_reciter' => self::RECITER_ALAFASY,
            'recommended_playback_speed' => 0.95,
            'recommended_repetitions' => 5,
            'idempotency_key' => "demo-trial-complete-{$user->id}",
        ]);

        $this->upsertLastPosition($user, 1, 5, 4, ['mode' => 'revision']);
        $this->seedAnalyticsStreak($user, days: 7, baseMinutes: 14, startStreak: 1);
    }

    private function seedGoogleUser(User $user): void
    {
        $this->upsertProgressRows($user, [
            [114, 1, 'learning', 25, 2],
            [114, 2, 'learning', 15, 1],
        ]);

        $this->createSession($user, [
            'surah_number' => 114,
            'ayah_number' => 1,
            'current_step' => 0,
            'memorisation_mode' => 'manual',
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => true,
            'repetitions_completed' => 2,
            'session_duration_seconds' => 240,
            'started_at' => now()->subDays(1),
            'ended_at' => now()->subDays(1)->addMinutes(4),
            'last_activity_at' => now()->subDays(1)->addMinutes(4),
            'start_idempotency_key' => "demo-google-onboarding-{$user->id}",
            'metadata' => ['technique' => 'talqin', 'ayah_start' => 1, 'ayah_end' => 1],
        ]);

        $this->upsertLastPosition($user, 114, 2, 0, ['mode' => 'manual']);
        $this->seedAnalyticsStreak($user, days: 1, baseMinutes: 6, startStreak: 1);
    }

    private function seedAdminActivity(User $user): void
    {
        $this->upsertProgressRows($user, [
            [1, 1, 'mastered', 100, 50],
            [1, 2, 'mastered', 100, 50],
        ]);

        $this->createSession($user, [
            'surah_number' => 1,
            'ayah_number' => 2,
            'current_step' => 1,
            'memorisation_mode' => 'advanced',
            'status' => UserSessionStatus::Completed,
            'repetitions_completed' => 3,
            'session_duration_seconds' => 300,
            'started_at' => now()->subDays(1),
            'ended_at' => now()->subDays(1)->addMinutes(5),
            'last_activity_at' => now()->subDays(1)->addMinutes(5),
            'start_idempotency_key' => "demo-admin-session-{$user->id}",
            'metadata' => ['technique' => 'talqin'],
        ]);

        $this->upsertLastPosition($user, 1, 2, 1, ['mode' => 'advanced']);
        $this->seedAnalyticsStreak($user, days: 5, baseMinutes: 12, startStreak: 1);
    }

    private function enrichPracticeAccounts(): void
    {
        $practiceEmails = [
            'practice01@example.com' => 'beginner_lite',
            'practice02@example.com' => 'active_lite',
            'practice03@example.com' => 'reviser_lite',
        ];

        foreach ($practiceEmails as $email => $profile) {
            $user = User::where('email', $email)->first();
            if (! $user) {
                continue;
            }

            // Give practice accounts varied locales/subscriptions.
            $user->update(match ($profile) {
                'beginner_lite' => [
                    'locale' => 'en',
                    'subscription_tier' => 'free',
                    'subscription_plan' => 'free',
                    'subscription_status' => 'free',
                ],
                'active_lite' => [
                    'locale' => 'fr',
                    'subscription_tier' => 'premium',
                    'subscription_plan' => 'premium_monthly',
                    'subscription_status' => 'active',
                    'stripe_customer_id' => 'cus_practice02',
                    'stripe_subscription_id' => 'sub_practice02',
                    'subscription_current_period_ends_at' => now()->addMonth(),
                ],
                'reviser_lite' => [
                    'locale' => 'ar',
                    'subscription_tier' => 'pro',
                    'subscription_plan' => 'pro_monthly',
                    'subscription_status' => 'active',
                    'stripe_customer_id' => 'cus_practice03',
                    'stripe_subscription_id' => 'sub_practice03',
                    'subscription_current_period_ends_at' => now()->addMonth(),
                ],
                default => [],
            });

            if ($profile === 'beginner_lite') {
                $this->upsertProgressRows($user, [
                    [1, 1, 'learning', 30, 3],
                    [1, 2, 'learning', 20, 2],
                ]);
                $this->seedAnalyticsStreak($user, days: 2, baseMinutes: 7, startStreak: 1);
            }

            if ($profile === 'active_lite') {
                $this->upsertProgressRows($user, [
                    [112, 1, 'memorised', 80, 12],
                    [112, 2, 'memorised', 76, 11],
                    [112, 3, 'reviewing', 50, 6],
                    [112, 4, 'learning', 35, 4],
                ]);
                $this->createSession($user, [
                    'surah_number' => 112,
                    'ayah_number' => 4,
                    'current_step' => 3,
                    'memorisation_mode' => 'advanced',
                    'status' => UserSessionStatus::Completed,
                    'repetitions_completed' => 4,
                    'session_duration_seconds' => 540,
                    'started_at' => now()->subHours(8),
                    'ended_at' => now()->subHours(8)->addMinutes(9),
                    'last_activity_at' => now()->subHours(8)->addMinutes(9),
                    'start_idempotency_key' => "practice-active-{$user->id}",
                    'metadata' => ['technique' => 'chaining', 'ayah_start' => 1, 'ayah_end' => 4],
                ]);
                $this->seedAnalyticsStreak($user, days: 12, baseMinutes: 16, startStreak: 1);
            }

            if ($profile === 'reviser_lite') {
                $this->upsertProgressRows($user, [
                    [113, 1, 'reviewing', 42, 7],
                    [113, 2, 'reviewing', 38, 6],
                ]);
                $session = $this->createSession($user, [
                    'surah_number' => 113,
                    'ayah_number' => 2,
                    'current_step' => 1,
                    'memorisation_mode' => 'revision',
                    'status' => UserSessionStatus::Completed,
                    'repetitions_completed' => 5,
                    'session_duration_seconds' => 660,
                    'started_at' => now()->subHours(10),
                    'ended_at' => now()->subHours(10)->addMinutes(11),
                    'last_activity_at' => now()->subHours(10)->addMinutes(11),
                    'start_idempotency_key' => "practice-reviser-{$user->id}",
                    'metadata' => ['technique' => 'focus', 'ayah_start' => 1, 'ayah_end' => 2],
                ]);
                $rec = $this->createRecommendation($user, [
                    'source_session_id' => $session->id,
                    'surah_number' => 113,
                    'ayah_start' => 1,
                    'ayah_end' => 2,
                    'recommendation_type' => RecommendationType::TestWithAiRecite->value,
                    'reason_code' => RecommendationReasonCode::AdaptiveCheckWeak->value,
                    'session_mode' => 'manual',
                    'status' => RecommendationStatus::Generated,
                    'ai_assessment' => ['band' => 'weak', 'accuracy_percent' => 44],
                    'idempotency_key' => "practice-reviser-ai-{$user->id}",
                ]);
                AiReciteAttempt::updateOrCreate(
                    [
                        'session_recommendation_id' => $rec->id,
                        'attempt_number' => 1,
                    ],
                    [
                        'user_id' => $user->id,
                        'user_session_id' => $session->id,
                        'accuracy_percent' => 44,
                        'band' => 'weak',
                        'ayah_range' => ['surah' => 113, 'start' => 1, 'end' => 2],
                        'color_counts' => ['green' => 3, 'yellow' => 4, 'red' => 6],
                        'weak_words' => [
                            ['ayah' => 1, 'word' => 'الفلق', 'confidence' => 0.4],
                        ],
                        'word_statuses' => [
                            ['ayah' => 1, 'status' => 'partial'],
                            ['ayah' => 2, 'status' => 'incorrect'],
                        ],
                    ]
                );
                $this->seedAnalyticsStreak($user, days: 6, baseMinutes: 15, startStreak: 1);
            }
        }
    }

    private function seedContactSubmissions(): void
    {
        $rows = [
            [
                'email' => 'parent.question@example.com',
                'name' => 'Sara Ibrahim',
                'subject' => 'How do practice plans work?',
                'message' => 'Assalamu alaykum — after an AI recite check, my daughter got a practice plan. Can she change the technique?',
                'status' => 'pending',
                'created_at' => now()->subHours(5),
            ],
            [
                'email' => 'billing.help@example.com',
                'name' => 'James Okonkwo',
                'subject' => 'Premium trial ending soon',
                'message' => 'I am on a trial and want to know if my streak and progress stay if I cancel before converting.',
                'status' => 'pending',
                'created_at' => now()->subDay(),
            ],
            [
                'email' => 'teacher.feedback@example.com',
                'name' => 'Ustadha Maryam',
                'subject' => 'Suggestion: more tajweed cues',
                'message' => 'Love the chaining mode. A light tajweed hint on madd letters would help beginners.',
                'status' => 'resolved',
                'created_at' => now()->subDays(3),
            ],
        ];

        foreach ($rows as $row) {
            ContactSubmission::updateOrCreate(
                [
                    'email' => $row['email'],
                    'subject' => $row['subject'],
                ],
                [
                    'name' => $row['name'],
                    'message' => $row['message'],
                    'status' => $row['status'],
                    'created_at' => $row['created_at'],
                    'updated_at' => $row['created_at'],
                ]
            );
        }
    }

    /**
     * @param  list<array{0:int,1:int,2:string,3:int,4:int}>  $rows
     */
    private function upsertProgressRows(User $user, array $rows): void
    {
        foreach ($rows as [$surah, $ayah, $status, $mastery, $reps]) {
            $completed = in_array($status, ['memorised', 'mastered'], true)
                ? now()->subDays(max(1, (int) ((100 - $mastery) / 10)))
                : null;

            MemorisationProgress::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'surah_number' => $surah,
                    'ayah_number' => $ayah,
                ],
                [
                    'status' => $status,
                    'mastery_level' => $mastery,
                    'repetitions' => $reps,
                    'completed_at' => $completed,
                    'metadata' => [
                        'zone' => match (true) {
                            $mastery >= 80 => 'strong',
                            $mastery >= 50 => 'mixed',
                            default => 'weak',
                        },
                        'last_review' => now()->subHours(rand(2, 48))->toIso8601String(),
                        'engine_status' => match ($status) {
                            'mastered' => 'mastered',
                            'memorised' => 'reviewed',
                            'reviewing' => 'weak',
                            default => 'learning',
                        },
                    ],
                ]
            );
        }
    }

    private function createSession(User $user, array $attrs): UserSession
    {
        $key = $attrs['start_idempotency_key'];

        return UserSession::updateOrCreate(
            [
                'user_id' => $user->id,
                'start_idempotency_key' => $key,
            ],
            array_merge([
                'attempt_number' => 1,
                'is_onboarding_example' => false,
                'status' => UserSessionStatus::None,
            ], $attrs)
        );
    }

    private function createRecommendation(User $user, array $attrs): SessionRecommendation
    {
        $key = $attrs['idempotency_key'];

        return SessionRecommendation::updateOrCreate(
            [
                'user_id' => $user->id,
                'idempotency_key' => $key,
            ],
            array_merge([
                'status' => RecommendationStatus::Generated,
                'chose_other' => false,
                'accepted' => null,
            ], $attrs)
        );
    }

    private function upsertLastPosition(User $user, int $surah, int $ayah, int $step, array $metadata): void
    {
        UserLastPosition::updateOrCreate(
            ['user_id' => $user->id],
            [
                'surah_number' => $surah,
                'ayah_number' => $ayah,
                'last_step' => $step,
                'metadata' => $metadata,
                'last_opened_at' => now()->subMinutes(rand(15, 180)),
            ]
        );
    }

    private function upsertSyncState(User $user, array $state, string $deviceId, string $deviceLabel): void
    {
        $encoded = json_encode($state, JSON_UNESCAPED_UNICODE);

        MemorisationSyncState::updateOrCreate(
            ['user_id' => $user->id],
            [
                'state' => $encoded,
                'device_id' => $deviceId,
                'device_label' => $deviceLabel,
                'payload_hash' => hash('sha256', (string) $encoded),
                'state_updated_at' => now()->subMinutes(30),
                'last_pulled_at' => now()->subMinutes(10),
            ]
        );
    }

    private function seedAnalyticsStreak(User $user, int $days, int $baseMinutes, int $startStreak): void
    {
        for ($i = $days - 1; $i >= 0; $i--) {
            /** @var Carbon $date */
            $date = now()->subDays($i)->startOfDay();
            $streak = $startStreak + ($days - 1 - $i);
            $minutes = max(5, $baseMinutes + (($days - $i) % 5) * 3 - ($i % 2));
            $sessionDate = $date->toDateString();

            $analytic = LearningAnalytic::query()
                ->where('user_id', $user->id)
                ->whereDate('session_date', $sessionDate)
                ->first();

            $payload = [
                'session_date' => $sessionDate,
                'sessions_completed' => $i === 0 ? 2 : 1,
                'total_minutes' => $minutes,
                'ayahs_memorised' => $i % 3 === 0 ? 2 : 1,
                'ayahs_reviewed' => $i % 2 === 0 ? 3 : 1,
                'streak_day' => $streak,
                'metadata' => [
                    'source' => 'demo_seeder',
                    'weekday' => $date->englishDayOfWeek,
                ],
            ];

            if ($analytic) {
                $analytic->update($payload);
            } else {
                LearningAnalytic::create(array_merge(['user_id' => $user->id], $payload));
            }
        }
    }
}
