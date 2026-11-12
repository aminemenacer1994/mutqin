<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_events', function (Blueprint $table) {
            $table->id();
            $table->string('event_name', 64);
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('anonymous_id', 36)->nullable();
            $table->string('idempotency_key', 80);
            $table->timestamp('occurred_at');
            $table->string('utm_source', 40)->nullable();
            $table->string('utm_medium', 40)->nullable();
            $table->string('utm_campaign', 40)->nullable();
            $table->string('referral_code', 40)->nullable();
            $table->json('properties')->nullable();
            $table->timestamps();

            $table->unique(['event_name', 'idempotency_key']);
            $table->index(['event_name', 'occurred_at']);
            $table->index(['user_id', 'event_name', 'occurred_at']);
            $table->index(['anonymous_id', 'occurred_at']);
            $table->index('occurred_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_events');
    }
};
