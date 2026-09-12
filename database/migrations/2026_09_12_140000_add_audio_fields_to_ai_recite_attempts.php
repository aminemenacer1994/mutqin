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
            if (! Schema::hasColumn('ai_recite_attempts', 'audio_disk')) {
                $table->string('audio_disk', 32)->nullable()->after('plan_snapshot');
            }
            if (! Schema::hasColumn('ai_recite_attempts', 'audio_path')) {
                $table->string('audio_path', 255)->nullable()->after('audio_disk');
            }
            if (! Schema::hasColumn('ai_recite_attempts', 'audio_mime')) {
                $table->string('audio_mime', 64)->nullable()->after('audio_path');
            }
            if (! Schema::hasColumn('ai_recite_attempts', 'audio_bytes')) {
                $table->unsignedInteger('audio_bytes')->nullable()->after('audio_mime');
            }
            if (! Schema::hasColumn('ai_recite_attempts', 'audio_duration_ms')) {
                $table->unsignedInteger('audio_duration_ms')->nullable()->after('audio_bytes');
            }
            if (! Schema::hasColumn('ai_recite_attempts', 'audio_expires_at')) {
                $table->timestamp('audio_expires_at')->nullable()->after('audio_duration_ms');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('ai_recite_attempts')) {
            return;
        }

        Schema::table('ai_recite_attempts', function (Blueprint $table) {
            foreach (['audio_disk', 'audio_path', 'audio_mime', 'audio_bytes', 'audio_duration_ms', 'audio_expires_at'] as $column) {
                if (Schema::hasColumn('ai_recite_attempts', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
