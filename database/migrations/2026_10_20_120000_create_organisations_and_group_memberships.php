<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('organisations', function (Blueprint $table) {
            $table->id();
            $table->string('type', 32);
            $table->string('name', 120);
            $table->string('name_canonical', 120);
            $table->timestamps();

            $table->unique(['type', 'name_canonical']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('account_role', 32)->nullable()->index();
            $table->foreignId('organisation_id')
                ->nullable()
                ->constrained('organisations')
                ->nullOnDelete();
        });

        Schema::create('learning_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained('organisations')->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('name_canonical', 120);
            $table->timestamps();

            $table->unique(['organisation_id', 'name_canonical']);
        });

        Schema::create('group_memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('learning_group_id')->constrained('learning_groups')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('membership_role', 32);
            $table->string('status', 32)->default('pending');
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->string('analytics_consent_status', 32)->default('none');
            $table->timestamp('analytics_consent_at')->nullable();
            $table->string('analytics_consent_version', 64)->nullable();
            $table->foreignId('analytics_consent_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['learning_group_id', 'user_id']);
            $table->index(['user_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('group_memberships');
        Schema::dropIfExists('learning_groups');

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('organisation_id');
            $table->dropColumn('account_role');
        });

        Schema::dropIfExists('organisations');
    }
};
