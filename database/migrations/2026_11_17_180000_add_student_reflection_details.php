<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_self_assessments', function (Blueprint $table) {
            $table->string('confidence', 16)->nullable()->after('feeling');
            $table->string('difficult_ayahs', 120)->nullable()->after('help_request');
            $table->boolean('wants_revision')->nullable()->after('difficult_ayahs');
            $table->string('note', 1000)->nullable()->after('wants_revision');
        });
    }

    public function down(): void
    {
        Schema::table('student_self_assessments', function (Blueprint $table) {
            $table->dropColumn(['confidence', 'difficult_ayahs', 'wants_revision', 'note']);
        });
    }
};
