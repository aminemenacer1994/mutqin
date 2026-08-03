<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Extend practice plans with lifecycle / scope fields for dashboard queries.
 * Existing JSON config remains authoritative for rich settings.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('memorisation_practice_plans')) {
            return;
        }

        Schema::table('memorisation_practice_plans', function (Blueprint $table) {
            if (! Schema::hasColumn('memorisation_practice_plans', 'follow_up_assessment_id')) {
                $table->foreignId('follow_up_assessment_id')
                    ->nullable()
                    ->after('session_recommendation_id')
                    ->constrained('memorisation_assessments')
                    ->nullOnDelete();
            }
            if (! Schema::hasColumn('memorisation_practice_plans', 'practice_scope')) {
                $table->string('practice_scope', 24)->nullable()->after('status');
            }
            if (! Schema::hasColumn('memorisation_practice_plans', 'recommended_technique')) {
                $table->string('recommended_technique', 32)->nullable()->after('practice_scope');
            }
            if (! Schema::hasColumn('memorisation_practice_plans', 'recommended_repetitions')) {
                $table->unsignedTinyInteger('recommended_repetitions')->nullable()->after('recommended_technique');
            }
            if (! Schema::hasColumn('memorisation_practice_plans', 'recommended_playback_speed')) {
                $table->decimal('recommended_playback_speed', 4, 2)->nullable()->after('recommended_repetitions');
            }
            if (! Schema::hasColumn('memorisation_practice_plans', 'recommended_review_at')) {
                $table->timestamp('recommended_review_at')->nullable()->after('recommended_playback_speed');
            }
            if (! Schema::hasColumn('memorisation_practice_plans', 'accepted_at')) {
                $table->timestamp('accepted_at')->nullable()->after('recommended_review_at');
            }
            if (! Schema::hasColumn('memorisation_practice_plans', 'dismissed_at')) {
                $table->timestamp('dismissed_at')->nullable()->after('accepted_at');
            }
            if (! Schema::hasColumn('memorisation_practice_plans', 'completion_outcome')) {
                $table->string('completion_outcome', 32)->nullable()->after('completed_at');
            }
            if (! Schema::hasColumn('memorisation_practice_plans', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        Schema::table('memorisation_practice_plans', function (Blueprint $table) {
            try {
                $table->index(['user_id', 'practice_scope', 'status'], 'practice_plans_user_scope_status_idx');
            } catch (\Throwable) {
                //
            }
            try {
                $table->index(['user_id', 'recommended_review_at'], 'practice_plans_user_review_idx');
            } catch (\Throwable) {
                //
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('memorisation_practice_plans')) {
            return;
        }

        Schema::table('memorisation_practice_plans', function (Blueprint $table) {
            try {
                $table->dropIndex('practice_plans_user_scope_status_idx');
            } catch (\Throwable) {
                //
            }
            try {
                $table->dropIndex('practice_plans_user_review_idx');
            } catch (\Throwable) {
                //
            }

            if (Schema::hasColumn('memorisation_practice_plans', 'follow_up_assessment_id')) {
                $table->dropConstrainedForeignId('follow_up_assessment_id');
            }

            $columns = [
                'practice_scope',
                'recommended_technique',
                'recommended_repetitions',
                'recommended_playback_speed',
                'recommended_review_at',
                'accepted_at',
                'dismissed_at',
                'completion_outcome',
                'deleted_at',
            ];
            $existing = array_values(array_filter(
                $columns,
                fn (string $column) => Schema::hasColumn('memorisation_practice_plans', $column)
            ));
            if ($existing !== []) {
                $table->dropColumn($existing);
            }
        });
    }
};
