<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ai_recite_attempts')) {
            return;
        }

        Schema::table('ai_recite_attempts', function (Blueprint $table) {
            if (! Schema::hasColumn('ai_recite_attempts', 'source')) {
                $table->string('source', 32)->nullable()->after('user_session_id');
            }
            if (! Schema::hasColumn('ai_recite_attempts', 'peek_used')) {
                $table->boolean('peek_used')->default(false)->after('band');
            }
            if (! Schema::hasColumn('ai_recite_attempts', 'duration_ms')) {
                $table->unsignedInteger('duration_ms')->nullable()->after('peek_used');
            }
            if (! Schema::hasColumn('ai_recite_attempts', 'memorisation_assessment_id')) {
                $table->foreignId('memorisation_assessment_id')
                    ->nullable()
                    ->after('user_session_id')
                    ->constrained('memorisation_assessments')
                    ->nullOnDelete();
            }
        });

        Schema::table('ai_recite_attempts', function (Blueprint $table) {
            $table->index(['user_id', 'source', 'created_at'], 'ai_recite_attempts_user_source_created_idx');
            $table->unique('memorisation_assessment_id', 'ai_recite_attempts_assessment_unique');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('ai_recite_attempts')) {
            return;
        }

        Schema::table('ai_recite_attempts', function (Blueprint $table) {
            if (Schema::hasColumn('ai_recite_attempts', 'memorisation_assessment_id')) {
                $table->dropUnique('ai_recite_attempts_assessment_unique');
                $table->dropConstrainedForeignId('memorisation_assessment_id');
            }
            if (Schema::hasColumn('ai_recite_attempts', 'source')) {
                $table->dropIndex('ai_recite_attempts_user_source_created_idx');
                $table->dropColumn('source');
            }
            if (Schema::hasColumn('ai_recite_attempts', 'peek_used')) {
                $table->dropColumn('peek_used');
            }
            if (Schema::hasColumn('ai_recite_attempts', 'duration_ms')) {
                $table->dropColumn('duration_ms');
            }
        });
    }
};
