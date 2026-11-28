<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('learning_plan_items', function (Blueprint $table) {
            $table->foreignId('instruction_audio_asset_id')
                ->nullable()
                ->after('instructions')
                ->constrained('teacher_assignment_audio_assets')
                ->nullOnDelete();
            $table->foreignId('recitation_demo_audio_asset_id')
                ->nullable()
                ->after('instruction_audio_asset_id')
                ->constrained('teacher_assignment_audio_assets')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('learning_plan_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('recitation_demo_audio_asset_id');
            $table->dropConstrainedForeignId('instruction_audio_asset_id');
        });
    }
};