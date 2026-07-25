<?php

declare(strict_types=1);

namespace App\Modules\Organization\Events;

final class DepartmentUpdated extends AbstractDepartmentEvent
{
    public function eventType(): string { return 'organization.department.updated'; }
}
