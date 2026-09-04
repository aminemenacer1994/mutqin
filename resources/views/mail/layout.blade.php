<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="{{ in_array(app()->getLocale(), ['ar', 'ur'], true) ? 'rtl' : 'ltr' }}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="format-detection" content="telephone=no,address=no,email=no,date=no">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>@yield('title', \App\Support\TransactionalMail::brandName())</title>
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
        :root { color-scheme: light dark; supported-color-schemes: light dark; }
        html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
        * { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        table { border-collapse: collapse; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
        a { text-decoration: none; }
        a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
        u + #body a { color: inherit; text-decoration: none; }
        #MessageViewBody a { color: inherit; text-decoration: none; }
        @media only screen and (max-width: 620px) {
            .email-container { width: 100% !important; max-width: 100% !important; }
            .email-pad { padding-left: 24px !important; padding-right: 24px !important; }
            .email-header-pad { padding-left: 24px !important; padding-right: 24px !important; }
            .email-fallback a { word-break: break-word !important; }
        }
        @media (prefers-color-scheme: dark) {
            .email-bg { background-color: #141816 !important; }
            .email-card { background-color: #ffffff !important; border-color: #d8e6dd !important; }
            .email-heading { color: #123527 !important; }
            .email-wordmark { color: #123527 !important; }
            .email-tagline { color: #4a6358 !important; }
        }
        [data-ogsc] .email-bg { background-color: #141816 !important; }
        [data-ogsc] .email-card { background-color: #ffffff !important; }
    </style>
</head>
<body id="body" class="email-bg" style="margin:0;padding:0;background-color:#eef3ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#123527;width:100%;">
    <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
        @yield('preheader')
    </div>
    <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
        &#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
    </div>
    <table role="presentation" class="email-bg" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#eef3ef;width:100%;border-collapse:collapse;">
        <tr>
            <td align="center" style="padding:36px 16px 28px;">
                <!--[if mso]>
                <table role="presentation" align="center" width="560" cellspacing="0" cellpadding="0" border="0"><tr><td>
                <![endif]-->
                <table role="presentation" class="email-container email-card" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;background-color:#ffffff;border:1px solid #d8e6dd;border-radius:18px;overflow:hidden;border-collapse:collapse;">
                    <tr>
                        <td class="email-header-pad" align="left" style="padding:32px 40px 28px;background-color:#ffffff;border-bottom:1px solid #f0ebe4;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;">
                                <tr>
                                    <td align="left" valign="middle" style="padding:0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                                            <tr>
                                                <td valign="middle" width="44" style="padding:0 12px 0 0;width:44px;line-height:0;font-size:0;">
                                                    <img src="{{ \App\Support\TransactionalMail::logoSrc($message ?? null) }}" width="40" height="42" alt="" style="display:block;border:0;outline:none;text-decoration:none;width:40px;height:42px;max-width:40px;">
                                                </td>
                                                <td valign="middle" style="padding:0;">
                                                    <p class="email-wordmark" style="margin:0;font-size:20px;line-height:1.15;font-weight:700;letter-spacing:-0.02em;color:#123527;font-family:Georgia,'Times New Roman',serif;">{{ \App\Support\TransactionalMail::brandName() }}</p>
                                                    <p class="email-tagline" style="margin:5px 0 0;font-size:12px;line-height:1.4;color:#8a8178;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">{{ __('mail.tagline') }}</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="email-pad" align="left" style="padding:28px 40px 0;">
                            <h1 class="email-heading" style="margin:0;font-size:24px;line-height:1.3;font-weight:600;letter-spacing:-0.02em;color:#123527;font-family:Georgia,'Times New Roman',serif;">@yield('heading')</h1>
                        </td>
                    </tr>
                    <tr>
                        <td class="email-pad" align="left" style="padding:16px 40px 32px;font-size:15px;line-height:1.6;color:#2b4338;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                            @yield('content')
                        </td>
                    </tr>
                    <tr>
                        <td class="email-pad" align="left" style="padding:0 40px 28px;">
                            @hasSection('footer')
                                @yield('footer')
                            @else
                                <p style="margin:0;font-size:12px;line-height:1.5;color:#8a9a92;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">{{ __('mail.footer') }}</p>
                            @endif
                        </td>
                    </tr>
                </table>
                <table role="presentation" class="email-container" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;border-collapse:collapse;">
                    <tr>
                        <td align="center" class="email-pad" style="padding:18px 8px 8px;font-size:12px;line-height:1.4;color:#8a9a92;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                            <a href="{{ \App\Support\TransactionalMail::homeUrl() }}" style="color:#8a9a92;text-decoration:none;">{{ \App\Support\TransactionalMail::homeHost() }}</a>
                        </td>
                    </tr>
                </table>
                <!--[if mso]>
                </td></tr></table>
                <![endif]-->
            </td>
        </tr>
    </table>
</body>
</html>
