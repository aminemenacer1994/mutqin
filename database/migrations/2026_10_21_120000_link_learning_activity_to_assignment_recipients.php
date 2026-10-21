<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_sessions', function (Blueprint $table) {
            $table->foreignId('teacher_assignment_recipient_id')
                ->nullable()
                ->after('user_id')
                ->constrained('teacher_assignment_recipients')
                ->nullOnDelete();
            $table->index(
                ['teacher_assignment_recipient_id', 'status'],
                'user_sessions_assignment_recipient_status_idx'
            );
        });

        Schema::table('ai_recite_attempts', function (Blueprint $table) {
            $table->foreignId('teacher_assignment_recipient_id')
                ->nullable()
                ->after('user_id')
                ->constrained('teacher_assignment_recipients')
                ->nullOnDelete();
            $table->index(
                ['teacher_assignment_recipient_id', 'created_at'],
                'ai_recite_attempts_assignment_recipient_created_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::table('ai_recite_attempts', function (Blueprint $table) {
            $table->dropIndex('ai_recite_attempts_assignment_recipient_created_idx');
            $table->dropConstrainedForeignId('teacher_assignment_recipient_id');
        });

        Schema::table('user_sessions', function (Blueprint $table) {
            $table->dropIndex('user_sessions_assignment_recipient_status_idx');
            $table->dropConstrainedForeignId('teacher_assignment_recipient_id');
        });
    }
};
