<?php

namespace Database\Seeders;

use App\Models\User;
use Database\Seeders\Concerns\GuardsDemoSeeding;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use GuardsDemoSeeding;
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->guardAgainstProductionSeeding();

        // Minimal factory account — see docs/TESTER_GUIDE.md for labelled demo accounts.
        $email = 'test@example.com';
        $this->assertSafeDemoEmail($email);

        User::factory()->create([
            'name' => 'Tester — Factory (minimal)',
            'email' => $email,
            'password' => Hash::make('password'),
            'locale' => 'en',
            'subscription_tier' => 'free',
            'subscription_plan' => 'free',
            'subscription_status' => 'free',
        ]);

        $this->call([
            PracticeAccountSeeder::class,
            DemoDataSeeder::class,
        ]);
    }
}
