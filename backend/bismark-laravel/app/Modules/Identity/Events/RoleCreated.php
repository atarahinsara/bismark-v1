<?php

declare(strict_types=1);

namespace App\Modules\Identity\Events;

final class RoleCreated extends AbstractRoleEvent
{
    public function eventType(): string
    {
        return 'identity.role.created';
    }
}
