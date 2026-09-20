<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Indexes justified by production query patterns (admin contact inbox, soft-delete
 * filters). Does not duplicate existing FK/unique indexes on learning tables.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contact_submissions', function (Blueprint $table) {
            $table->index(['status', 'created_at'], 'contact_submissions_status_created_at_index');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->index('deleted_at', 'users_deleted_at_index');
        });

        if (Schema::hasColumn('memorisation_assessments', 'deleted_at')) {
            Schema::table('memorisation_assessments', function (Blueprint $table) {
                $table->index('deleted_at', 'memorisation_assessments_deleted_at_index');
            });
        }

        if (Schema::hasColumn('memorisation_practice_plans', 'deleted_at')) {
            Schema::table('memorisation_practice_plans', function (Blueprint $table) {
                $table->index('deleted_at', 'memorisation_practice_plans_deleted_at_index');
            });
        }
    }

    public function down(): void
    {
        Schema::table('contact_submissions', function (Blueprint $table) {
            $table->dropIndex('contact_submissions_status_created_at_index');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_deleted_at_index');
        });

        if (Schema::hasColumn('memorisation_assessments', 'deleted_at')) {
            Schema::table('memorisation_assessments', function (Blueprint $table) {
                $table->dropIndex('memorisation_assessments_deleted_at_index');
            });
        }

        if (Schema::hasColumn('memorisation_practice_plans', 'deleted_at')) {
            Schema::table('memorisation_practice_plans', function (Blueprint $table) {
                $table->dropIndex('memorisation_practice_plans_deleted_at_index');
            });
        }
    }
};
