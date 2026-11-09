<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('stripe_price_id')->nullable()->after('stripe_subscription_id');
            $table->boolean('subscription_cancel_at_period_end')->default(false)->after('subscription_status');
            $table->timestamp('subscription_current_period_starts_at')->nullable()->after('subscription_trial_ends_at');
            $table->unsignedBigInteger('subscription_state_at')->nullable()->after('subscription_current_period_ends_at');
            $table->index('stripe_price_id');
            $table->index('subscription_status');
        });

        Schema::create('feature_usage_counters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('feature', 64);
            $table->date('period_on');
            $table->unsignedInteger('consumed')->default(0);
            $table->timestamps();
            $table->unique(['user_id', 'feature', 'period_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feature_usage_counters');

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['stripe_price_id']);
            $table->dropIndex(['subscription_status']);
            $table->dropColumn([
                'stripe_price_id',
                'subscription_cancel_at_period_end',
                'subscription_current_period_starts_at',
                'subscription_state_at',
            ]);
        });
    }
};
