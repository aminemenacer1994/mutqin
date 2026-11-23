@php
    use App\Support\BrandIcons;
@endphp
<link rel="manifest" href="{{ BrandIcons::url('manifest.webmanifest') }}">
<link rel="apple-touch-icon" sizes="180x180" href="{{ BrandIcons::url('icons/apple-touch-icon.png') }}">
<link id="appThemeFavicon" rel="icon" type="image/png" sizes="512x512" href="{{ BrandIcons::url('favicon-512.png') }}">
<link rel="icon" type="image/png" sizes="192x192" href="{{ BrandIcons::url('favicon-192.png') }}">
<link rel="icon" type="image/png" sizes="96x96" href="{{ BrandIcons::url('favicon-96x96.png') }}">
<link rel="icon" type="image/png" sizes="48x48" href="{{ BrandIcons::url('favicon-48x48.png') }}">
<link rel="icon" type="image/png" sizes="32x32" href="{{ BrandIcons::url('favicon-32x32.png') }}">
<link rel="icon" type="image/png" sizes="16x16" href="{{ BrandIcons::url('favicon-16x16.png') }}">
<link rel="icon" type="image/png" sizes="192x192" href="{{ BrandIcons::url('icons/icon-192.png') }}">
<link id="appThemeFaviconIco" rel="shortcut icon" href="{{ BrandIcons::url('favicon.ico') }}">
<link rel="icon" href="{{ BrandIcons::url('favicon.ico') }}" sizes="any">