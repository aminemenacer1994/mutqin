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
    <waiting-list-page count="{{ $waitingListCount }}"></waiting-list-page>
@endsection
