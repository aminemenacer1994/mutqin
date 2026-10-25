<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teacher_notes', function (Blueprint $table) {
            $table->string('audio_disk', 32)->nullable()->after('body');
            $table->string('audio_path', 255)->nullable()->after('audio_disk');
            $table->string('audio_mime', 64)->nullable()->after('audio_path');
            $table->unsignedInteger('audio_bytes')->nullable()->after('audio_mime');
            $table->unsignedInteger('audio_duration_ms')->nullable()->after('audio_bytes');
        });
    }

    public function down(): void
    {
        Schema::table('teacher_notes', function (Blueprint $table) {
            $table->dropColumn([
                'audio_disk',
                'audio_path',
                'audio_mime',
                'audio_bytes',
                'audio_duration_ms',
            ]);
        });
    }
};
