<?php

declare(strict_types=1);

namespace App\Modules\Party\Enums;

enum PartyType: string
{
    case Person       = 'person';
    case Organization = 'organization';
}
