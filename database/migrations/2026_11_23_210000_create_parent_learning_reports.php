<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('parent_learning_reports')) {
            return;
        }

        Schema::create('parent_learning_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('cadence', 16);
            $table->date('period_start');
            $table->date('period_end');
            $table->timestamp('generated_at');
            $table->json('payload');
            $table->timestamps();
            $table->unique(['student_user_id', 'cadence', 'period_start'], 'parent_report_period_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parent_learning_reports');
    }
};
