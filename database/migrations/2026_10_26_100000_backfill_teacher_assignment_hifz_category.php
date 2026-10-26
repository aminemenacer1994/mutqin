<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('teacher_assignments', 'hifz_category')) {
            return;
        }

        DB::table('teacher_assignments')
            ->whereNull('hifz_category')
            ->orWhere('hifz_category', '')
            ->update([
                'hifz_category' => DB::raw("CASE WHEN kind = 'ai_recite' THEN 'sabqi' WHEN repetition_target >= 5 THEN 'manzil' ELSE 'sabaq' END"),
            ]);
    }

    public function down(): void
    {
        // Inferred categories are valid assignment data and should not be erased.
    }
};
