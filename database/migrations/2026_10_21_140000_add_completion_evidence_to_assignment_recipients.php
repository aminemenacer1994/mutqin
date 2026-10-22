<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teacher_assignment_recipients', function (Blueprint $table) {
            $table->json('completion_evidence')->nullable()->after('student_completed_at');
        });
    }

    public function down(): void
    {
        Schema::table('teacher_assignment_recipients', function (Blueprint $table) {
            $table->dropColumn('completion_evidence');
        });
    }
};
