<?php

namespace Database\Seeders;

use App\Models\User;
use Database\Seeders\Concerns\GuardsDemoSeeding;
use Illuminate\Database\Seeder;

class PracticeAccountSeeder extends Seeder
{
    use GuardsDemoSeeding;

    /**
     * Seed 15 deterministic demo accounts for practice/testing.
     */
    public function run(): void
    {
        $this->guardAgainstProductionSeeding();

        $accounts = [
            ['name' => 'Tester — Free (EN)', 'email' => 'practice01@example.com', 'password' => 'Practice01!', 'locale' => 'en', 'subscription_tier' => 'free', 'subscription_plan' => 'free', 'subscription_status' => 'free'],
            ['name' => 'Tester — Premium (FR)', 'email' => 'practice02@example.com', 'password' => 'Practice02!', 'locale' => 'fr', 'subscription_tier' => 'premium', 'subscription_plan' => 'premium_monthly', 'subscription_status' => 'active'],
            ['name' => 'Tester — Pro (AR)', 'email' => 'practice03@example.com', 'password' => 'Practice03!', 'locale' => 'ar', 'subscription_tier' => 'pro', 'subscription_plan' => 'pro_monthly', 'subscription_status' => 'active'],
            ['name' => 'Practice Account 04', 'email' => 'practice04@example.com', 'password' => 'Practice04!', 'locale' => 'en', 'subscription_tier' => 'free', 'subscription_plan' => 'free', 'subscription_status' => 'free'],
            ['name' => 'Practice Account 05', 'email' => 'practice05@example.com', 'password' => 'Practice05!', 'locale' => 'id', 'subscription_tier' => 'premium', 'subscription_plan' => 'premium_yearly', 'subscription_status' => 'trialing'],
            ['name' => 'Practice Account 06', 'email' => 'practice06@example.com', 'password' => 'Practice06!', 'locale' => 'tr', 'subscription_tier' => 'free', 'subscription_plan' => 'free', 'subscription_status' => 'free'],
            ['name' => 'Practice Account 07', 'email' => 'practice07@example.com', 'password' => 'Practice07!', 'locale' => 'es', 'subscription_tier' => 'free', 'subscription_plan' => 'free', 'subscription_status' => 'free'],
            ['name' => 'Practice Account 08', 'email' => 'practice08@example.com', 'password' => 'Practice08!', 'locale' => 'en', 'subscription_tier' => 'premium', 'subscription_plan' => 'premium_monthly', 'subscription_status' => 'canceled'],
            ['name' => 'Practice Account 09', 'email' => 'practice09@example.com', 'password' => 'Practice09!', 'locale' => 'ar', 'subscription_tier' => 'free', 'subscription_plan' => 'free', 'subscription_status' => 'free'],
            ['name' => 'Tester — Pro (EN)', 'email' => 'practice10@example.com', 'password' => 'Practice10!', 'locale' => 'en', 'subscription_tier' => 'pro', 'subscription_plan' => 'pro_yearly', 'subscription_status' => 'active'],
            ['name' => 'Practice Account 11', 'email' => 'practice11@example.com', 'password' => 'Practice11!', 'locale' => 'fr', 'subscription_tier' => 'free', 'subscription_plan' => 'free', 'subscription_status' => 'free'],
            ['name' => 'Practice Account 12', 'email' => 'practice12@example.com', 'password' => 'Practice12!', 'locale' => 'en', 'subscription_tier' => 'premium', 'subscription_plan' => 'premium_monthly', 'subscription_status' => 'active'],
            ['name' => 'Practice Account 13', 'email' => 'practice13@example.com', 'password' => 'Practice13!', 'locale' => 'id', 'subscription_tier' => 'free', 'subscription_plan' => 'free', 'subscription_status' => 'free'],
            ['name' => 'Practice Account 14', 'email' => 'practice14@example.com', 'password' => 'Practice14!', 'locale' => 'tr', 'subscription_tier' => 'premium', 'subscription_plan' => 'premium_yearly', 'subscription_status' => 'active'],
            ['name' => 'Practice Account 15', 'email' => 'practice15@example.com', 'password' => 'Practice15!', 'locale' => 'es', 'subscription_tier' => 'free', 'subscription_plan' => 'free', 'subscription_status' => 'free'],
        ];

        foreach ($accounts as $account) {
            $this->assertSafeDemoEmail($account['email']);

            $attrs = [
                'name' => $account['name'],
                'password' => $account['password'],
                'email_verified_at' => now(),
                'locale' => $account['locale'],
                'subscription_tier' => $account['subscription_tier'],
                'subscription_plan' => $account['subscription_plan'],
                'subscription_status' => $account['subscription_status'],
            ];

            if (in_array($account['subscription_status'], ['active', 'trialing'], true)) {
                $attrs['stripe_customer_id'] = 'cus_'.str_replace(['@', '.'], '_', $account['email']);
                $attrs['stripe_subscription_id'] = 'sub_'.str_replace(['@', '.'], '_', $account['email']);
                $attrs['subscription_current_period_ends_at'] = $account['subscription_status'] === 'trialing'
                    ? now()->addDays(7)
                    : now()->addMonth();
                if ($account['subscription_status'] === 'trialing') {
                    $attrs['subscription_trial_ends_at'] = now()->addDays(7);
                }
            }

            User::updateOrCreate(
                ['email' => $account['email']],
                $attrs
            );
        }
    }
}
