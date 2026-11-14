<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Referral reward: every 3 referred Pro conversions grants one complimentary Pro month.
 * complimentary_pro_until is local entitlement Stripe sync must not clear.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('complimentary_pro_until')->nullable()->after('subscription_current_period_ends_at');
            $table->unsignedInteger('referral_free_months_granted')->default(0)->after('ai_recite_bonus_checks');
        });

        Schema::table('referrals', function (Blueprint $table) {
            $table->timestamp('converted_to_pro_at')->nullable()->after('activated_at');
            $table->timestamp('free_month_rewarded_at')->nullable()->after('reward_granted_at');
        });
    }

    public function down(): void
    {
        Schema::table('referrals', function (Blueprint $table) {
            $table->dropColumn(['converted_to_pro_at', 'free_month_rewarded_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['complimentary_pro_until', 'referral_free_months_granted']);
        });
    }
};
