<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class PracticeAccountSeeder extends Seeder
{
    /**
     * Seed 15 deterministic demo accounts for practice/testing.
     */
    public function run(): void
    {
        $accounts = [
            ['name' => 'Practice Account 01', 'email' => 'practice01@example.com', 'password' => 'Practice01!'],
            ['name' => 'Practice Account 02', 'email' => 'practice02@example.com', 'password' => 'Practice02!'],
            ['name' => 'Practice Account 03', 'email' => 'practice03@example.com', 'password' => 'Practice03!'],
            ['name' => 'Practice Account 04', 'email' => 'practice04@example.com', 'password' => 'Practice04!'],
            ['name' => 'Practice Account 05', 'email' => 'practice05@example.com', 'password' => 'Practice05!'],
            ['name' => 'Practice Account 06', 'email' => 'practice06@example.com', 'password' => 'Practice06!'],
            ['name' => 'Practice Account 07', 'email' => 'practice07@example.com', 'password' => 'Practice07!'],
            ['name' => 'Practice Account 08', 'email' => 'practice08@example.com', 'password' => 'Practice08!'],
            ['name' => 'Practice Account 09', 'email' => 'practice09@example.com', 'password' => 'Practice09!'],
            ['name' => 'Practice Account 10', 'email' => 'practice10@example.com', 'password' => 'Practice10!'],
            ['name' => 'Practice Account 11', 'email' => 'practice11@example.com', 'password' => 'Practice11!'],
            ['name' => 'Practice Account 12', 'email' => 'practice12@example.com', 'password' => 'Practice12!'],
            ['name' => 'Practice Account 13', 'email' => 'practice13@example.com', 'password' => 'Practice13!'],
            ['name' => 'Practice Account 14', 'email' => 'practice14@example.com', 'password' => 'Practice14!'],
            ['name' => 'Practice Account 15', 'email' => 'practice15@example.com', 'password' => 'Practice15!'],
        ];

        foreach ($accounts as $account) {
            User::updateOrCreate(
                ['email' => $account['email']],
                [
                    'name' => $account['name'],
                    'password' => $account['password'],
                    'email_verified_at' => now(),
                ]
            );
        }
    }
}
