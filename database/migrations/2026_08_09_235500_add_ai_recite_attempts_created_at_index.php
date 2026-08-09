<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Admin activity chart aggregates AI attempts globally by created_at.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_recite_attempts', function (Blueprint $table) {
            $table->index('created_at', 'ai_recite_attempts_created_at_idx');
        });
    }

    public function down(): void
    {
        Schema::table('ai_recite_attempts', function (Blueprint $table) {
            $table->dropIndex('ai_recite_attempts_created_at_idx');
        });
    }
};
