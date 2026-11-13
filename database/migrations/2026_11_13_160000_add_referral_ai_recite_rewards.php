<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Referral activation perk: bonus AI Recite checks for the referrer.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedInteger('ai_recite_bonus_checks')->default(0)->after('ai_recite_lifetime_limit');
        });

        Schema::table('referrals', function (Blueprint $table) {
            $table->unsignedSmallInteger('reward_ai_checks')->default(0)->after('activated_at');
            $table->timestamp('reward_granted_at')->nullable()->after('reward_ai_checks');
        });
    }

    public function down(): void
    {
        Schema::table('referrals', function (Blueprint $table) {
            $table->dropColumn(['reward_ai_checks', 'reward_granted_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('ai_recite_bonus_checks');
        });
    }
};
