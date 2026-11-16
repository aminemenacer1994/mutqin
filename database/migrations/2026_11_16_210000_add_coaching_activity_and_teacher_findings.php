<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teacher_assignments', function (Blueprint $table) {
            $table->string('activity', 24)->nullable()->after('hifz_category');
            $table->boolean('recording_required')->default(false)->after('activity');
        });

        Schema::table('teacher_word_coaching_corrections', function (Blueprint $table) {
            $table->string('focus', 32)->nullable()->after('body');
            $table->string('finding', 16)->nullable()->after('focus');
        });
    }

    public function down(): void
    {
        Schema::table('teacher_word_coaching_corrections', function (Blueprint $table) {
            $table->dropColumn(['focus', 'finding']);
        });

        Schema::table('teacher_assignments', function (Blueprint $table) {
            $table->dropColumn(['activity', 'recording_required']);
        });
    }
};
