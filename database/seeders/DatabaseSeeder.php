<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Minimal factory account — see docs/TESTER_GUIDE.md for labelled demo accounts.
        User::factory()->create([
            'name' => 'Tester — Factory (minimal)',
            'email' => 'test@example.com',
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
