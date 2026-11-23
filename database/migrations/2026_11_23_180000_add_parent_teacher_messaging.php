<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('teacher_notes', 'parent_user_id')) {
            Schema::table('teacher_notes', function (Blueprint $table) {
                $table->foreignId('parent_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('reported_at')->nullable();
                $table->string('report_reason', 500)->nullable();
                $table->index(['parent_user_id', 'teacher_id', 'student_id'], 'tn_parent_thread_idx');
            });
        }

        if (! Schema::hasColumn('users', 'parent_notice_preferences')) {
            Schema::table('users', function (Blueprint $table) {
                $table->json('parent_notice_preferences')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('teacher_notes', 'parent_user_id')) {
            Schema::table('teacher_notes', function (Blueprint $table) {
                $table->dropIndex('tn_parent_thread_idx');
                $table->dropConstrainedForeignId('parent_user_id');
                $table->dropColumn(['reported_at', 'report_reason']);
            });
        }

        if (Schema::hasColumn('users', 'parent_notice_preferences')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('parent_notice_preferences');
            });
        }
    }
};
