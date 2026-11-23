<?php

namespace App\Support\Demo;

/**
 * Closed identity for the local parent demo linked to an existing child account.
 * The child mailbox is never created or overwritten by this catalog.
 */
final class ParentDemoCatalog
{
    public const PASSWORD = 'ParentDemo1!';

    public const MARKER = 'cus_mutqin_parent_demo_guardian';

    public const PARENT_EMAIL = 'guardian.menacer@mutqin.test';

    public const PARENT_NAME = 'Demo Guardian';

    public const CHILD_EMAIL = 'menacer72@gmail.com';

    public const RELATIONSHIP = 'guardian';
}
