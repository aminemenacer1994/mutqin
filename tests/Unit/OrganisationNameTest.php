<?php

namespace Tests\Unit;

use App\Support\Registration\OrganisationName;
use PHPUnit\Framework\TestCase;

class OrganisationNameTest extends TestCase
{
    public function test_canonical_name_collapses_case_and_whitespace_only(): void
    {
        $this->assertSame('al noor', OrganisationName::canonical('  AL   Noor  '));
        $this->assertSame('AL Noor', OrganisationName::display(" \n AL \t Noor  "));
    }

    public function test_similar_names_stay_distinct(): void
    {
        $this->assertNotSame(
            OrganisationName::canonical('Al Noor'),
            OrganisationName::canonical('Al-Noor')
        );
        $this->assertNotSame(
            OrganisationName::canonical('Al Noor'),
            OrganisationName::canonical('Al Noor School')
        );
        $this->assertNotSame(
            OrganisationName::canonical('Noor'),
            OrganisationName::canonical('An Noor')
        );
    }
}
