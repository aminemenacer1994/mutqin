<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teacher_assignments', function (Blueprint $table) {
            if (! Schema::hasColumn('teacher_assignments', 'priority')) {
                $table->string('priority', 16)->default('normal')->after('due_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('teacher_assignments', function (Blueprint $table) {
            if (Schema::hasColumn('teacher_assignments', 'priority')) {
                $table->dropColumn('priority');
            }
        });
    }
};
