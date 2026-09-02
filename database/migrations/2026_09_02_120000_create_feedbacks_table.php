<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feedbacks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 32);
            $table->text('message');
            $table->string('status', 16)->default('new');
            $table->json('context')->nullable();
            $table->unsignedBigInteger('ai_check_id')->nullable();
            $table->string('ai_check_source', 32)->nullable();
            $table->string('ai_reason', 64)->nullable();
            $table->string('screenshot_path')->nullable();
            $table->text('admin_note')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index(['type', 'created_at']);
            $table->index(['user_id', 'created_at']);
            $table->unique(
                ['user_id', 'type', 'ai_check_id', 'ai_check_source'],
                'feedbacks_user_ai_complaint_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feedbacks');
    }
};
