<?php

declare(strict_types=1);

namespace App\Modules\Identity\Events;

final class UserUnsuspended extends AbstractUserEvent
{
    public function eventType(): string
    {
        return 'identity.user.unsuspended';
    }
}
