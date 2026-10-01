@extends(
    \App\Support\MutqinDomains::restrictMarketingHost(request())
        ? 'layouts.waiting-list-public'
        : 'layouts.app'
)

@section('content')
    <waiting-list-page></waiting-list-page>
@endsection
