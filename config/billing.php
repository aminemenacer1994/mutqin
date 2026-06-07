<?php

return [
    'plans' => [
        'free' => [
            'name' => 'Free',
            'tier' => 'free',
            'features' => [
                'Core memorisation planner',
                'Basic progress tracking',
                'Limited recitation checks',
            ],
        ],
        'premium_monthly' => [
            'name' => 'Premium',
            'tier' => 'premium',
            'interval' => 'month',
            'price_id' => env('STRIPE_PRICE_PREMIUM_MONTHLY', 'price_1Tfgi9KHwZ9fhmRpJo4NOuH6'),
            'trial_days' => 7,
            'features' => [
                'Unlimited memorisation planning',
                'Smart revision support',
                'Full progress history',
            ],
        ],
        'premium_yearly' => [
            'name' => 'Premium',
            'tier' => 'premium',
            'interval' => 'year',
            'price_id' => env('STRIPE_PRICE_PREMIUM_YEARLY', 'price_1TfgmNKHwZ9fhmRpoCjP7TFg'),
            'trial_days' => 7,
            'features' => [
                'Everything in Premium monthly',
                'Lower annual price',
                '7-day free trial',
            ],
        ],
        'pro_monthly' => [
            'name' => 'Pro',
            'tier' => 'pro',
            'interval' => 'month',
            'price_id' => env('STRIPE_PRICE_PRO_MONTHLY', 'price_1TfgjCKHwZ9fhmRpBH7jVtk9'),
            'trial_days' => 7,
            'features' => [
                'Advanced recitation workflow',
                'Detailed analytics',
                'Priority feature access',
            ],
        ],
        'pro_yearly' => [
            'name' => 'Pro',
            'tier' => 'pro',
            'interval' => 'year',
            'price_id' => env('STRIPE_PRICE_PRO_YEARLY', 'price_1TfglnKHwZ9fhmRpAoaX2bjr'),
            'trial_days' => 7,
            'features' => [
                'Everything in Pro monthly',
                'Best annual value',
                '7-day free trial',
            ],
        ],
    ],
];
