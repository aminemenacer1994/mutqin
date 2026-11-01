<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('registered_user_email_deliveries')) {
            return;
        }

        Schema::create('registered_user_email_deliveries', function (Blueprint $table): void {
            $table->id();
            $table->string('campaign_key', 64);
            $table->char('email_hash', 64);
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 16)->default('pending');
            $table->string('skip_reason', 32)->nullable();
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->string('last_error', 255)->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->unique(['campaign_key', 'email_hash']);
            $table->index(['campaign_key', 'status']);
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registered_user_email_deliveries');
    }
};
