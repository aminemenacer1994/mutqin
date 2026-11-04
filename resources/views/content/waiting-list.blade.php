@extends('layouts.app')

@section('content')
    @php
        $waitingListCount = null;
        try {
            if (\App\Support\WaitingListDatabase::hasTable()) {
                $waitingListCount = (int) \App\Models\WaitingListEntry::query()->count();
            }
        } catch (\Throwable $exception) {
            $waitingListCount = null;
        }
    @endphp
    <waiting-list-page count="{{ $waitingListCount }}">
        @include('partials.seo-ssr-waiting-list')
    </waiting-list-page>
    <script>
        window.mutqinWaitingListEndpoint = @json(\App\Support\MutqinDomains::waitingListStoreUrl(request()));
    </script>
@endsection
