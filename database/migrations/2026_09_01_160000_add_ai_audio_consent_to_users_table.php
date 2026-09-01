<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('ai_audio_consent_status', 20)->nullable()->after('theme');
            $table->string('ai_audio_consent_version', 64)->nullable()->after('ai_audio_consent_status');
            $table->timestamp('ai_audio_consent_at')->nullable()->after('ai_audio_consent_version');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'ai_audio_consent_status',
                'ai_audio_consent_version',
                'ai_audio_consent_at',
            ]);
        });
    }
};
