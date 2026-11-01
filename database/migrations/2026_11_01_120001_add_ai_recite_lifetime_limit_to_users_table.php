<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (! Schema::hasColumn('users', 'ai_recite_lifetime_limit')) {
                $table->unsignedInteger('ai_recite_lifetime_limit')->nullable()->after('ai_session_settings');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (Schema::hasColumn('users', 'ai_recite_lifetime_limit')) {
                $table->dropColumn('ai_recite_lifetime_limit');
            }
        });
    }
};
