# Testing Mutqin

Mutqin uses the frameworks already in the repository:

- **Backend:** PHPUnit 11, via `php artisan test` / `composer test`
- **Frontend:** Node’s built-in test runner, via `tests/js/*.test.mjs` and `npm run test:mutqin`

Do not add Pest, Vitest, or Vue Test Utils for routine unit tests. Vue components are covered by testing the plain modules they call (session state, techniques, recitation comparison) and, where needed, by the existing Playwright smoke scripts.

## Run tests

```bash
composer test
npm run test:mutqin
```

`composer test` starts PHPUnit through `php artisan test`. The password-reset test scans `storage/logs/laravel.log` in chunks, so a large local log does not have to be loaded at once.

Run one area while changing it:

```bash
php artisan test tests/Unit
php artisan test tests/Feature/PracticePlanIsolationTest.php
php artisan test --filter=WeaknessAnalysisServiceTest

node --experimental-vm-modules tests/js/quran-text-normalizer.test.mjs
node --experimental-vm-modules tests/js/technique-isolation.test.mjs
```

`npm run test:mutqin` runs every `tests/js/*.test.mjs` file except Playwright, locale-audit, and Qur'an-integrity suites. Those have their own commands:

| Command | What it does |
| --- | --- |
| `composer test` | Full PHPUnit suite |
| `composer test:quran-integrity` | Pinned Qur'an text checksums |
| `npm run test:quran-integrity` | Same checks from Node |
| `npm run audit:recitation-scenarios` | JS/PHP recitation parity, no live Speechmatics call |
| `npm run test:mutqin:browser` | Playwright smoke; needs a running app |
| `npm run test:mutqin:mobile` | Playwright mobile checks; needs a running app |

## Isolation

`phpunit.xml` forces `APP_ENV=testing` and `DB_CONNECTION=sqlite` with `DB_DATABASE=:memory:`. Feature tests use `RefreshDatabase`, so each test migrates a throwaway database and never touches a developer or production database.

Mail is the `array` driver. Cache, session, and queue do not use Redis or a real queue. Speechmatics tests mock token responses and scoring payloads. Do not put a live `SPEECHMATICS_API_KEY` expectation into a unit test, and do not run `migrate:fresh` against a non-testing database.

Frontend unit tests import source modules directly. They do not boot Laravel, do not call Speechmatics, and do not need `.env` secrets.

## What is covered

Backend unit tests focus on comparison and planning logic that must stay stable:

- Qur'an comparison normalisation
- Speechmatics confidence versus memorisation verdicts
- Weak ayah and word analysis
- Practice-plan technique and range selection
- Result classification and weak-word merging
- Main-position overlap, continuation, and progress counts

Feature tests cover registration, sessions, assessments, recommendations, billing, and authorisation. `PracticePlanIsolationTest` checks that one learner cannot read or change another learner’s plans, assessments, or weak spots, and that invalid ranges are rejected before any row is written.

Frontend unit tests cover the memorisation workspace modules: focus, blur, anchor, word highlight, word masking, chaining, session save/resume, and AI recitation comparison. `technique-isolation.test.mjs` checks that those techniques can be on together and that turning one off does not leave the others applied.

## CI

`.github/workflows/test.yml` runs on push and pull request:

1. PHPUnit
2. Recitation JS/PHP parity
3. JS unit tests and Qur'an integrity
4. Production asset build and theme gate

A failed job fails the workflow. There is no separate deploy workflow in this repository; do not deploy a commit whose test workflow is red.
