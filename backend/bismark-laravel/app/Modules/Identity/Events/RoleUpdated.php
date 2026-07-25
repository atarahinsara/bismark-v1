<?php

declare(strict_types=1);

namespace App\Modules\Identity\Events;

final class RoleUpdated extends AbstractRoleEvent
{
    public function eventType(): string
    {
        return 'identity.role.updated';
    }
}
