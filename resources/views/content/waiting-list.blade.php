@extends(
    \App\Support\MutqinDomains::restrictMarketingHost(request())
        ? 'layouts.waiting-list-public'
        : 'layouts.app'
)

@section('content')
    @unless(\App\Support\MutqinDomains::restrictMarketingHost(request()))
        <script>document.body.classList.add('mutqin-waiting-list-active');</script>
        <style>
            body.mutqin-waiting-list-active .app-navbar .offcanvas,
            body.mutqin-waiting-list-active .app-navbar .navbar-quick-actions,
            body.mutqin-waiting-list-active .app-navbar .navbar-toggler {
                display: none !important;
            }
        </style>
    @endunless
    @php
        $waitingListCount = 0;
        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('waiting_list_entries')) {
                $waitingListCount = (int) \App\Models\WaitingListEntry::query()->count();
            }
        } catch (\Throwable $exception) {
            $waitingListCount = 0;
        }
    @endphp
    <waiting-list-page count="{{ $waitingListCount }}"></waiting-list-page>
@endsection
