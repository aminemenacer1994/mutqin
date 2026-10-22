<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teacher_assignment_recipients', function (Blueprint $table) {
            $table->timestamp('student_completed_at')->nullable()->after('completed_at');
            $table->index(['student_id', 'student_completed_at'], 'assignment_recipients_student_completed_idx');
        });
    }

    public function down(): void
    {
        Schema::table('teacher_assignment_recipients', function (Blueprint $table) {
            $table->dropIndex('assignment_recipients_student_completed_idx');
            $table->dropColumn('student_completed_at');
        });
    }
};
