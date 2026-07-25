<?php

declare(strict_types=1);

namespace App\Modules\Party\Enums;

enum PartyStatus: string
{
    case Active     = 'active';
    case Inactive   = 'inactive';
    case Suspended  = 'suspended';
    case Blacklisted= 'blacklisted';
}
