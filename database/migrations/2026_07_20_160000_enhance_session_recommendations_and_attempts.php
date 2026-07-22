<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('session_recommendations')) {
            Schema::table('session_recommendations', function (Blueprint $table) {
                if (! Schema::hasColumn('session_recommendations', 'status')) {
                    $table->string('status', 32)->default('generated')->after('session_mode');
                }
                if (! Schema::hasColumn('session_recommendations', 'range_kind')) {
                    $table->string('range_kind', 24)->nullable()->after('status');
                }
                if (! Schema::hasColumn('session_recommendations', 'recommended_technique')) {
                    $table->string('recommended_technique', 32)->nullable()->after('range_kind');
                }
                if (! Schema::hasColumn('session_recommendations', 'recommended_reciter')) {
                    $table->string('recommended_reciter', 64)->nullable()->after('recommended_technique');
                }
                if (! Schema::hasColumn('session_recommendations', 'recommended_playback_speed')) {
                    $table->decimal('recommended_playback_speed', 4, 2)->nullable()->after('recommended_reciter');
                }
                if (! Schema::hasColumn('session_recommendations', 'recommended_repetitions')) {
                    $table->unsignedTinyInteger('recommended_repetitions')->nullable()->after('recommended_playback_speed');
                }
                if (! Schema::hasColumn('session_recommendations', 'recommended_ayat_per_step')) {
                    $table->unsignedTinyInteger('recommended_ayat_per_step')->nullable()->after('recommended_repetitions');
                }
                if (! Schema::hasColumn('session_recommendations', 'recommended_settings')) {
                    $table->json('recommended_settings')->nullable()->after('recommended_ayat_per_step');
                }
                if (! Schema::hasColumn('session_recommendations', 'settings_overrides')) {
                    $table->json('settings_overrides')->nullable()->after('recommended_settings');
                }
                if (! Schema::hasColumn('session_recommendations', 'confidence_feedback')) {
                    $table->string('confidence_feedback', 32)->nullable()->after('settings_overrides');
                }
                if (! Schema::hasColumn('session_recommendations', 'ai_assessment')) {
                    $table->json('ai_assessment')->nullable()->after('confidence_feedback');
                }
                if (! Schema::hasColumn('session_recommendations', 'supersedes_recommendation_id')) {
                    $table->foreignId('supersedes_recommendation_id')
                        ->nullable()
                        ->after('ai_assessment')
                        ->constrained('session_recommendations')
                        ->nullOnDelete();
                }
                if (! Schema::hasColumn('session_recommendations', 'idempotency_key')) {
                    $table->string('idempotency_key', 128)->nullable()->after('supersedes_recommendation_id');
                }
            });

            if (
                Schema::hasColumn('session_recommendations', 'status')
                && ! Schema::hasIndex('session_recommendations', 'session_recommendations_user_id_status_index')
            ) {
                Schema::table('session_recommendations', function (Blueprint $table) {
                    $table->index(['user_id', 'status']);
                });
            }
            if (
                Schema::hasColumn('session_recommendations', 'status')
                && ! Schema::hasIndex('session_recommendations', 'session_recommendations_user_id_source_session_id_status_index')
            ) {
                Schema::table('session_recommendations', function (Blueprint $table) {
                    $table->index(['user_id', 'source_session_id', 'status']);
                });
            }
            if (
                Schema::hasColumn('session_recommendations', 'idempotency_key')
                && ! Schema::hasIndex('session_recommendations', 'session_recommendations_user_idempotency_unique')
            ) {
                Schema::table('session_recommendations', function (Blueprint $table) {
                    $table->unique(['user_id', 'idempotency_key'], 'session_recommendations_user_idempotency_unique');
                });
            }
        }

        if (Schema::hasTable('user_sessions')) {
            Schema::table('user_sessions', function (Blueprint $table) {
                if (! Schema::hasColumn('user_sessions', 'repeated_from_session_id')) {
                    $table->foreignId('repeated_from_session_id')
                        ->nullable()
                        ->after('ended_at')
                        ->constrained('user_sessions')
                        ->nullOnDelete();
                }
                if (! Schema::hasColumn('user_sessions', 'attempt_number')) {
                    $table->unsignedSmallInteger('attempt_number')->default(1)->after('repeated_from_session_id');
                }
                if (! Schema::hasColumn('user_sessions', 'recommendation_id')) {
                    $table->foreignId('recommendation_id')
                        ->nullable()
                        ->after('attempt_number')
                        ->constrained('session_recommendations')
                        ->nullOnDelete();
                }
                if (! Schema::hasColumn('user_sessions', 'recommendation_source')) {
                    $table->string('recommendation_source', 40)->nullable()->after('recommendation_id');
                }
                if (! Schema::hasColumn('user_sessions', 'completion_settings')) {
                    $table->json('completion_settings')->nullable()->after('recommendation_source');
                }
                if (! Schema::hasColumn('user_sessions', 'start_idempotency_key')) {
                    $table->string('start_idempotency_key', 128)->nullable()->after('completion_settings');
                }
            });

            if (
                Schema::hasColumn('user_sessions', 'repeated_from_session_id')
                && ! Schema::hasIndex('user_sessions', 'user_sessions_user_id_repeated_from_session_id_index')
            ) {
                Schema::table('user_sessions', function (Blueprint $table) {
                    $table->index(['user_id', 'repeated_from_session_id']);
                });
            }
            if (
                Schema::hasColumn('user_sessions', 'start_idempotency_key')
                && ! Schema::hasIndex('user_sessions', 'user_sessions_user_start_idempotency_unique')
            ) {
                Schema::table('user_sessions', function (Blueprint $table) {
                    $table->unique(['user_id', 'start_idempotency_key'], 'user_sessions_user_start_idempotency_unique');
                });
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('user_sessions')) {
            Schema::table('user_sessions', function (Blueprint $table) {
                if (Schema::hasIndex('user_sessions', 'user_sessions_user_start_idempotency_unique')) {
                    $table->dropUnique('user_sessions_user_start_idempotency_unique');
                }
                if (Schema::hasIndex('user_sessions', 'user_sessions_user_id_repeated_from_session_id_index')) {
                    $table->dropIndex(['user_id', 'repeated_from_session_id']);
                }
                if (Schema::hasColumn('user_sessions', 'recommendation_id')) {
                    $table->dropConstrainedForeignId('recommendation_id');
                }
                if (Schema::hasColumn('user_sessions', 'repeated_from_session_id')) {
                    $table->dropConstrainedForeignId('repeated_from_session_id');
                }
                $drop = array_values(array_filter([
                    Schema::hasColumn('user_sessions', 'attempt_number') ? 'attempt_number' : null,
                    Schema::hasColumn('user_sessions', 'recommendation_source') ? 'recommendation_source' : null,
                    Schema::hasColumn('user_sessions', 'completion_settings') ? 'completion_settings' : null,
                    Schema::hasColumn('user_sessions', 'start_idempotency_key') ? 'start_idempotency_key' : null,
                ]));
                if ($drop !== []) {
                    $table->dropColumn($drop);
                }
            });
        }

        if (Schema::hasTable('session_recommendations')) {
            Schema::table('session_recommendations', function (Blueprint $table) {
                if (Schema::hasIndex('session_recommendations', 'session_recommendations_user_idempotency_unique')) {
                    $table->dropUnique('session_recommendations_user_idempotency_unique');
                }
                if (Schema::hasIndex('session_recommendations', 'session_recommendations_user_id_status_index')) {
                    $table->dropIndex(['user_id', 'status']);
                }
                if (Schema::hasIndex('session_recommendations', 'session_recommendations_user_id_source_session_id_status_index')) {
                    $table->dropIndex(['user_id', 'source_session_id', 'status']);
                }
                if (Schema::hasColumn('session_recommendations', 'supersedes_recommendation_id')) {
                    $table->dropConstrainedForeignId('supersedes_recommendation_id');
                }
                $drop = array_values(array_filter([
                    Schema::hasColumn('session_recommendations', 'status') ? 'status' : null,
                    Schema::hasColumn('session_recommendations', 'range_kind') ? 'range_kind' : null,
                    Schema::hasColumn('session_recommendations', 'recommended_technique') ? 'recommended_technique' : null,
                    Schema::hasColumn('session_recommendations', 'recommended_reciter') ? 'recommended_reciter' : null,
                    Schema::hasColumn('session_recommendations', 'recommended_playback_speed') ? 'recommended_playback_speed' : null,
                    Schema::hasColumn('session_recommendations', 'recommended_repetitions') ? 'recommended_repetitions' : null,
                    Schema::hasColumn('session_recommendations', 'recommended_ayat_per_step') ? 'recommended_ayat_per_step' : null,
                    Schema::hasColumn('session_recommendations', 'recommended_settings') ? 'recommended_settings' : null,
                    Schema::hasColumn('session_recommendations', 'settings_overrides') ? 'settings_overrides' : null,
                    Schema::hasColumn('session_recommendations', 'confidence_feedback') ? 'confidence_feedback' : null,
                    Schema::hasColumn('session_recommendations', 'ai_assessment') ? 'ai_assessment' : null,
                    Schema::hasColumn('session_recommendations', 'idempotency_key') ? 'idempotency_key' : null,
                ]));
                if ($drop !== []) {
                    $table->dropColumn($drop);
                }
            });
        }
    }
};
