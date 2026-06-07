<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('stripe_customer_id')->nullable()->unique()->after('remember_token');
            $table->string('stripe_subscription_id')->nullable()->unique()->after('stripe_customer_id');
            $table->string('subscription_tier')->default('free')->after('stripe_subscription_id');
            $table->string('subscription_plan')->nullable()->after('subscription_tier');
            $table->string('subscription_status')->default('free')->after('subscription_plan');
            $table->timestamp('subscription_trial_ends_at')->nullable()->after('subscription_status');
            $table->timestamp('subscription_current_period_ends_at')->nullable()->after('subscription_trial_ends_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'stripe_customer_id',
                'stripe_subscription_id',
                'subscription_tier',
                'subscription_plan',
                'subscription_status',
                'subscription_trial_ends_at',
                'subscription_current_period_ends_at',
            ]);
        });
    }
};
