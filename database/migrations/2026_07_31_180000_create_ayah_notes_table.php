<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ayah_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('surah_number');
            $table->unsignedSmallInteger('ayah_number');
            $table->string('title', 120)->nullable();
            $table->text('body');
            $table->timestamps();

            $table->index('user_id');
            $table->index(['user_id', 'surah_number']);
            $table->index(['user_id', 'surah_number', 'ayah_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ayah_notes');
    }
};
