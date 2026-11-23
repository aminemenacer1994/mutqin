<?php

namespace App\Services\Parent;

/**
 * Turns an authorised learning brief into a short answer.
 * The question is never copied into the answer, so text inside feedback cannot steer it.
 */
class LocalParentAssistantComposer implements ParentAssistantComposer
{
    public function compose(array $brief, string $intent): array
    {
        $children = $brief['children'];
        if ($children === []) {
            return $this->pack(__('parent.assistant_no_children'), __('parent.assistant_disclaimer'), []);
        }
        if ($this->isEmpty($children)) {
            return $this->pack(
                __('parent.assistant_insufficient'),
                __('parent.assistant_insufficient_more').' '.__('parent.assistant_disclaimer'),
                [],
            );
        }

        $answer = match ($intent) {
            'homework' => $this->homework($children),
            'feedback' => $this->feedback($children),
            'practice' => $this->practice($children),
            'month' => $this->month($children),
            'wording' => $this->wording($children),
            default => $this->progress($children),
        };

        if (($brief['truncated_family'] ?? false) === true) {
            $answer['expanded'] .= ' Showing the first 8 linked children.';
        }

        return $answer;
    }

    /**
     * @param  list<array<string, mixed>>  $children
     * @return array{short: string, expanded: string, sources: list<array{kind: string, label: string}>}
     */
    private function progress(array $children): array
    {
        $lines = [];
        foreach ($children as $child) {
            $progress = $child['progress'];
            if (! is_array($progress)) {
                $lines[] = $child['name'].': progress has not been shared with you.';

                continue;
            }
            $bits = [];
            if ($progress['memorised'] !== null) {
                $bits[] = $progress['memorised'].' memorised ayahs';
            }
            if ($progress['learning'] !== null) {
                $bits[] = $progress['learning'].' still being learned';
            }
            if ($progress['validated'] !== null) {
                $bits[] = $progress['validated'].' confirmed by a teacher';
            }
            $lines[] = $bits === []
                ? $child['name'].' has a progress record, with no ayah totals in it yet.'
                : $child['name'].' has '.implode(', ', $bits).'.';
        }

        return $this->pack(
            $this->lead($lines),
            $this->more($lines, 'These totals come from the shared progress record.'),
            [$this->source('progress')],
        );
    }

    /**
     * @param  list<array<string, mixed>>  $children
     * @return array{short: string, expanded: string, sources: list<array{kind: string, label: string}>}
     */
    private function homework(array $children): array
    {
        $lines = [];
        $saw = false;
        foreach ($children as $child) {
            $assignments = $child['assignments'];
            if (! is_array($assignments)) {
                $lines[] = $child['name'].': homework has not been shared with you.';

                continue;
            }
            $saw = true;
            $overdue = $assignments['overdue'];
            if ($overdue !== []) {
                $lines[] = $child['name'].' has '.$this->count(count($overdue), 'task').' past the deadline: '.$this->labels($overdue).'.';

                continue;
            }
            $open = $assignments['open'];
            $lines[] = $open === []
                ? $child['name'].' has no open homework in the shared list.'
                : $child['name'].' has '.$this->count(count($open), 'open task').'. The next one is '.$open[0]['label'].'.';
        }

        $sources = $saw ? [$this->source('assignment'), $this->source('suggestion')] : [$this->source('suggestion')];

        return $this->pack(
            $this->lead($lines),
            $this->more($lines, 'Finish the teacher’s set work before adding anything else. At home, repeat the shortest passage slowly, then once from memory.'),
            $sources,
        );
    }

    /**
     * @param  list<array<string, mixed>>  $children
     * @return array{short: string, expanded: string, sources: list<array{kind: string, label: string}>}
     */
    private function feedback(array $children): array
    {
        $lines = [];
        $saw = false;
        foreach ($children as $child) {
            $notes = $child['feedback'];
            if (! is_array($notes)) {
                $lines[] = $child['name'].': teacher feedback has not been shared with you.';

                continue;
            }
            if ($notes === []) {
                $lines[] = $child['name'].' has no teacher feedback in the shared list.';

                continue;
            }
            $saw = true;
            $note = $notes[0];
            $lines[] = $note['teacher'].' wrote about '.$child['name'].': “'.$note['excerpt'].'”.';
        }

        $sources = $saw ? [$this->source('teacher_feedback')] : [];

        return $this->pack(
            $this->lead($lines),
            $this->more($lines, 'That is the teacher’s own feedback. This assistant does not change it or add a new instruction.'),
            $sources,
        );
    }

    /**
     * @param  list<array<string, mixed>>  $children
     * @return array{short: string, expanded: string, sources: list<array{kind: string, label: string}>}
     */
    private function practice(array $children): array
    {
        $lines = [];
        $sources = [];
        foreach ($children as $child) {
            $progress = is_array($child['progress']) ? $child['progress'] : null;
            $recommendation = $progress['recommendations'][0] ?? null;
            if (is_array($recommendation) && ($recommendation['label'] !== '' || $recommendation['note'] !== '')) {
                $lines[] = 'The teacher recommended '.trim($recommendation['label'].' '.$recommendation['note']).' for '.$child['name'].'.';
                $sources['teacher_recommendation'] = $this->source('teacher_recommendation');

                continue;
            }
            $weak = $progress['weak'][0] ?? null;
            if (is_string($weak) && $weak !== '') {
                $lines[] = 'A teacher confirmed extra practice for '.$child['name'].' at '.$weak.'.';
                $sources['teacher_feedback'] = $this->source('teacher_feedback');

                continue;
            }
            $plan = $child['plans'][0] ?? null;
            if (is_string($plan) && $plan !== '') {
                $lines[] = $child['name'].' is on the plan “'.$plan.'”. Keep that passage this week.';
                $sources['progress'] = $this->source('progress');

                continue;
            }
            $lines[] = $child['name'].' has no teacher revision target in the shared records yet.';
        }
        $sources['suggestion'] = $this->source('suggestion');

        return $this->pack(
            $this->lead($lines),
            $this->more($lines, 'A home idea, after the teacher’s set work: read the passage slowly, then from memory, then once more the next day.'),
            array_values($sources),
        );
    }

    /**
     * @param  list<array<string, mixed>>  $children
     * @return array{short: string, expanded: string, sources: list<array{kind: string, label: string}>}
     */
    private function month(array $children): array
    {
        $lines = [];
        foreach ($children as $child) {
            $progress = $child['progress'];
            if (! is_array($progress)) {
                $lines[] = $child['name'].': this month’s progress has not been shared with you.';

                continue;
            }
            $practice = $progress['practice_ayahs'];
            $practiceLine = $practice === null
                ? $child['name'].': the shared record has no practice count for the last 30 days.'
                : $child['name'].' practised '.$practice.' ayahs in the last 30 days.';
            $lines[] = $practiceLine.' Homework in that window: '.$progress['homework_due'].' due, '.$progress['homework_completed'].' completed, '.$progress['homework_overdue'].' overdue.';
        }

        return $this->pack(
            $this->lead($lines),
            $this->more($lines, 'These figures are counts from the shared progress record for the last 30 days.'),
            [$this->source('progress')],
        );
    }

    /**
     * @param  list<array<string, mixed>>  $children
     * @return array{short: string, expanded: string, sources: list<array{kind: string, label: string}>}
     */
    private function wording(array $children): array
    {
        $lines = [];
        $saw = false;
        foreach ($children as $child) {
            $progress = is_array($child['progress']) ? $child['progress'] : null;
            $direction = $progress['wording_direction'] ?? null;
            if (! is_string($direction) || $direction === '') {
                $lines[] = $child['name'].' has no automatic wording check in the shared records.';

                continue;
            }
            $saw = true;
            $passage = $progress['wording_passage'];
            $score = is_array($passage) ? ' The latest word match on '.$passage['label'].' was '.$passage['latest'].'%.' : '';
            $lines[] = $child['name'].': the automatic wording check is '.$this->direction($direction).'.'.$score.' This compares words only. It is not a Tajweed grade.';
        }

        return $this->pack(
            $this->lead($lines),
            $this->more($lines, 'A teacher review is separate from this automatic check. Do not treat the percentage as pronunciation or Tajweed proficiency.'),
            $saw ? [$this->source('ai_word_match')] : [],
        );
    }

    /**
     * @param  list<array<string, mixed>>  $children
     */
    private function isEmpty(array $children): bool
    {
        foreach ($children as $child) {
            if ($child['assignments'] !== null || $child['progress'] !== null || $child['feedback'] !== null || ($child['plans'] ?? []) !== []) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  list<string>  $lines
     * @param  list<array{kind: string, label: string}>  $sources
     * @return array{short: string, expanded: string, sources: list<array{kind: string, label: string}>}
     */
    private function pack(string $short, string $expanded, array $sources): array
    {
        return [
            'short' => $short,
            'expanded' => trim($expanded),
            'sources' => $sources,
        ];
    }

    /**
     * @param  list<string>  $lines
     */
    private function lead(array $lines): string
    {
        return implode(' ', array_slice($lines, 0, 3));
    }

    /**
     * @param  list<string>  $lines
     */
    private function more(array $lines, string $extra): string
    {
        return trim(implode(' ', $lines).' '.$extra.' '.__('parent.assistant_disclaimer'));
    }

    /**
     * @param  list<array{label: string}>  $rows
     */
    private function labels(array $rows): string
    {
        return implode('; ', array_map(fn (array $row) => $row['label'], $rows));
    }

    private function count(int $count, string $noun): string
    {
        return $count.' '.$noun.($count === 1 ? '' : 's');
    }

    private function direction(string $direction): string
    {
        return match ($direction) {
            'improving', 'up' => 'improving',
            'slipping', 'down' => 'needs another look',
            'mixed' => 'mixed',
            'steady' => 'steady',
            default => 'not ready to judge yet',
        };
    }

    /**
     * @return array{kind: string, label: string}
     */
    private function source(string $kind): array
    {
        return [
            'kind' => $kind,
            'label' => __('parent.assistant_source_'.$kind),
        ];
    }
}
