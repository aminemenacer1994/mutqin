<?php

namespace Database\Seeders;

use App\Models\MemorisationProgress;
use App\Models\ParentLearningReport;
use App\Models\TeacherAssignmentRecipient;
use App\Models\User;
use App\Models\UserSession;
use App\Services\Demo\AnchorStudentLearningPlanter;
use Database\Seeders\Concerns\GuardsDemoSeeding;
use Illuminate\Database\Seeder;

/**
 * Practice, assignments, and parent reports for configured teacher-anchor students.
 */
class AnchorStudentLearningSeeder extends Seeder
{
    use GuardsDemoSeeding;

    public function run(): void
    {
        $this->guardAgainstProductionSeeding();

        $planted = app(AnchorStudentLearningPlanter::class)->plantAll();

        $this->report($planted);
    }

    /**
     * @param  list<string>  $planted
     */
    private function report(array $planted): void
    {
        $command = $this->command;
        if ($command === null) {
            return;
        }

        if ($planted === []) {
            $command->warn('No anchor student learning data planted (missing accounts or teacher groups).');

            return;
        }

        $rows = [];
        foreach ($planted as $email) {
            $student = User::query()->whereRaw('LOWER(email) = ?', [strtolower($email)])->first();
            if ($student === null) {
                continue;
            }

            $rows[] = [
                $email,
                (string) UserSession::query()->where('user_id', $student->id)->count().' sessions',
                (string) TeacherAssignmentRecipient::query()->where('student_id', $student->id)->count().' assignments',
                (string) MemorisationProgress::query()->where('user_id', $student->id)->count().' ayahs',
                (string) ParentLearningReport::query()->where('student_user_id', $student->id)->count().' reports',
            ];
        }

        $command->newLine();
        $command->info('Anchor student learning data ready.');
        $command->table(['Student', 'Sessions', 'Assignments', 'Progress', 'Reports'], $rows);
    }
}