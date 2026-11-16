<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('learning_plan_items', function (Blueprint $table) {
            $table->string('activity', 24)->nullable()->after('kind');
        });
    }

    public function down(): void
    {
        Schema::table('learning_plan_items', function (Blueprint $table) {
            $table->dropColumn('activity');
        });
    }
};
