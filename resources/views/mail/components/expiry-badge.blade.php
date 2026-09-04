@php
    $minutes = (int) ($minutes ?? 60);
@endphp
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 20px;border-collapse:collapse;">
    <tr>
        <td style="padding:12px 14px;border-radius:10px;background-color:#faf8f5;border:1px solid #ebe4da;">
            <p style="margin:0;font-size:13px;line-height:1.5;color:#6e645c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                {{ __('mail.expires_prefix') }}
                <span style="color:#123527;font-weight:600;">{{ trans_choice('mail.expires_minutes', $minutes, ['minutes' => $minutes]) }}</span>{{ __('mail.expires_suffix') }}
            </p>
        </td>
    </tr>
</table>
