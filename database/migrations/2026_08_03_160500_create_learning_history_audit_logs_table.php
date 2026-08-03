<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Admin audit trail for learning-history changes.
 * Never stores private notes or recording payloads.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('learning_history_audit_logs')) {
            return;
        }

        Schema::create('learning_history_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('actor_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->foreignId('subject_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->string('action', 64);
            $table->string('entity_type', 64);
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->json('changes')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->timestamps();

            $table->index(['subject_user_id', 'created_at'], 'learning_audit_subject_created_idx');
            $table->index(['entity_type', 'entity_id'], 'learning_audit_entity_idx');
            $table->index(['actor_user_id', 'created_at'], 'learning_audit_actor_created_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('learning_history_audit_logs');
    }
};
