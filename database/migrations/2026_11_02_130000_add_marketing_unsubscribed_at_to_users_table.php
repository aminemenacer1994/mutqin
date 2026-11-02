<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('users') || Schema::hasColumn('users', 'marketing_unsubscribed_at')) {
            return;
        }

        Schema::table('users', function (Blueprint $table): void {
            $table->timestamp('marketing_unsubscribed_at')->nullable();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('users') || ! Schema::hasColumn('users', 'marketing_unsubscribed_at')) {
            return;
        }

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('marketing_unsubscribed_at');
        });
    }
};
