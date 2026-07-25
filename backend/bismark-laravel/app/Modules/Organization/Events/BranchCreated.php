<?php

declare(strict_types=1);

namespace App\Modules\Organization\Events;

final class BranchCreated extends AbstractBranchEvent
{
    public function eventType(): string { return 'organization.branch.created'; }
}
