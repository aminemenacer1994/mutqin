<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('memorisation_weak_spots', function (Blueprint $table) {
            $table->string('mistake_kind', 32)->nullable()->after('severity');
            $table->string('teacher_review_status', 24)->nullable()->after('trend'); // confirmed|dismissed
            $table->foreignId('teacher_reviewed_by')->nullable()->after('teacher_review_status')->constrained('users')->nullOnDelete();
            $table->timestamp('teacher_reviewed_at')->nullable()->after('teacher_reviewed_by');
            $table->string('teacher_review_note', 500)->nullable()->after('teacher_reviewed_at');

            $table->index(['teacher_review_status', 'status'], 'weak_spots_teacher_review_status_idx');
        });

        Schema::create('memorisation_weak_spot_occurrences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('weak_spot_id')->constrained('memorisation_weak_spots')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('assessment_id')->constrained('memorisation_assessments')->cascadeOnDelete();
            $table->foreignId('ai_recite_attempt_id')->nullable()->constrained('ai_recite_attempts')->nullOnDelete();
            $table->string('result_type', 32)->nullable(); // wrong|missing|minor_mistake|…
            $table->string('mistake_kind', 32)->nullable(); // substitution|omission|pronunciation|insertion|skipped
            $table->string('visual_status', 16)->nullable(); // green|amber|red|black|gray
            $table->decimal('confidence', 5, 4)->nullable();
            $table->string('detected_token', 120)->nullable();
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->unique(['weak_spot_id', 'assessment_id'], 'weak_spot_occurrence_unique');
            $table->index(['user_id', 'occurred_at'], 'weak_spot_occurrence_user_at_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('memorisation_weak_spot_occurrences');

        Schema::table('memorisation_weak_spots', function (Blueprint $table) {
            $table->dropIndex('weak_spots_teacher_review_status_idx');
            $table->dropConstrainedForeignId('teacher_reviewed_by');
            $table->dropColumn([
                'mistake_kind',
                'teacher_review_status',
                'teacher_reviewed_at',
                'teacher_review_note',
            ]);
        });
    }
};
