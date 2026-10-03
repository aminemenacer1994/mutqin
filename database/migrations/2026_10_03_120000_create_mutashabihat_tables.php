<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('mutashabihat_pairs')) {
            Schema::create('mutashabihat_pairs', function (Blueprint $table) {
                $table->id();
                $table->unsignedTinyInteger('surah_number_1');
                $table->unsignedSmallInteger('ayah_number_1');
                $table->unsignedTinyInteger('surah_number_2');
                $table->unsignedSmallInteger('ayah_number_2');
                $table->string('verse_key_1', 16);
                $table->string('verse_key_2', 16);
                $table->string('pair_key', 32)->unique();
                $table->string('source', 64)->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();

                $table->index(['verse_key_1'], 'mutashabihat_pairs_vk1_idx');
                $table->index(['verse_key_2'], 'mutashabihat_pairs_vk2_idx');
            });
        }

        if (! Schema::hasTable('user_mutashabihat_progress')) {
            Schema::create('user_mutashabihat_progress', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('mutashabihat_pair_id')->constrained('mutashabihat_pairs')->cascadeOnDelete();
                $table->string('expected_verse_key', 16);
                $table->string('confused_verse_key', 16);
                $table->unsignedInteger('confusion_count')->default(0);
                $table->unsignedInteger('practice_attempts')->default(0);
                $table->unsignedInteger('successful_attempts')->default(0);
                $table->string('status', 24)->default('needs_practice');
                $table->timestamp('last_practised_at')->nullable();
                $table->timestamp('last_confused_at')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();

                $table->unique(['user_id', 'mutashabihat_pair_id'], 'user_mutashabihat_pair_unique');
                $table->index(['user_id', 'status'], 'user_mutashabihat_status_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('user_mutashabihat_progress');
        Schema::dropIfExists('mutashabihat_pairs');
    }
};
