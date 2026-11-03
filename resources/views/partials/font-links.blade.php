{{-- Linked in parallel with app CSS. @import inside stylesheets would hold up
     the whole CSSOM until these files return. display=swap is on the URLs. --}}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://fonts.bunny.net" crossorigin>
<link rel="stylesheet" href="https://fonts.bunny.net/css?family=Nunito&display=swap" media="print" onload="this.media='all'">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Amiri+Quran&family=Cormorant+Garamond:wght@500;600;700&family=Noto+Naskh+Arabic:wght@400;600;700&family=Scheherazade+New:wght@400;700&family=Lateef:wght@400;500&family=Source+Serif+4:wght@400;500;600;700&display=swap" media="print" onload="this.media='all'">
@if(request()->routeIs('about', 'about-us'))
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&display=swap" media="print" onload="this.media='all'">
@endif
<noscript>
    <link rel="stylesheet" href="https://fonts.bunny.net/css?family=Nunito&display=swap">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Amiri+Quran&family=Cormorant+Garamond:wght@500;600;700&family=Noto+Naskh+Arabic:wght@400;600;700&family=Scheherazade+New:wght@400;700&family=Lateef:wght@400;500&family=Source+Serif+4:wght@400;500;600;700&display=swap">
    @if(request()->routeIs('about', 'about-us'))
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&display=swap">
    @endif
</noscript>
