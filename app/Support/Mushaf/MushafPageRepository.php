<?php

namespace App\Support\Mushaf;

use RuntimeException;

/**
 * Read generated or static mushaf page JSON using the active layout's page count.
 */
final class MushafPageRepository
{
    public function __construct(
        private readonly MushafLayout $layout,
    ) {}

    public static function forId(string $layoutId): self
    {
        return new self(MushafLayoutRegistry::get($layoutId));
    }

    public function layout(): MushafLayout
    {
        return $this->layout;
    }

    /**
     * @return array<string, mixed>
     */
    public function page(int $pageNumber): array
    {
        if (! $this->layout->hasPage($pageNumber)) {
            throw new RuntimeException(sprintf(
                '%s page %d is outside 1–%d.',
                $this->layout->name,
                $pageNumber,
                $this->layout->pageCount,
            ));
        }

        $path = $this->layout->pageJsonPath($pageNumber);
        if (! is_file($path)) {
            throw new RuntimeException("{$this->layout->name} page {$pageNumber} JSON is missing.");
        }

        $decoded = json_decode((string) file_get_contents($path), true);
        if (! is_array($decoded)) {
            throw new RuntimeException("{$this->layout->name} page {$pageNumber} JSON is invalid.");
        }

        return $decoded;
    }

    /**
     * @return array<string, int>
     */
    public function versePageMap(): array
    {
        $path = $this->layout->versePageMapPath();
        if (! is_file($path)) {
            throw new RuntimeException("{$this->layout->name} verse-page map is missing.");
        }

        $decoded = json_decode((string) file_get_contents($path), true);
        if (! is_array($decoded)) {
            throw new RuntimeException("{$this->layout->name} verse-page map is invalid.");
        }

        return $decoded;
    }
}
