<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teacher_notes', function (Blueprint $table) {
            $table->unsignedTinyInteger('surah_number')->nullable()->after('teacher_assignment_id');
            $table->unsignedSmallInteger('ayah_start')->nullable()->after('surah_number');
            $table->unsignedSmallInteger('ayah_end')->nullable()->after('ayah_start');
        });
    }

    public function down(): void
    {
        Schema::table('teacher_notes', function (Blueprint $table) {
            $table->dropColumn(['surah_number', 'ayah_start', 'ayah_end']);
        });
    }
};
