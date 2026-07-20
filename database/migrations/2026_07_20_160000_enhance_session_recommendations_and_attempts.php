<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('session_recommendations', function (Blueprint $table) {
            $table->string('status', 32)->default('generated')->after('session_mode');
            $table->string('range_kind', 24)->nullable()->after('status');
            $table->string('recommended_technique', 32)->nullable()->after('range_kind');
            $table->string('recommended_reciter', 64)->nullable()->after('recommended_technique');
            $table->decimal('recommended_playback_speed', 4, 2)->nullable()->after('recommended_reciter');
            $table->unsignedTinyInteger('recommended_repetitions')->nullable()->after('recommended_playback_speed');
            $table->unsignedTinyInteger('recommended_ayat_per_step')->nullable()->after('recommended_repetitions');
            $table->json('recommended_settings')->nullable()->after('recommended_ayat_per_step');
            $table->json('settings_overrides')->nullable()->after('recommended_settings');
            $table->string('confidence_feedback', 32)->nullable()->after('settings_overrides');
            $table->json('ai_assessment')->nullable()->after('confidence_feedback');
            $table->foreignId('supersedes_recommendation_id')
                ->nullable()
                ->after('ai_assessment')
                ->constrained('session_recommendations')
                ->nullOnDelete();
            $table->string('idempotency_key', 128)->nullable()->after('supersedes_recommendation_id');

            $table->index(['user_id', 'status']);
            $table->index(['user_id', 'source_session_id', 'status']);
            $table->unique(['user_id', 'idempotency_key'], 'session_recommendations_user_idempotency_unique');
        });

        Schema::table('user_sessions', function (Blueprint $table) {
            $table->foreignId('repeated_from_session_id')
                ->nullable()
                ->after('ended_at')
                ->constrained('user_sessions')
                ->nullOnDelete();
            $table->unsignedSmallInteger('attempt_number')->default(1)->after('repeated_from_session_id');
            $table->foreignId('recommendation_id')
                ->nullable()
                ->after('attempt_number')
                ->constrained('session_recommendations')
                ->nullOnDelete();
            $table->string('recommendation_source', 40)->nullable()->after('recommendation_id');
            $table->json('completion_settings')->nullable()->after('recommendation_source');
            $table->string('start_idempotency_key', 128)->nullable()->after('completion_settings');

            $table->index(['user_id', 'repeated_from_session_id']);
            $table->unique(['user_id', 'start_idempotency_key'], 'user_sessions_user_start_idempotency_unique');
        });
    }

    public function down(): void
    {
        Schema::table('user_sessions', function (Blueprint $table) {
            $table->dropUnique('user_sessions_user_start_idempotency_unique');
            $table->dropIndex(['user_id', 'repeated_from_session_id']);
            $table->dropConstrainedForeignId('recommendation_id');
            $table->dropConstrainedForeignId('repeated_from_session_id');
            $table->dropColumn([
                'attempt_number',
                'recommendation_source',
                'completion_settings',
                'start_idempotency_key',
            ]);
        });

        Schema::table('session_recommendations', function (Blueprint $table) {
            $table->dropUnique('session_recommendations_user_idempotency_unique');
            $table->dropIndex(['user_id', 'status']);
            $table->dropIndex(['user_id', 'source_session_id', 'status']);
            $table->dropConstrainedForeignId('supersedes_recommendation_id');
            $table->dropColumn([
                'status',
                'range_kind',
                'recommended_technique',
                'recommended_reciter',
                'recommended_playback_speed',
                'recommended_repetitions',
                'recommended_ayat_per_step',
                'recommended_settings',
                'settings_overrides',
                'confidence_feedback',
                'ai_assessment',
                'idempotency_key',
            ]);
        });
    }
};
