<?php

use App\Enums\UserSessionStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_sessions', function (Blueprint $table) {
            $table->string('status', 32)
                ->default(UserSessionStatus::None->value)
                ->after('memorisation_mode');
            $table->boolean('is_onboarding_example')
                ->default(false)
                ->after('status');
            $table->timestamp('started_at')->nullable()->after('last_activity_at');
            $table->timestamp('paused_at')->nullable()->after('started_at');
            $table->timestamp('resumed_at')->nullable()->after('paused_at');
            $table->timestamp('ended_at')->nullable()->after('resumed_at');

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('user_sessions', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'status']);
            $table->dropColumn([
                'status',
                'is_onboarding_example',
                'started_at',
                'paused_at',
                'resumed_at',
                'ended_at',
            ]);
        });
    }
};
