<?php

namespace App\Console\Commands;

use App\Services\Demo\TeacherDemoReset;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ResetTeacherDemoCommand extends Command
{
    protected $signature = 'mutqin:reset-teacher-demo';

    protected $description = 'Delete only Mutqin teacher-demo accounts and their organisations. Refuses to run in production.';

    public function handle(TeacherDemoReset $reset): int
    {
        $reset->assertSafeToReplace();
        $removed = DB::transaction(fn () => $reset->purge());
        $this->info("Removed {$removed} teacher-demo accounts. Other users were left in place.");

        return self::SUCCESS;
    }
}
