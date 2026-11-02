@php
    $name = trim((string) ($recipientName ?? ''));
    $useNamedGreeting = $name !== '' && strcasecmp($name, 'there') !== 0;
    $greeting = $useNamedGreeting
        ? __('mail.launch_greeting_named', ['name' => $name])
        : __('mail.launch_greeting');
    $unsubscribeUrl = trim((string) ($unsubscribeUrl ?? ''));
    $year = now()->year;
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="{{ in_array(app()->getLocale(), ['ar', 'ur'], true) ? 'rtl' : 'ltr' }}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="format-detection" content="telephone=no,address=no,email=no,date=no">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>{{ __('mail.launch_subject') }}</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:AllowPNG/>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style type="text/css">
        :root { color-scheme: light only; supported-color-schemes: light; }
        html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
        * { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        table { border-collapse: collapse; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
        a { text-decoration: none; }
        a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
        @media only screen and (max-width: 620px) {
            .email-shell, .email-container { width: 100% !important; max-width: 100% !important; }
            .email-header-pad { padding: 32px 24px 24px !important; }
            .email-pad { padding: 28px 24px 36px !important; }
            .email-heading { font-size: 24px !important; }
        }
    </style>
</head>
<body class="email-bg" style="margin:0;padding:0;background-color:#f3eee4;width:100%;">
    <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;color:#f3eee4;">
        {{ __('mail.launch_preheader') }}
        &#847;&zwnj;&nbsp;
    </div>
    <table role="presentation" class="email-bg" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f3eee4" style="background-color:#f3eee4;width:100%;border-collapse:collapse;">
        <tr>
            <td align="center" style="padding:40px 16px 32px;">
                <div class="email-shell" style="max-width:600px;width:100%;margin:0 auto;">
                <!--[if mso]>
                <table role="presentation" align="center" width="600" cellspacing="0" cellpadding="0" border="0"><tr><td>
                <![endif]-->
                <table role="presentation" class="email-container email-card" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#fffdf8" style="width:100%;max-width:600px;background-color:#fffdf8;border:1px solid #e6dccb;border-radius:16px;border-collapse:collapse;">
                    <tr>
                        <td height="4" bgcolor="#c4a35a" style="background-color:#c4a35a;height:4px;font-size:0;line-height:0;">&nbsp;</td>
                    </tr>
                    <tr>
                        <td class="email-header-pad" align="center" style="padding:40px 48px 8px;background-color:#fffdf8;">
                            <img src="{{ \App\Support\TransactionalMail::logoSrc($message ?? null) }}" width="72" height="76" alt="{{ __('mail.logo_alt') }}" style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;width:72px;height:76px;">
                            <p class="email-wordmark" style="margin:16px 0 0;font-size:22px;line-height:1.2;font-weight:600;letter-spacing:-0.02em;color:#143528;font-family:Georgia,'Times New Roman',Times,serif;">{{ \App\Support\TransactionalMail::brandName() }}</p>
                            <p class="email-tagline" style="margin:6px 0 0;font-size:13px;line-height:1.45;color:#8a7968;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">{{ __('mail.launch_tagline') }}</p>
                            <table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0" style="margin:22px auto 0;border-collapse:collapse;">
                                <tr>
                                    <td width="72" height="1" bgcolor="#c4a35a" style="width:72px;height:1px;background-color:#c4a35a;font-size:0;line-height:0;">&nbsp;</td>
                                </tr>
                                <tr>
                                    <td height="3" style="font-size:0;line-height:0;height:3px;">&nbsp;</td>
                                </tr>
                                <tr>
                                    <td width="72" height="1" bgcolor="#e4d3ae" style="width:72px;height:1px;background-color:#e4d3ae;font-size:0;line-height:0;">&nbsp;</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="email-pad" align="left" style="padding:28px 48px 40px;background-color:#fffdf8;word-wrap:break-word;">
                            <h1 class="email-heading" style="margin:0 0 22px;font-size:26px;line-height:1.3;font-weight:600;letter-spacing:-0.02em;color:#143528;font-family:Georgia,'Times New Roman',Times,serif;word-wrap:break-word;">{{ __('mail.launch_heading') }}</h1>
                            <p class="email-body-copy" style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#143528;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">{{ $greeting }}</p>
                            <p class="email-body-copy" style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#3c4a40;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">{{ __('mail.launch_intro') }}</p>
                            <p class="email-body-copy" style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#3c4a40;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">{{ __('mail.launch_body') }}</p>
                            <p class="email-body-copy" style="margin:0 0 28px;font-size:16px;line-height:1.65;color:#3c4a40;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">{{ __('mail.launch_support') }}</p>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 28px;border-collapse:collapse;">
                                <tr>
                                    <td align="center" style="padding:0;">
                                        <!--[if mso]>
                                        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{ $platformUrl }}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="16%" stroke="f" fillcolor="#1f6b4f">
                                            <w:anchorlock/>
                                            <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">{{ __('mail.launch_action') }}</center>
                                        </v:roundrect>
                                        <![endif]-->
                                        <!--[if !mso]><!-->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:280px;width:100%;border-collapse:collapse;">
                                            <tr>
                                                <td align="center" bgcolor="#1f6b4f" style="background-color:#1f6b4f;border-radius:14px;mso-hide:all;">
                                                    <a href="{{ $platformUrl }}" target="_blank" rel="noopener noreferrer" style="display:block;padding:16px 32px;font-size:16px;line-height:1.25;font-weight:600;color:#ffffff;text-decoration:none;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;border-radius:14px;text-align:center;">{{ __('mail.launch_action') }}</a>
                                                </td>
                                            </tr>
                                        </table>
                                        <!--<![endif]-->
                                    </td>
                                </tr>
                            </table>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;">
                                <tr>
                                    <td align="center" bgcolor="#f7f3ea" style="background-color:#f7f3ea;border:1px solid #efe4d0;border-radius:12px;padding:18px 20px;">
                                        <p class="email-body-copy" style="margin:0;font-size:15px;line-height:1.65;color:#4a4034;font-family:Georgia,'Times New Roman',Times,serif;font-style:italic;">{{ __('mail.launch_closing') }}</p>
                                    </td>
                                </tr>
                            </table>
                            <p class="email-body-copy" style="margin:22px 0 0;font-size:16px;line-height:1.5;color:#143528;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">{{ __('mail.launch_thanks') }}</p>
                            <p class="email-body-copy" style="margin:2px 0 0;font-size:16px;line-height:1.5;font-weight:600;color:#143528;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">{{ __('mail.launch_signoff') }}</p>
                        </td>
                    </tr>
                </table>
                <table role="presentation" class="email-container" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;border-collapse:collapse;">
                    <tr>
                        <td align="center" style="padding:26px 16px 0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="border-collapse:collapse;">
                                <tr>
                                    <td valign="middle" width="28" style="padding:0 8px 0 0;width:28px;line-height:0;font-size:0;">
                                        <img src="{{ \App\Support\TransactionalMail::logoSrc($message ?? null) }}" width="24" height="25" alt="" style="display:block;border:0;outline:none;text-decoration:none;width:24px;height:25px;">
                                    </td>
                                    <td valign="middle" style="font-size:13px;line-height:1.4;font-weight:600;color:#5c6b62;font-family:Georgia,'Times New Roman',Times,serif;">{{ \App\Support\TransactionalMail::brandName() }}</td>
                                </tr>
                            </table>
                            <p style="margin:10px 0 0;font-size:12px;line-height:1.5;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                                <a href="{{ \App\Support\TransactionalMail::homeUrl() }}" style="color:#8a7968;text-decoration:none;">{{ \App\Support\TransactionalMail::homeHost() }}</a>
                            </p>
                            <p style="margin:6px 0 0;font-size:12px;line-height:1.5;color:#8a7968;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">{{ __('mail.launch_copyright', ['year' => $year]) }}</p>
                            @if ($unsubscribeUrl !== '')
                                <p style="margin:10px 0 0;font-size:12px;line-height:1.5;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                                    <a href="{{ $unsubscribeUrl }}" style="color:#8a7968;text-decoration:underline;">{{ __('mail.launch_unsubscribe') }}</a>
                                </p>
                            @endif
                        </td>
                    </tr>
                </table>
                <!--[if mso]>
                </td></tr></table>
                <![endif]-->
                </div>
            </td>
        </tr>
    </table>
</body>
</html>
