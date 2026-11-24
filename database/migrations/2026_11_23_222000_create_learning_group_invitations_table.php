<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('learning_group_invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('learning_group_id')->constrained('learning_groups')->cascadeOnDelete();
            $table->foreignId('invited_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('invited_email', 255)->nullable();
            $table->string('token_hash', 64);
            $table->string('code_hash', 64)->nullable();
            $table->string('status', 32)->default('pending');
            $table->timestamp('expires_at');
            $table->timestamp('accepted_at')->nullable();
            $table->foreignId('accepted_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('group_membership_id')->nullable()->constrained('group_memberships')->nullOnDelete();
            $table->timestamp('revoked_at')->nullable();
            $table->foreignId('revoked_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique('token_hash');
            $table->unique('code_hash');
            $table->index(['learning_group_id', 'status']);
            $table->index(['status', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('learning_group_invitations');
    }
};
