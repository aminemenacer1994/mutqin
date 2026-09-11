@extends('layouts.app')

@section('content')
    @if (session('billing_status'))
        <div class="container-fluid shell">
            <div class="billing-alert billing-alert-success" role="status">{{ session('billing_status') }}</div>
        </div>
    @endif
    @if (session('billing_error'))
        <div class="container-fluid shell">
            <div class="billing-alert billing-alert-error" role="alert">{{ session('billing_error') }}</div>
        </div>
    @endif
    <pricing-page></pricing-page>
@endsection
