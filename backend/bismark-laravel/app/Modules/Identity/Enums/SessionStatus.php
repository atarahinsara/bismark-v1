<?php

declare(strict_types=1);

namespace App\Modules\Identity\Enums;

enum SessionStatus: string
{
    case Active  = 'active';
    case Expired = 'expired';
    case Revoked = 'revoked';
}
