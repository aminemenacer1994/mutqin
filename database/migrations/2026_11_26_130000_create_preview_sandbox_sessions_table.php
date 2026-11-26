<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('preview_sandbox_sessions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('owner_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('classroom_key', 64)->nullable();
            $table->string('catalog', 64)->nullable();
            $table->string('active_persona', 64)->nullable();
            $table->timestamp('expires_at');
            $table->timestamp('last_activity_at');
            $table->timestamp('reset_at')->nullable();
            $table->json('quotas')->nullable();
            $table->timestamps();

            $table->index(['owner_user_id', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('preview_sandbox_sessions');
    }
};
