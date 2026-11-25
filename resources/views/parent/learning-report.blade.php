<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Learning report {{ $report['period_label'] }}</title>
    <style>
        @page { size: A4; margin: 14mm; }
        * { box-sizing: border-box; }
        body { font-family: Helvetica, Arial, sans-serif; color: #2b2118; margin: 0; line-height: 1.45; font-size: 11pt; }
        h1 { font-size: 22pt; margin: 0 0 6px; }
        h2 { font-size: 13pt; margin: 18px 0 8px; color: #3c2f26; }
        p, li { font-size: 11pt; margin: 0 0 8px; }
        .meta { color: #6b5748; font-size: 9.5pt; }
        .lead { padding: 10px 12px; border-radius: 10px; background: #f8f1e8; margin: 12px 0; }
        .kpis { width: 100%; border-collapse: collapse; margin: 8px 0 12px; }
        .kpis td { width: 25%; padding: 8px; border: 1px solid #e5d8c8; text-align: center; vertical-align: top; }
        .kpis strong { display: block; font-size: 16pt; }
        .kpis span { font-size: 9pt; color: #6b5748; }
        .bar-row { margin: 6px 0; }
        .bar-label { display: flex; justify-content: space-between; font-size: 9.5pt; margin-bottom: 3px; }
        .bar-track { height: 8px; background: #efe6da; border-radius: 999px; overflow: hidden; }
        .bar-fill { display: block; height: 8px; background: #9a6236; border-radius: 999px; }
        .bar-fill.warn { background: #b54b3b; }
        .bar-fill.ok { background: #3f7a55; }
        ul.clean { margin: 0; padding: 0; list-style: none; }
        ul.clean li { padding: 6px 0; border-top: 1px solid #eadfce; }
        .pill { display: inline-block; border: 1px solid #d9cbb8; border-radius: 999px; padding: 2px 8px; margin: 0 6px 6px 0; font-size: 9pt; }
        .status-done { color: #2f6a4a; font-weight: 600; }
        .status-late { color: #a33d2f; font-weight: 600; }
    </style>
</head>
<body>
    <p class="meta">Mutqin parent report</p>
    <h1>{{ $report['name'] }}</h1>
    <p class="meta">{{ $report['period_label'] }} · Prepared {{ \Illuminate\Support\Carbon::parse($report['generated_at'])->format('j M Y') }}</p>

    @php
        $assignments = $report['assignments'] ?? null;
        $activity = $report['activity'] ?? null;
        $assigned = (int) ($assignments['assigned'] ?? 0);
        $completed = (int) ($assignments['completed'] ?? 0);
        $overdue = (int) ($assignments['overdue'] ?? 0);
        $open = max(0, $assigned - $completed);
        $practice = (int) ($activity['practice_rows'] ?? 0);
        $revision = (int) ($activity['revision_sessions'] ?? 0);
        $chartMax = max(1, $assigned, $practice + $revision);
    @endphp

    <div class="lead">
        @if($assignments)
            <p><strong>For parents:</strong> {{ $completed }} of {{ $assigned }} homework tasks were finished this period.@if($overdue > 0) {{ $overdue }} still need attention.@endif</p>
        @endif
        @if($activity && $practice > 0)
            <p>{{ $practice }} practice sessions were logged. Revision sessions: {{ $revision }}.</p>
        @endif
    </div>

    @if($assignments || $activity)
        <table class="kpis">
            <tr>
                @if($assignments)
                    <td><strong>{{ $completed }}/{{ max($assigned, 1) }}</strong><span>Homework done</span></td>
                    <td><strong>{{ $open }}</strong><span>Still open</span></td>
                    <td><strong>{{ $overdue }}</strong><span>Overdue</span></td>
                @endif
                @if($activity)
                    <td><strong>{{ $practice }}</strong><span>Practice</span></td>
                @endif
            </tr>
        </table>
    @endif

    @if($assignments && $assigned > 0)
        <h2>Homework at a glance</h2>
        @foreach([
            ['label' => 'Finished', 'value' => $completed, 'class' => 'ok'],
            ['label' => 'Still open', 'value' => $open, 'class' => ''],
            ['label' => 'Overdue', 'value' => $overdue, 'class' => 'warn'],
        ] as $bar)
            @if($bar['value'] > 0)
                <div class="bar-row">
                    <div class="bar-label"><span>{{ $bar['label'] }}</span><span>{{ $bar['value'] }}</span></div>
                    <div class="bar-track"><span class="bar-fill {{ $bar['class'] }}" style="width: {{ round(($bar['value'] / $chartMax) * 100) }}%;"></span></div>
                </div>
            @endif
        @endforeach
        @if(!empty($assignments['plain']))
            <p>{{ $assignments['plain'] }}</p>
        @endif
        @if(!empty($assignments['items']))
            <ul class="clean">
                @foreach($assignments['items'] as $item)
                    <li>
                        {{ $item['label'] }}
                        <span class="{{ !empty($item['overdue']) ? 'status-late' : 'status-done' }}">
                            {{ !empty($item['overdue']) ? 'Needs attention' : ucfirst(str_replace('_', ' ', (string) ($item['status'] ?? 'pending'))) }}
                        </span>
                    </li>
                @endforeach
            </ul>
        @endif
    @endif

    @if(is_array($report['home_practice'] ?? null))
        <h2>What to practise at home</h2>
        <p>{{ $report['home_practice']['plain'] ?? '' }}</p>
        @if(!empty($report['home_practice']['items']))
            <ul class="clean">
                @foreach($report['home_practice']['items'] as $item)
                    <li><strong>{{ $item['label'] }}</strong> {{ $item['text'] }}</li>
                @endforeach
            </ul>
        @endif
    @endif

    @if(is_array($report['attendance'] ?? null) && !empty($report['attendance']['plain']))
        <h2>Attendance</h2>
        <p>{{ $report['attendance']['plain'] }}</p>
    @endif

    <h2>Needs your attention</h2>
    @if(empty($report['attention']))
        <p>Nothing in the shared records is marked as needing extra attention.</p>
    @else
        <ul class="clean">
            @foreach($report['attention'] as $item)
                <li>{{ $item['label'] }}</li>
            @endforeach
        </ul>
    @endif

    @if(is_array($report['feedback'] ?? null) && !empty($report['feedback']['notes']))
        <h2>Teacher feedback</h2>
        @foreach($report['feedback']['notes'] as $note)
            <p><strong>{{ $note['teacher'] }}</strong> wrote: “{{ $note['excerpt'] }}”</p>
        @endforeach
    @endif

    @if(!empty($report['narrative']['text']))
        <h2>Summary</h2>
        <p>{{ $report['narrative']['text'] }}</p>
    @endif
</body>
</html>