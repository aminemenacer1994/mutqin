<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parent_invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('invited_email', 255);
            $table->string('relationship', 64)->nullable();
            $table->foreignId('invited_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('token_hash', 64);
            $table->string('status', 32)->default('pending');
            $table->timestamp('expires_at');
            $table->timestamp('sent_at');
            $table->timestamp('accepted_at')->nullable();
            $table->foreignId('accepted_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->foreignId('revoked_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('parent_student_link_id')->nullable()->constrained('parent_student_links')->nullOnDelete();
            $table->timestamps();

            $table->unique('token_hash');
            $table->index(['student_user_id', 'invited_email', 'status'], 'parent_invites_student_email_status_idx');
            $table->index(['status', 'expires_at'], 'parent_invites_status_expiry_idx');
        });

        Schema::create('parent_invitation_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_invitation_id')->constrained('parent_invitations')->cascadeOnDelete();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('event', 64);
            $table->json('metadata')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['parent_invitation_id', 'created_at'], 'parent_invite_events_created_idx');
        });

        Schema::create('parent_link_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('code_hash', 64);
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->foreignId('student_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('parent_student_link_id')->nullable()->constrained('parent_student_links')->nullOnDelete();
            $table->timestamps();

            $table->unique('code_hash');
            $table->index(['parent_user_id', 'used_at'], 'parent_link_codes_parent_used_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parent_link_codes');
        Schema::dropIfExists('parent_invitation_events');
        Schema::dropIfExists('parent_invitations');
    }
};
