<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teacher_word_coaching_corrections', function (Blueprint $table) {
            $table->string('category', 24)->nullable()->after('finding');
            $table->string('severity', 16)->nullable()->after('category');
            $table->string('granularity', 12)->default('word')->after('severity');
            $table->unsignedInteger('start_ms')->nullable()->after('audio_duration_ms');
            $table->unsignedInteger('end_ms')->nullable()->after('start_ms');
            $table->boolean('is_published')->default(true)->after('end_ms');
            $table->boolean('is_draft')->default(false)->after('is_published');
            $table->softDeletes();
        });

        Schema::create('mushaf_annotations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->string('context_type', 32);
            $table->unsignedBigInteger('context_id')->default(0);
            $table->unsignedTinyInteger('surah_number');
            $table->unsignedSmallInteger('ayah_number');
            $table->unsignedSmallInteger('word_index')->nullable();
            $table->string('granularity', 12)->default('word');
            $table->string('category', 24);
            $table->string('severity', 16)->nullable();
            $table->string('structured_rule', 32)->nullable();
            $table->text('guidance')->nullable();
            $table->string('audio_disk', 32)->nullable();
            $table->string('audio_path')->nullable();
            $table->string('audio_mime', 80)->nullable();
            $table->unsignedInteger('audio_bytes')->nullable();
            $table->unsignedInteger('audio_duration_ms')->nullable();
            $table->unsignedInteger('start_ms')->nullable();
            $table->unsignedInteger('end_ms')->nullable();
            $table->boolean('is_published')->default(false);
            $table->boolean('is_draft')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['student_id', 'surah_number', 'ayah_number', 'word_index'], 'mushaf_annotations_student_loc_idx');
            $table->index(['teacher_id', 'context_type', 'context_id'], 'mushaf_annotations_context_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mushaf_annotations');

        Schema::table('teacher_word_coaching_corrections', function (Blueprint $table) {
            $table->dropSoftDeletes();
            $table->dropColumn([
                'category',
                'severity',
                'granularity',
                'start_ms',
                'end_ms',
                'is_published',
                'is_draft',
            ]);
        });
    }
};