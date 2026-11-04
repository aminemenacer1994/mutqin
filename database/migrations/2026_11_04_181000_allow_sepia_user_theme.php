<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Additive only. `users.theme` stays a nullable string so light, sepia, and dark
 * can be stored. Existing rows are not rewritten.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('users') && ! Schema::hasColumn('users', 'theme')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->string('theme', 32)->nullable()->after('locale');
            });
        }
    }

    public function down(): void
    {
        // Leave the column in place. Dropping it would discard saved preferences.
    }
};
