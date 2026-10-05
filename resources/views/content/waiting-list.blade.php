@extends('layouts.app')

@section('content')
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
    <waiting-list-page count="{{ $waitingListCount }}">
        @include('partials.seo-ssr-waiting-list')
    </waiting-list-page>
    <script>
        window.mutqinWaitingListEndpoint = @json(\App\Support\MutqinDomains::waitingListStoreUrl(request()));
    </script>
@endsection
