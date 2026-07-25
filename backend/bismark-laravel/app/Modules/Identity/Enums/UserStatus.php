<?php

declare(strict_types=1);

namespace App\Modules\Identity\Enums;

enum UserStatus: string
{
    case Active   = 'active';
    case Suspended= 'suspended';
    case Locked   = 'locked';
    case Deleted  = 'deleted';
}
