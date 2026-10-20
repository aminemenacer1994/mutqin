<?php

namespace Database\Seeders;

use App\Models\User;
use Database\Seeders\Concerns\GuardsDemoSeeding;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
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

        $user = User::query()->where('email', $email)->first() ?? new User;
        $user->forceFill([
            'name' => 'Tester — Factory (minimal)',
            'email' => $email,
            'password' => 'password',
            'email_verified_at' => now(),
            'password_set_at' => now(),
            'locale' => 'en',
            'subscription_tier' => 'free',
            'subscription_plan' => 'free',
            'subscription_status' => 'free',
        ])->save();

        $this->call([
            PracticeAccountSeeder::class,
            RegistrationOrganisationSeeder::class,
            OrganisationNetworkSeeder::class,
            DemoDataSeeder::class,
        ]);
    }
}
