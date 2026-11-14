<?php

$annualEnabled = filter_var(env('BILLING_ANNUAL_ENABLED', true), FILTER_VALIDATE_BOOL);
$lifetimeEnabled = filter_var(env('BILLING_LIFETIME_ENABLED', true), FILTER_VALIDATE_BOOL);

$monthlyPence = 299;
$yearlyDiscountPercent = 25;
$lifetimeDiscountPercent = 50;
$lifetimeComparedToMonths = 36;
$yearlyPence = (int) round($monthlyPence * 12 * (100 - $yearlyDiscountPercent) / 100);
$lifetimePence = (int) round($monthlyPence * $lifetimeComparedToMonths * (100 - $lifetimeDiscountPercent) / 100);

return [
    'currency' => env('BILLING_CURRENCY', 'GBP'),
    'currency_symbol' => env('BILLING_CURRENCY_SYMBOL', '£'),
    /*
     | Public checkout is Free + Pro monthly, yearly (25% off 12 months),
     | and lifetime (50% off 3 years of monthly = 2 years of Pro yearly).
     | Premium is archived in Stripe and is not sold.
     */
    'annual_billing_enabled' => $annualEnabled,
    'lifetime_billing_enabled' => $lifetimeEnabled,
    'verify_price_on_checkout' => filter_var(env('BILLING_VERIFY_PRICE_ON_CHECKOUT', true), FILTER_VALIDATE_BOOL),
    'limits' => [
        'free' => [
            'ai_assessments_per_day' => max(0, (int) env('BILLING_FREE_AI_ASSESSMENTS_PER_DAY', 5)),
            'saved_sessions' => max(0, (int) env('BILLING_FREE_SAVED_SESSIONS', 5)),
            'find_ayah_per_day' => max(0, (int) env('BILLING_FREE_FIND_AYAH_PER_DAY', 5)),
        ],
    ],
    'plans' => [
        'free' => [
            'name' => 'Free',
            'tier' => 'free',
            'purchasable' => false,
            'display_amount' => '0',
            'interval' => 'month',
            'features' => [
                '5 AI recitation checks a day',
                'Essential memorisation tools',
                '5 saved sessions',
                'Translation and transliteration',
                'Beginner achievements and basic analytics',
            ],
        ],
        /*
         | Archived Stripe prices. Kept so webhooks can still resolve old rows.
         | Existing paid Premium subscribers receive Pro access.
         */
        'premium_monthly' => [
            'name' => 'Pro',
            'tier' => 'pro',
            'purchasable' => false,
            'interval' => 'month',
            'checkout_mode' => 'subscription',
            'price_type' => 'recurring',
            'price_id' => env('STRIPE_PRICE_PREMIUM_MONTHLY'),
            'trial_days' => 0,
            'expected_unit_amount' => 999,
            'audited_unit_amount' => 999,
            'features' => [],
        ],
        'premium_yearly' => [
            'name' => 'Pro',
            'tier' => 'pro',
            'purchasable' => false,
            'interval' => 'year',
            'checkout_mode' => 'subscription',
            'price_type' => 'recurring',
            'price_id' => env('STRIPE_PRICE_PREMIUM_YEARLY'),
            'trial_days' => 0,
            'expected_unit_amount' => 1799,
            'audited_unit_amount' => 1799,
            'features' => [],
        ],
        'pro_monthly' => [
            'name' => 'Pro',
            'tier' => 'pro',
            'purchasable' => true,
            'interval' => 'month',
            'checkout_mode' => 'subscription',
            'price_type' => 'recurring',
            'price_id' => env('STRIPE_PRICE_PRO_MONTHLY'),
            'legacy_price_ids' => array_values(array_filter([
                'price_1UY4m0GnjnR8GCMXlzedCo7N',
            ])),
            'trial_days' => max(0, (int) env('BILLING_PRO_TRIAL_DAYS', 7)),
            'display_amount' => number_format($monthlyPence / 100, 2, '.', ''),
            'expected_unit_amount' => $monthlyPence,
            'audited_unit_amount' => $monthlyPence,
            'expected_currency' => 'gbp',
            'features' => [
                'Everything in the Free plan',
                'Unlimited AI recitation checks',
                'Advanced memorisation tools',
                'Unlimited saved sessions',
                'Find an Ayah',
                'Word-by-word translation',
                'Offline audio downloads',
                'Weak ayah insights',
            ],
        ],
        'pro_yearly' => [
            'name' => 'Pro',
            'tier' => 'pro',
            'purchasable' => $annualEnabled,
            'interval' => 'year',
            'checkout_mode' => 'subscription',
            'price_type' => 'recurring',
            'price_id' => env('STRIPE_PRICE_PRO_YEARLY'),
            'legacy_price_ids' => array_values(array_filter([
                'price_1UY4m1GnjnR8GCMXeNk1veNH',
            ])),
            'trial_days' => max(0, (int) env('BILLING_PRO_TRIAL_DAYS', 7)),
            'display_amount' => number_format($yearlyPence / 100, 2, '.', ''),
            'display_monthly_equivalent' => number_format($yearlyPence / 12 / 100, 2, '.', ''),
            'annual_discount_percent' => $yearlyDiscountPercent,
            'expected_unit_amount' => $yearlyPence,
            'audited_unit_amount' => $yearlyPence,
            'expected_currency' => 'gbp',
            'features' => [],
        ],
        'pro_lifetime' => [
            'name' => 'Pro',
            'tier' => 'pro',
            'purchasable' => $lifetimeEnabled,
            'interval' => 'lifetime',
            'checkout_mode' => 'payment',
            'price_type' => 'one_time',
            'price_id' => env('STRIPE_PRICE_PRO_LIFETIME'),
            'trial_days' => 0,
            'display_amount' => number_format($lifetimePence / 100, 2, '.', ''),
            'lifetime_discount_percent' => $lifetimeDiscountPercent,
            'expected_unit_amount' => $lifetimePence,
            'audited_unit_amount' => $lifetimePence,
            'expected_currency' => 'gbp',
            'features' => [],
        ],
    ],
];
