<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_last_positions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('surah_number')->nullable();
            $table->unsignedSmallInteger('ayah_number')->nullable();
            $table->unsignedInteger('last_step')->default(0);
            $table->json('metadata')->nullable();
            $table->timestamp('last_opened_at')->nullable();
            $table->timestamps();

            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_last_positions');
    }
};
