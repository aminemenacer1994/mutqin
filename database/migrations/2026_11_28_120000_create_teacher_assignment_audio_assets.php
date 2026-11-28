<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teacher_assignment_audio_assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('organisation_id')->constrained('organisations')->cascadeOnDelete();
            $table->string('role', 32);
            $table->string('audio_disk', 32)->nullable();
            $table->string('audio_path', 255)->nullable();
            $table->string('audio_mime', 64)->nullable();
            $table->unsignedInteger('audio_bytes')->nullable();
            $table->unsignedInteger('audio_duration_ms')->nullable();
            $table->timestamps();

            $table->index(['teacher_id', 'role']);
        });

        Schema::create('teacher_assignment_audio_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_assignment_id')->constrained('teacher_assignments')->cascadeOnDelete();
            $table->foreignId('audio_asset_id')->constrained('teacher_assignment_audio_assets')->cascadeOnDelete();
            $table->string('role', 32);
            $table->timestamp('published_at');
            $table->timestamp('superseded_at')->nullable();
            $table->timestamps();

            $table->index(['teacher_assignment_id', 'role'], 'ta_audio_revisions_assignment_role_idx');
        });

        Schema::table('teacher_assignments', function (Blueprint $table) {
            $table->foreignId('instruction_audio_asset_id')
                ->nullable()
                ->after('feedback')
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
        Schema::table('teacher_assignments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('recitation_demo_audio_asset_id');
            $table->dropConstrainedForeignId('instruction_audio_asset_id');
        });

        Schema::dropIfExists('teacher_assignment_audio_revisions');
        Schema::dropIfExists('teacher_assignment_audio_assets');
    }
};