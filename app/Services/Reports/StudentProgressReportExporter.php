<?php

namespace App\Services\Reports;

use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Support\Str;

class StudentProgressReportExporter
{
    /**
     * @param  array<string, mixed>  $report
     */
    public function pdf(array $report): string
    {
        $html = view('reports.student-progress', ['report' => $report])->render();

        $options = new Options;
        $options->set('isRemoteEnabled', false);
        $options->set('isHtml5ParserEnabled', true);

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        return $dompdf->output();
    }

    /**
     * @param  array<string, mixed>  $report
     */
    public function filename(array $report): string
    {
        $name = Str::slug((string) (($report['payload']['student']['name'] ?? $report['name'] ?? 'student')), '-');
        if ($name === '') {
            $name = 'student';
        }
        $period = (string) ($report['period_start'] ?? 'period');

        return 'mutqin-progress-'.$name.'-'.$period.'.pdf';
    }
}