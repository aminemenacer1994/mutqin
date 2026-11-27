<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Progress report {{ $report['period_label'] ?? '' }}</title>
    <style>
        @page { size: A4; margin: 14mm; }
        body { font-family: Helvetica, Arial, sans-serif; color: #1c1917; font-size: 10.5pt; line-height: 1.45; margin: 0; }
        h1 { font-size: 20pt; margin: 0 0 4px; }
        h2 { font-size: 12pt; margin: 16px 0 6px; }
        .meta { color: #6b635a; font-size: 9pt; }
        .context { margin: 8px 0 0; color: #4a443c; font-size: 10pt; line-height: 1.5; }
        table.grid { width: 100%; border-collapse: collapse; margin: 8px 0; table-layout: fixed; }
        table.grid th, table.grid td { border: 1px solid #ddd6ce; padding: 6px 8px; text-align: left; vertical-align: top; }
        table.grid th { background: #f5f2ed; font-size: 9pt; text-transform: uppercase; letter-spacing: .03em; }
        table.grid col.cat { width: 22%; }
        table.grid col.done { width: 16%; }
        table.grid col.evidence { width: auto; }
        .note { padding: 10px; border-radius: 8px; background: #f8f6f3; margin: 10px 0; }
        ul { margin: 0; padding-left: 18px; }
        .pill { display: inline-block; border: 1px solid #d6d0c8; border-radius: 999px; padding: 1px 8px; font-size: 8.5pt; margin-right: 4px; }
        .homework-row { display: table; width: 100%; margin: 4px 0; font-size: 10pt; }
        .homework-row span { display: table-cell; }
        .homework-row strong { display: table-cell; text-align: right; font-weight: 700; width: 3rem; padding-left: 12px; }
    </style>
</head>
<body>
@php
    $payload = is_array($report['payload'] ?? null) ? $report['payload'] : [];
    $studentName = $payload['student']['name'] ?? 'Student';
    $summary = $payload['summary'] ?? [];
    $assignments = is_array($payload['assignments'] ?? null) ? $payload['assignments'] : [];
    $categories = is_array($payload['categories'] ?? null) ? $payload['categories'] : [];
    $categoryLabels = ['sabaq' => 'Sabaq', 'sabqi' => 'Sabqi', 'manzil' => 'Manzil', 'nazra' => 'Nazra', 'tajweed' => 'Tajweed', 'memorisation' => 'Memorisation'];
    $evidenceLabels = [
        'teacher_verified' => 'Teacher verified',
        'automated' => 'Automated',
        'unassessed' => 'Not assessed',
    ];
    $assignedHw = (int) ($assignments['assigned'] ?? 0);
    $completedHw = (int) ($assignments['completed'] ?? 0);
    $openHw = max(0, $assignedHw - $completedHw);
    $overdueHw = (int) ($assignments['overdue'] ?? 0);
    $wording = is_array($payload['wording'] ?? null) ? $payload['wording'] : [];
@endphp
    <p class="meta">Mutqin individual progress report</p>
    <h1>{{ $studentName }}</h1>
    <p class="meta">{{ $report['period_label'] ?? '' }}@if(!empty($report['approved_at'])) · Approved {{ \Illuminate\Support\Carbon::parse($report['approved_at'])->format('j M Y') }}@endif</p>

    @if(!empty($report['teacher_notes']))
        <div class="note"><strong>Teacher notes</strong><br>{{ $report['teacher_notes'] }}</div>
    @endif

    <h2>Overview</h2>
    <table class="grid">
        <tr>
            <th>Sessions</th>
            <th>Scored checks</th>
            <th>Wording match</th>
            <th>Teacher Tajweed avg</th>
        </tr>
        <tr>
            <td>{{ (int) ($summary['sessions_recorded'] ?? 0) }}</td>
            <td>{{ (int) ($summary['scored_checks'] ?? 0) }}</td>
            <td>{{ $summary['ai_word_match_average'] ?? '—' }}@if(isset($summary['ai_word_match_average']))%@endif</td>
            <td>{{ $summary['teacher_tajweed_average'] ?? '—' }}</td>
        </tr>
    </table>

    @if(!empty($assignments['plain']))
        <p class="context">{{ $assignments['plain'] }}</p>
    @endif

    @if($assignedHw > 0 || $completedHw > 0 || $overdueHw > 0)
        <h2>Homework finished</h2>
        @if($completedHw > 0)
            <div class="homework-row"><span>Finished</span><strong>{{ $completedHw }}</strong></div>
        @endif
        @if($openHw > 0)
            <div class="homework-row"><span>Still open</span><strong>{{ $openHw }}</strong></div>
        @endif
        @if($overdueHw > 0)
            <div class="homework-row"><span>Overdue</span><strong>{{ $overdueHw }}</strong></div>
        @endif
    @endif

    <h2>Learning categories</h2>
    <table class="grid">
        <colgroup>
            <col class="cat">
            <col class="done">
            <col class="evidence">
        </colgroup>
        <tr>
            <th>Category</th>
            <th>Done / set</th>
            <th>Evidence</th>
        </tr>
        @foreach($categoryLabels as $key => $label)
            @php
                $row = $categories[$key] ?? [];
                $assigned = (int) ($row['assigned'] ?? 0);
                $completed = (int) ($row['completed'] ?? 0);
                $evidence = (string) ($row['evidence'] ?? 'unassessed');
            @endphp
            <tr>
                <td>{{ $label }}</td>
                <td>{{ $assigned > 0 ? $completed.'/'.$assigned : '—' }}</td>
                <td><span class="pill">{{ $evidenceLabels[$evidence] ?? $evidence }}</span></td>
            </tr>
        @endforeach
    </table>

    @if(!empty($payload['strengths']))
        <h2>Strengths</h2>
        <ul>
            @foreach($payload['strengths'] as $item)
                <li>{{ is_array($item) ? ($item['label'] ?? '') : $item }}</li>
            @endforeach
        </ul>
    @endif

    @if(!empty($payload['next_targets']))
        <h2>Recommended next steps</h2>
        <ul>
            @foreach($payload['next_targets'] as $item)
                <li>{{ is_array($item) ? ($item['label'] ?? '') : $item }}</li>
            @endforeach
        </ul>
    @endif

    @if(!empty($wording['plain']))
        <p class="context">{{ $wording['plain'] }}</p>
    @endif

    <p class="meta">Automatic wording match is practice feedback only, not Tajweed grading. Teacher-verified marks are shown separately.</p>
</body>
</html>