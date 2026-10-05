<?php

namespace App\Support\Seo;

final class SeoDocument
{
    /**
     * @param  list<array{hreflang: string, href: string}>  $hreflang
     * @param  list<array<string, mixed>>  $jsonLd
     */
    public function __construct(
        public readonly string $page,
        public readonly string $title,
        public readonly string $description,
        public readonly string $canonical,
        public readonly string $robots,
        public readonly string $ogType,
        public readonly string $ogTitle,
        public readonly string $ogDescription,
        public readonly string $ogUrl,
        public readonly string $ogImage,
        public readonly int $ogImageWidth,
        public readonly int $ogImageHeight,
        public readonly string $ogImageAlt,
        public readonly string $ogLocale,
        public readonly string $twitterCard,
        public readonly string $twitterTitle,
        public readonly string $twitterDescription,
        public readonly string $twitterImage,
        public readonly array $hreflang,
        public readonly array $jsonLd,
        public readonly bool $indexable,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'page' => $this->page,
            'title' => $this->title,
            'description' => $this->description,
            'canonical' => $this->canonical,
            'robots' => $this->robots,
            'ogType' => $this->ogType,
            'ogTitle' => $this->ogTitle,
            'ogDescription' => $this->ogDescription,
            'ogUrl' => $this->ogUrl,
            'ogImage' => $this->ogImage,
            'ogImageWidth' => $this->ogImageWidth,
            'ogImageHeight' => $this->ogImageHeight,
            'ogImageAlt' => $this->ogImageAlt,
            'ogLocale' => $this->ogLocale,
            'twitterCard' => $this->twitterCard,
            'twitterTitle' => $this->twitterTitle,
            'twitterDescription' => $this->twitterDescription,
            'twitterImage' => $this->twitterImage,
            'hreflang' => $this->hreflang,
            'jsonLd' => $this->jsonLd,
            'indexable' => $this->indexable,
        ];
    }
}
