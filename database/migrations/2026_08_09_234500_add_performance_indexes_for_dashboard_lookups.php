<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Indexes verified against dashboard / notes / progress query patterns:
 * - memorisation_progress recent memorised: status + completed_at / updated_at
 * - ayah_notes list ordered by updated_at
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('memorisation_progress', function (Blueprint $table) {
            $table->index(
                ['user_id', 'status', 'completed_at'],
                'memorisation_progress_user_status_completed_idx'
            );
            $table->index(
                ['user_id', 'status', 'updated_at'],
                'memorisation_progress_user_status_updated_idx'
            );
        });

        Schema::table('ayah_notes', function (Blueprint $table) {
            $table->index(
                ['user_id', 'updated_at'],
                'ayah_notes_user_updated_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::table('memorisation_progress', function (Blueprint $table) {
            $table->dropIndex('memorisation_progress_user_status_completed_idx');
            $table->dropIndex('memorisation_progress_user_status_updated_idx');
        });

        Schema::table('ayah_notes', function (Blueprint $table) {
            $table->dropIndex('ayah_notes_user_updated_idx');
        });
    }
};
