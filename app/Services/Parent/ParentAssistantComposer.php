<?php

namespace App\Services\Parent;

interface ParentAssistantComposer
{
    /**
     * @param  array{children: list<array<string, mixed>>, truncated_family: bool}  $brief
     * @return array{short: string, expanded: string, sources: list<array{kind: string, label: string}>}
     */
    public function compose(array $brief, string $intent): array;
}
