<?php

declare(strict_types=1);

namespace App\Modules\Organization\Events;

final class DepartmentDeleted extends AbstractDepartmentEvent
{
    public function eventType(): string { return 'organization.department.deleted'; }
}
