@extends('layouts.app')

@section('content')
    <article-detail-page>
        @include('partials.seo-ssr-article-detail', ['article' => $article])
    </article-detail-page>
    <script>
        window.mutqinArticle = @json($article);
    </script>
@endsection
