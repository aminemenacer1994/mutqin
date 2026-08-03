<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Extend memorisation_assessments into a structured, queryable attempt record
 * without replacing the existing table or losing data.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('memorisation_assessments')) {
            return;
        }

        Schema::table('memorisation_assessments', function (Blueprint $table) {
            if (! Schema::hasColumn('memorisation_assessments', 'idempotency_key')) {
                $table->string('idempotency_key', 64)->nullable()->after('previous_assessment_id');
            }
            if (! Schema::hasColumn('memorisation_assessments', 'status')) {
                $table->string('status', 24)->default('completed')->after('assessment_type');
            }
            if (! Schema::hasColumn('memorisation_assessments', 'completion_state')) {
                $table->string('completion_state', 32)->nullable()->after('status');
            }
            if (! Schema::hasColumn('memorisation_assessments', 'practice_mode')) {
                $table->string('practice_mode', 32)->nullable()->after('completion_state');
            }
            if (! Schema::hasColumn('memorisation_assessments', 'mistake_handling_mode')) {
                $table->string('mistake_handling_mode', 40)->nullable()->after('practice_mode');
            }
            if (! Schema::hasColumn('memorisation_assessments', 'words_visible_percent')) {
                $table->unsignedTinyInteger('words_visible_percent')->nullable()->after('mistake_handling_mode');
            }
            if (! Schema::hasColumn('memorisation_assessments', 'match_result')) {
                $table->string('match_result', 32)->nullable()->after('overall_accuracy');
            }
            if (! Schema::hasColumn('memorisation_assessments', 'model_version')) {
                $table->string('model_version', 64)->nullable()->after('friendly_summary');
            }
            if (! Schema::hasColumn('memorisation_assessments', 'algorithm_version')) {
                $table->string('algorithm_version', 64)->nullable()->after('model_version');
            }
            if (! Schema::hasColumn('memorisation_assessments', 'processing_duration_ms')) {
                $table->unsignedInteger('processing_duration_ms')->nullable()->after('duration_ms');
            }
            if (! Schema::hasColumn('memorisation_assessments', 'failure_reason')) {
                $table->string('failure_reason', 120)->nullable()->after('processing_duration_ms');
            }
            if (! Schema::hasColumn('memorisation_assessments', 'started_at')) {
                $table->timestamp('started_at')->nullable()->after('failure_reason');
            }
            if (! Schema::hasColumn('memorisation_assessments', 'completed_at')) {
                $table->timestamp('completed_at')->nullable()->after('started_at');
            }
            if (! Schema::hasColumn('memorisation_assessments', 'device_metadata')) {
                $table->json('device_metadata')->nullable()->after('completed_at');
            }
            if (! Schema::hasColumn('memorisation_assessments', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        // Nullable idempotency keys: MySQL allows multiple NULLs in a unique index.
        Schema::table('memorisation_assessments', function (Blueprint $table) {
            try {
                $table->unique(['user_id', 'idempotency_key'], 'memorisation_assessments_user_idempotency_unique');
            } catch (\Throwable) {
                //
            }
            try {
                $table->index(['user_id', 'status', 'created_at'], 'memorisation_assessments_user_status_created_idx');
            } catch (\Throwable) {
                //
            }
            try {
                $table->index(['user_id', 'match_result'], 'memorisation_assessments_user_match_idx');
            } catch (\Throwable) {
                //
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('memorisation_assessments')) {
            return;
        }

        Schema::table('memorisation_assessments', function (Blueprint $table) {
            $table->dropUnique('memorisation_assessments_user_idempotency_unique');
            $table->dropIndex('memorisation_assessments_user_status_created_idx');
            $table->dropIndex('memorisation_assessments_user_match_idx');

            $columns = [
                'idempotency_key',
                'status',
                'completion_state',
                'practice_mode',
                'mistake_handling_mode',
                'words_visible_percent',
                'match_result',
                'model_version',
                'algorithm_version',
                'processing_duration_ms',
                'failure_reason',
                'started_at',
                'completed_at',
                'device_metadata',
                'deleted_at',
            ];
            $existing = array_values(array_filter(
                $columns,
                fn (string $column) => Schema::hasColumn('memorisation_assessments', $column)
            ));
            if ($existing !== []) {
                $table->dropColumn($existing);
            }
        });
    }
};
