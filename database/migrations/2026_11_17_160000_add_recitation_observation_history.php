<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teacher_recitation_assessments', function (Blueprint $table) {
            $table->unsignedTinyInteger('tajweed_score')->nullable()->change();
            $table->json('observations')->nullable()->after('annotation');
        });

        Schema::table('teacher_assignments', function (Blueprint $table) {
            $table->foreignId('source_ai_recite_attempt_id')
                ->nullable()
                ->after('feedback')
                ->constrained('ai_recite_attempts')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('teacher_assignments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('source_ai_recite_attempt_id');
        });

        Schema::table('teacher_recitation_assessments', function (Blueprint $table) {
            $table->dropColumn('observations');
            $table->unsignedTinyInteger('tajweed_score')->nullable(false)->change();
        });
    }
};
