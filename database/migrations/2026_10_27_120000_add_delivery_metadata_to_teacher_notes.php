<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teacher_notes', function (Blueprint $table) {
            $table->uuid('client_message_id')->nullable()->after('body');
            $table->timestamp('read_at')->nullable()->after('client_message_id');
            $table->unique(
                ['teacher_id', 'student_id', 'client_message_id'],
                'teacher_notes_thread_client_unique',
            );
            $table->index(['teacher_id', 'student_id', 'read_at'], 'teacher_notes_thread_read_idx');
        });
    }

    public function down(): void
    {
        Schema::table('teacher_notes', function (Blueprint $table) {
            $table->dropUnique('teacher_notes_thread_client_unique');
            $table->dropIndex('teacher_notes_thread_read_idx');
            $table->dropColumn(['client_message_id', 'read_at']);
        });
    }
};
