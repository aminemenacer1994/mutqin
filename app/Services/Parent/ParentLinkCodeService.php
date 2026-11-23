<?php

namespace App\Services\Parent;

use App\Enums\AccountRole;
use App\Models\ParentLinkCode;
use App\Models\User;
use App\Support\ParentFeatures;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ParentLinkCodeService
{
    public const TTL_MINUTES = 30;

    public const OPEN_LIMIT = 3;

    public function __construct(
        private readonly ParentStudentLinkService $links,
    ) {}

    /**
     * @return array{code: string, expires_at: string}
     */
    public function issue(User $parent): array
    {
        ParentFeatures::abortUnlessEnabled();
        abort_unless($parent->isParent(), 403);

        $open = ParentLinkCode::query()
            ->where('parent_user_id', $parent->id)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->count();
        if ($open >= self::OPEN_LIMIT) {
            throw ValidationException::withMessages(['code' => __('parent.link_code_limit')]);
        }

        $plain = $this->plainCode();
        $code = new ParentLinkCode;
        $code->forceFill([
            'parent_user_id' => $parent->id,
            'code_hash' => hash('sha256', $plain),
            'expires_at' => now()->addMinutes(self::TTL_MINUTES),
        ])->save();

        return [
            'code' => $plain,
            'expires_at' => $code->expires_at->toIso8601String(),
        ];
    }

    /**
     * @return array{child: array{id: int, name: string}}
     */
    public function redeem(User $student, string $plain, ?Request $request = null): array
    {
        ParentFeatures::abortUnlessEnabled();
        if (! $this->canBeLinkedChild($student)) {
            throw ValidationException::withMessages(['code' => __('parent.link_code_invalid')]);
        }

        $plain = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $plain) ?? '');
        if (strlen($plain) < 8) {
            throw ValidationException::withMessages(['code' => __('parent.link_code_invalid')]);
        }

        return DB::transaction(function () use ($student, $plain, $request) {
            $code = ParentLinkCode::query()
                ->where('code_hash', hash('sha256', $plain))
                ->lockForUpdate()
                ->first();

            if ($code === null || $code->used_at !== null || $code->expires_at->isPast()) {
                throw ValidationException::withMessages(['code' => __('parent.link_code_invalid')]);
            }
            if ((int) $code->parent_user_id === (int) $student->id) {
                throw ValidationException::withMessages(['code' => __('parent.link_code_invalid')]);
            }

            $parent = User::query()->find($code->parent_user_id);
            if (! $parent instanceof User || ! $parent->isParent()) {
                throw ValidationException::withMessages(['code' => __('parent.link_code_invalid')]);
            }

            $link = $this->links->request($parent, $student, $student, 'guardian', null, $request);
            $link = $this->links->approve($link, $student, null, $request);

            $code->forceFill([
                'used_at' => now(),
                'student_user_id' => $student->id,
                'parent_student_link_id' => $link->id,
                'code_hash' => hash('sha256', Str::random(32)),
            ])->save();

            return [
                'child' => [
                    'id' => (int) $student->id,
                    'name' => $student->name,
                ],
            ];
        });
    }

    private function canBeLinkedChild(User $student): bool
    {
        if ($student->trashed()) {
            return false;
        }

        if ($student->account_role === AccountRole::Student) {
            return true;
        }

        $anchors = config('mutqin.teacher_anchor_student_emails', []);
        $email = strtolower(trim((string) $student->email));

        return is_array($anchors) && in_array($email, array_map(
            static fn (mixed $value): string => strtolower(trim((string) $value)),
            $anchors,
        ), true);
    }

    private function plainCode(): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $code = '';
        for ($i = 0; $i < 8; $i++) {
            $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }

        return $code;
    }
}
